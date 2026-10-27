import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const sessionCookie='pickup_plus';
const pendingCookie='pickup_checkout';
const free={tier:'free',paid:false,intervalSeconds:900};
const ownerAttempts=new Map();
export function sign(value) {
  const key=process.env.SESSION_SECRET;
  if(!key||key.length<32) throw new Error('Session signing is not configured');
  const body=Buffer.from(JSON.stringify(value)).toString('base64url');
  return body+'.'+createHmac('sha256',key).update(body).digest('base64url');
}
export function verify(token) {
  try {
    if(!token||token.length>4096||!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32) return null;
    const [body,mac,...extra]=token.split('.');if(extra.length||!body||!mac)return null;
    const expected=createHmac('sha256',process.env.SESSION_SECRET).update(body).digest();
    const actual=Buffer.from(mac,'base64url');
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
    const value=JSON.parse(Buffer.from(body,'base64url').toString());
    return Number.isFinite(value.exp)&&value.exp>Date.now()?value:null;
  }catch{return null;}
}
function readCookie(request,name) {
  return (request.headers.get('cookie')||'').split(';').map(piece=>piece.trim()).find(piece=>piece.startsWith(name+'='))?.slice(name.length+1)||'';
}
function cookie(request,name,value,seconds) {
  return name+'='+value+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+seconds+(new URL(request.url).protocol==='https:'?'; Secure':'');
}
export function billingReady() {
  return Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_PLUS_PRICE_ID&&process.env.SESSION_SECRET?.length>=32);
}
async function stripe(path,params) {
  const response=await fetch('https://api.stripe.com/v1/'+path,{method:params?'POST':'GET',headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY,...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(params?{body:new URLSearchParams(params)}:{}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('Billing provider unavailable');
  return response.json();
}
function eligible(subscription) {
  return subscription?.status==='active'&&subscription.items?.data?.some(item=>item.price?.id===process.env.STRIPE_PLUS_PRICE_ID);
}
export async function getAccess(request) {
  const session=verify(readCookie(request,sessionCookie));
  if(!session)return free;
  if(session.role==='owner')return {tier:'owner',paid:true,intervalSeconds:120};
  if(!billingReady()||session.role!=='subscriber'||!/^sub_[A-Za-z0-9]+$/.test(session.sub))return free;
  // Verify current Stripe state on every protected server request. No client plan flags are trusted.
  const subscription=await stripe('subscriptions/'+session.sub);
  if(!eligible(subscription)||subscription.customer!==session.customer)return free;
  return {tier:'plus',paid:true,intervalSeconds:120,customer:session.customer};
}
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store',...extra}});
function origin(request) {
  const configured=process.env.SITE_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL:'');
  return new URL(configured||request.url).origin;
}
function trustedPost(request) {
  return request.headers.get('origin')===new URL(request.url).origin && (request.headers.get('content-length')===null||Number(request.headers.get('content-length'))<=4096);
}
export async function billing(request) {
  const url=new URL(request.url),action=url.searchParams.get('action')||'plan';
  try {
    if(request.method==='GET'&&action==='plan') {
      const access=await getAccess(request);
      return json({tier:access.tier,paid:access.paid,intervalSeconds:access.intervalSeconds,checkoutEnabled:billingReady(),testMode:process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')||false,ownerEnabled:Boolean(process.env.OWNER_ACCESS_KEY?.length>=32&&process.env.SESSION_SECRET?.length>=32)});
    }
    if(request.method==='GET'&&action==='complete') {
      const pending=verify(readCookie(request,pendingCookie)),id=url.searchParams.get('session_id')||'';
      if(!billingReady()||!pending?.nonce||!/^cs_[A-Za-z0-9_]+$/.test(id))return json({error:'Checkout could not be verified in this browser. No access was granted.'},400);
      const session=await stripe('checkout/sessions/'+id+'?expand[]=subscription');
      if(session.mode!=='subscription'||session.status!=='complete'||session.payment_status!=='paid'||session.client_reference_id!==pending.nonce||!eligible(session.subscription))return json({error:'Payment is not confirmed. Access has not been activated.'},403);
      const value=sign({role:'subscriber',sub:session.subscription.id,customer:session.customer,exp:Date.now()+365*86400000});
      const headers=new Headers({Location:origin(request)+'/?billing=success','cache-control':'no-store'});
      headers.append('set-cookie',cookie(request,sessionCookie,value,365*86400));headers.append('set-cookie',cookie(request,pendingCookie,'',0));
      return new Response(null,{status:303,headers});
    }
    if(request.method!=='POST')return json({error:'Method not allowed'},405);
    if(!trustedPost(request))return json({error:'Use the billing controls on this website.'},403);
    if(action==='owner') {
      if(!process.env.OWNER_ACCESS_KEY||process.env.OWNER_ACCESS_KEY.length<32||!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32)return json({error:'Owner access has not been configured.'},503);
      const identity=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'local';
      const previous=ownerAttempts.get(identity);const attempt=previous&&previous.until>Date.now()?previous:{count:0,until:Date.now()+900000};
      attempt.count++;ownerAttempts.set(identity,attempt);if(ownerAttempts.size>1000)ownerAttempts.delete(ownerAttempts.keys().next().value);
      if(attempt.count>5)return json({error:'Too many attempts. Try again in 15 minutes.'},429);
      const text=await request.text();if(text.length>4096)return json({error:'Invalid code'},400);
      const supplied=JSON.parse(text).code;
      if(typeof supplied!=='string'||supplied.length>512)return json({error:'Invalid owner code.'},403);
      const actual=Buffer.from(supplied),expected=Buffer.from(process.env.OWNER_ACCESS_KEY);
      if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return json({error:'Invalid owner code.'},403);
      ownerAttempts.delete(identity);
      return json({ok:true},200,{'set-cookie':cookie(request,sessionCookie,sign({role:'owner',exp:Date.now()+30*86400000}),30*86400)});
    }
    if(action==='logout')return json({ok:true},200,{'set-cookie':cookie(request,sessionCookie,'',0)});
    if(!billingReady())return json({error:'Checkout is not connected yet. No payment has been taken.'},503);
    const access=await getAccess(request);
    if(action==='portal') {
      if(access.tier!=='plus')return json({error:'No active paid subscription is attached to this browser.'},403);
      const portal=await stripe('billing_portal/sessions',{customer:access.customer,return_url:origin(request)});
      return json({url:portal.url});
    }
    if(action==='checkout') {
      if(access.paid)return json({error:'You already have faster checks. There is no need to pay again.'},409);
      // Validate the configured price server-side: no browser-supplied amounts or price IDs.
      const price=await stripe('prices/'+encodeURIComponent(process.env.STRIPE_PLUS_PRICE_ID));
      if(price.unit_amount!==299||price.currency!=='usd'||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1||price.active!==true)return json({error:'Checkout is unavailable: the configured price must be $2.99 USD per month.'},503);
      const nonce=randomBytes(24).toString('hex');
      const session=await stripe('checkout/sessions',{'mode':'subscription','line_items[0][price]':price.id,'line_items[0][quantity]':'1','client_reference_id':nonce,'success_url':origin(request)+'/api/billing?action=complete&session_id={CHECKOUT_SESSION_ID}','cancel_url':origin(request)+'/?billing=cancelled','metadata[app]':'pickup-watch-plus'});
      return json({url:session.url},200,{'set-cookie':cookie(request,pendingCookie,sign({nonce,exp:Date.now()+3600000}),3600)});
    }
    return json({error:'Not found'},404);
  }catch{return json({error:'Billing could not be completed. Please try again. Your access was not changed.'},503);}
}
