function settings(){return {url:process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL,token:process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN};}
export function billingStoreReady(){const {url,token}=settings();return Boolean(url&&token);}
async function command(args){
 if(!billingStoreReady())throw new Error('Durable billing storage is required');
 const {url,token}=settings();
 const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(4000)});
 if(!response.ok)throw new Error('Billing store unavailable');
 const body=await response.json();if(body.error)throw new Error('Billing storage command failed');return body.result;
}
export async function readBilling(key){const raw=await command(['GET','pickup:billing:v1:'+key]);return raw?JSON.parse(raw):null;}
export async function writeBilling(key,value,seconds=400*86400){await command(['SET','pickup:billing:v1:'+key,JSON.stringify(value),'EX',seconds]);}
export async function riskHold(subscriptionId,reason,eventId){await writeBilling('risk:'+subscriptionId,{held:true,reason,eventId,at:Date.now()});}
export async function syncSubscription(subscription){
 const record={id:subscription.id,customer:typeof subscription.customer==='string'?subscription.customer:subscription.customer?.id,status:subscription.status,prices:subscription.items?.data?.map(item=>item.price?.id)||[],cancelAtPeriodEnd:subscription.cancel_at_period_end||false,syncedAt:Date.now()};
 await writeBilling('sub:'+subscription.id,record);return record;
}
