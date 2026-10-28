import {stripeClient} from './stripe-client.js';
import {billingStoreReady,readBilling} from './billing-store.js';
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
  return Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_PLUS_PRICE_ID&&process.env.SESSION_SECRET?.length>=32&&process.env.STRIPE_WEBHOOK_SECRET&&billingStoreReady());
}
function eligible(subscription) {
  return subscription?.status==='active'&&subscription.items?.data?.some(item=>item.price?.id===process.env.STRIPE_PLUS_PRICE_ID);
}
export async function getAccess(request) {
  const session=verify(readCookie(request,sessionCookie));
  if(!session)return free;
  if(session.role==='owner')return {tier:'owner',paid:true,intervalSeconds:120};
  if(!billingReady()||session.role!=='subscriber'||!/^sub_[A-Za-z0-9]+$/.test(session.sub))return free;
  // Entitlements are maintained by signed Stripe webhooks in durable storage. No client plan flags are trusted.
  const [record,hold]=await Promise.all([readBilling('sub:'+session.sub),readBilling('risk:'+session.sub)]);
  if(!record||record.status!=='active'||!record.prices.includes(process.env.STRIPE_PLUS_PRICE_ID)||record.customer!==session.customer||hold?.held)return free;
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
      const saved=verify(readCookie(request,sessionCookie));
      return json({canManage:saved?.role==='subscriber',tier:access.tier,paid:access.paid,intervalSeconds:access.intervalSeconds,checkoutEnabled:billingReady(),testMode:process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')||false,ownerEnabled:Boolean(process.env.OWNER_ACCESS_KEY?.length>=32&&process.env.SESSION_SECRET?.length>=32)});
    }
    if(request.method==='GET'&&action==='invoices'){
      const saved=verify(readCookie(request,sessionCookie));
      if(!billingReady()||saved?.role!=='subscriber'||!/^cus_[A-Za-z0-9]+$/.test(saved.customer))return json({error:'Sign in to your paid browser session first.'},403);
      const invoices=await stripeClient().invoices.list({customer:saved.customer,limit:12});
      return json({invoices:invoices.data.map(invoice=>({id:invoice.id,number:invoice.number,status:invoice.status,currency:invoice.currency,amountPaid:invoice.amount_paid,amountDue:invoice.amount_due,hostedUrl:invoice.hosted_invoice_url,pdfUrl:invoice.invoice_pdf}))});
    }
    if(request.method==='GET'&&['complete','activate'].includes(action)) {
      const pending=verify(readCookie(request,pendingCookie)),id=url.searchParams.get('session_id')||'';
      if(!billingReady()||!pending?.nonce||!/^cs_[A-Za-z0-9_]+$/.test(id))return json({error:'Checkout could not be verified in this browser. No access was granted.'},400);
      const session=await stripeClient().checkout.sessions.retrieve(id,{expand:['subscription']});
      if(session.mode!=='subscription'||session.status!=='complete'||session.client_reference_id!==pending.nonce)return json({error:'Checkout could not be verified for this browser.'},403);
      if(session.payment_status!=='paid'||!eligible(session.subscription)){
        if(action==='activate')return json({pending:true,message:'Waiting for payment confirmation.'},202);
        return new Response(null,{status:303,headers:{Location:origin(request)+'/?billing=pending&session_id='+encodeURIComponent(id),'cache-control':'no-store'}});
      }
      const fulfilled=await readBilling('checkout:'+id);
      if(!fulfilled?.fulfilled||fulfilled.subscription!==session.subscription.id||fulfilled.customer!==session.customer){
        if(action==='activate')return json({pending:true,message:'Waiting for verified payment webhook.'},202);
        return new Response(null,{status:303,headers:{Location:origin(request)+'/?billing=pending&session_id='+encodeURIComponent(id),'cache-control':'no-store'}});
      }
      const value=sign({role:'subscriber',sub:session.subscription.id,customer:session.customer,exp:Date.now()+365*86400000});
      const headers=new Headers({Location:origin(request)+'/?billing=success','cache-control':'no-store'});
      headers.append('set-cookie',cookie(request,sessionCookie,value,365*86400));headers.append('set-cookie',cookie(request,pendingCookie,'',0));
      if(action==='activate'){headers.delete('Location');headers.set('content-type','application/json');return new Response(JSON.stringify({ok:true}),{status:200,headers});}
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
      const saved=verify(readCookie(request,sessionCookie));
      if(saved?.role!=='subscriber'||!/^cus_[A-Za-z0-9]+$/.test(saved.customer))return json({error:'No subscription is attached to this browser.'},403);
      const portal=await stripeClient().billingPortal.sessions.create({customer:saved.customer,return_url:origin(request),...(process.env.STRIPE_PORTAL_CONFIGURATION_ID?{configuration:process.env.STRIPE_PORTAL_CONFIGURATION_ID}:{})});
      return json({url:portal.url});
    }
    if(action==='checkout') {
      if(access.paid)return json({error:'You already have faster checks. There is no need to pay again.'},409);
      // Validate the configured price server-side: no browser-supplied amounts or price IDs.
      const price=await stripeClient().prices.retrieve(process.env.STRIPE_PLUS_PRICE_ID);
      if(price.unit_amount!==299||price.currency!=='usd'||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1||price.active!==true)return json({error:'Checkout is unavailable: the configured price must be $2.99 USD per month.'},503);
      const previous=verify(readCookie(request,pendingCookie));
      const nonce=previous?.createdAt>Date.now()-600000?previous.nonce:randomBytes(24).toString('hex');
      const suffix=nonce.slice(0,16).match(/../g).map(pair=>String.fromCharCode(97+parseInt(pair,16)%26)).join('');
      const session=await stripeClient().checkout.sessions.create({mode:'subscription',subscription_data:{billing_mode:{type:'flexible'}},line_items:[{price:price.id,quantity:1}],client_reference_id:nonce,integration_identifier:'pickup_watch_'+suffix,success_url:origin(request)+'/api/billing?action=complete&session_id={CHECKOUT_SESSION_ID}',cancel_url:origin(request)+'/?billing=cancelled',metadata:{app:'pickup-watch-plus'}},{idempotencyKey:'pickup-watch-checkout:'+nonce});
      return json({url:session.url},200,{'set-cookie':cookie(request,pendingCookie,sign({nonce,createdAt:previous?.nonce===nonce?previous.createdAt:Date.now(),exp:Date.now()+7*86400000}),7*86400)});
    }
    return json({error:'Not found'},404);
  }catch{return json({error:'Billing could not be completed. Please try again. Your access was not changed.'},503);}
}
