import Stripe from 'stripe';
export const STRIPE_API_VERSION='2026-09-30.endive';
let client,key;
export function stripeClient(){
 const next=process.env.STRIPE_SECRET_KEY;
 if(!next)throw new Error('Stripe is not configured');
 if(!client||key!==next){key=next;client=new Stripe(next,{apiVersion:STRIPE_API_VERSION,maxNetworkRetries:2,timeout:8000,httpClient:Stripe.createFetchHttpClient((...args)=>globalThis.fetch(...args))});}
 return client;
}
