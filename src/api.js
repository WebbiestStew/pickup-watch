// Optional durable cache and atomic global throttle across Vercel instances.
// Credentials are read only by the server; never assembled into browser assets.
const redisSettings = () => {
  const env = typeof process === 'undefined' ? {} : process.env;
  const url=env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL,token=env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN;
  if (!url && !token) return null;
  if (!url || !token) throw new Error('Incomplete shared cache configuration');
  return {url,token};
};
async function redisCommand(command) {
  const settings=redisSettings();
  const response=await fetch(settings.url,{method:'POST',headers:{Authorization:'Bearer '+settings.token,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(3000)});
  if(!response.ok) throw new Error('Shared cache unavailable');
  const data=await response.json();
  if(data.error) throw new Error('Shared cache command failed');
  return data.result;
}
export async function sharedLookup(region) {
  if(!redisSettings()) return null;
  const now=Date.now();
  const script="local hit=redis.call('GET',KEYS[1]); if hit then return {'cached',hit} end; local gate=redis.call('GET',KEYS[2]); if gate then return {'wait',gate} end; redis.call('SET',KEYS[2],ARGV[1],'EX',30); return {'go'}";
  const reply=await redisCommand(['EVAL',script,2,'pickup:area:texas-v3:'+region,'pickup:gate:v2',String(now+30000)]);
  if(reply[0]==='cached') return {state:'cached',data:JSON.parse(reply[1])};
  if(reply[0]==='wait') return {state:'wait',until:Number(reply[1])};
  if(reply[0]!=='go') throw new Error('Invalid shared cache response');
  return {state:'go'};
}
async function sharedSave(region,data,seconds) {
  if(redisSettings()) await redisCommand(['SET','pickup:area:texas-v3:'+region,JSON.stringify(data),'EX',seconds]);
}
async function sharedPause(until) {
  if(redisSettings()) await redisCommand(['SET','pickup:gate:v2',String(until),'EX',Math.max(1,Math.ceil((until-Date.now())/1000))]);
}
// Shared edge cache: results are reused across visitors and model selections.
const inFlight = new Map();
const memoryCache = new Map();
function safeCache() {
 let edge; try { edge=globalThis.caches?.default; } catch(error) {}
 return {
  async match(key) {try{if(edge){const hit=await edge.match(key);if(hit)return hit;}}catch(error){} const item=memoryCache.get(key.url);return item&&item.until>Date.now()?new Response(item.text,{headers:item.headers,status:item.status}):undefined;},
  async put(key,response) {const seconds=Number((response.headers.get('cache-control')||'').match(/max-age=(\d+)/)?.[1]||0);if(memoryCache.size>256)memoryCache.delete(memoryCache.keys().next().value);memoryCache.set(key.url,{until:Date.now()+seconds*1000,text:await response.clone().text(),headers:Object.fromEntries(response.headers),status:response.status});try{if(edge)await edge.put(key,response);}catch(error){} }
 };
}
let nextAllowedAt = 0;
const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
export function parseAvailability(data) {
  if(String(data?.head?.status)!=='200'||!Array.isArray(data?.body?.stores)) throw new Error('Unexpected Apple response');
  const directory = new Map(STORES.map(store=>[store.id,store]));
  return data.body.stores.filter(store=>directory.has(store.storeNumber)).map(store=>{
    const details=directory.get(store.storeNumber);
    return {...details,availability:Object.fromEntries(PARTS.map(part=>{
      const item=store.partsAvailability?.[part];
      return [part,{status:item?.pickupDisplay==='available'?'available':['unavailable','ineligible'].includes(item?.pickupDisplay)?'unavailable':'unknown',message:item?.pickupSearchQuote||'Not confirmed by Apple'}];
    }))};
  });
}
async function lookup(zip, request, ctx) {
  const cacheSeconds=120;
  const regionKey='texas:'+zip.slice(0,3);
  const distributed=await sharedLookup(regionKey);
  if(distributed?.state==='cached') return json({...distributed.data,cached:true});
  if(distributed?.state==='wait') return json({error:'Another stock check is running or a cooldown is active. Please wait for the countdown.',retryAt:distributed.until},429);
  const cache=safeCache();
  // Group nearby ZIPs so changing a postcode cannot trigger a check per visitor.
  const key=new Request(new URL('/__cache/availability-texas-v3/'+regionKey,request.url));
  const gateKey=new Request(new URL('/__cache/apple-cooldown-v1',request.url));
  const cached=cache ? await cache.match(key) : null;
  if(cached) return json({...await cached.json(),cached:true});
  const gate=cache ? await cache.match(gateKey) : null;
  const gateData=gate ? await gate.json() : null;
  const now=Date.now();
  if((gateData?.until||0)>now||nextAllowedAt>now) return json({error:'Apple checks are paused briefly. Try again after the countdown.',retryAt:Math.max(gateData?.until||0,nextAllowedAt)},429);
  const region=regionKey;
  if(inFlight.has(region)) return inFlight.get(region).then(result=>json(result));
  const task=(async()=>{
    nextAllowedAt=Date.now()+30000;
    if(cache) await cache.put(gateKey,new Response(JSON.stringify({until:nextAllowedAt}),{headers:{'cache-control':'public, max-age=30'}}));
    const params=new URLSearchParams({pl:'true',location:zip});PARTS.forEach((part,index)=>params.set('parts.'+index,part));
    try {
      const response=await fetch('https://www.apple.com/shop/retail/pickup-message?'+params,{headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)});
      if(!response.ok) {
        const delay=[403,429,541].includes(response.status)?1800:300;
        nextAllowedAt=Date.now()+delay*1000;
        await sharedPause(nextAllowedAt);
        if(cache) await cache.put(gateKey,new Response(JSON.stringify({until:nextAllowedAt}),{headers:{'cache-control':'public, max-age='+delay}}));
        return {error:'Apple is temporarily rejecting availability requests (HTTP '+response.status+'). Stock is unconfirmed.',retryAt:nextAllowedAt};
      }
      const stores=parseAvailability(await response.json());
      if(!stores.length) throw new Error('No recognized Texas stores returned');
      const result={stores,checkedAt:Date.now(),nextCheckAt:Date.now()+cacheSeconds*1000,intervalSeconds:cacheSeconds,queriedZip:zip,cached:false};
      await sharedSave(regionKey,result,cacheSeconds);
      if(cache) await cache.put(key,new Response(JSON.stringify(result),{headers:{'cache-control':'public, max-age='+cacheSeconds}}));
      return result;
    } catch(error) {
      nextAllowedAt=Date.now()+300000;
      try { await sharedPause(nextAllowedAt); } catch {}
      if(cache) await cache.put(gateKey,new Response(JSON.stringify({until:nextAllowedAt}),{headers:{'cache-control':'public, max-age=300'}}));
      return {error:'Apple did not return usable stock data. We will try again after a cooldown.',retryAt:nextAllowedAt};
    }
  })();
  inFlight.set(region,task);
  try {const result=await task;return json(result,result.error?503:200);} finally {inFlight.delete(region);}
}
export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    if(request.method!=='GET') return json({error:'Method not allowed'},405);
    if(url.pathname==='/api/availability') {
      const zip=url.searchParams.get('zip')||'';
      if(!/^(73301|73344|73960|7[5-9]\d{3}|885\d{2})$/.test(zip)) return json({error:'Enter a five-digit Texas ZIP code.'},400);
      try { return await lookup(zip,request,ctx); } catch(error) { console.error('Availability handler failed',String(error)); return json({error:'The inventory service could not complete this check. Please try again after a short pause.',retryAt:Date.now()+300000},503); }
    }
    if(url.pathname==='/api/catalog') return json({models:MODELS,stores:STORES,verifiedAt:'2026-10-27'});
    if(url.pathname==='/healthz') return json({ok:true,stores:STORES.length});
    if(url.pathname!=='/'&&url.pathname!=='/report.html') return new Response('Not found',{status:404});
    return new Response(PAGE,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','permissions-policy':'geolocation=(),camera=(),microphone=()'}});
  }
};
