import {stripeClient} from './stripe-client.js';
import {billingStoreReady,readBilling,writeBilling,syncSubscription,riskHold} from './billing-store.js';
const id=value=>typeof value==='string'?value:value?.id;
const json=(value,status)=>Response.json(value,{status,headers:{'cache-control':'no-store'}});
export const WEBHOOK_EVENTS=[
 'checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed',
 'customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','customer.subscription.paused','customer.subscription.resumed',
 'invoice.paid','invoice.payment_failed','invoice.finalization_failed',
 'charge.dispute.created','charge.refunded','radar.early_fraud_warning.created'
];
async function currentSubscription(subscriptionId){const subscription=await stripeClient().subscriptions.retrieve(subscriptionId);await syncSubscription(subscription);return subscription;}
async function fulfillCheckout(session){
 if(session.mode!=='subscription'||!['paid','no_payment_required'].includes(session.payment_status))return;
 const subscriptionId=id(session.subscription);if(!subscriptionId)return;
 const subscription=await currentSubscription(subscriptionId);
 if(subscription.status!=='active'||!subscription.items.data.some(item=>item.price.id===process.env.STRIPE_PLUS_PRICE_ID))return;
 await writeBilling('checkout:'+session.id,{fulfilled:true,subscription:subscription.id,customer:id(subscription.customer),session:session.id,at:Date.now()});
}
async function invoiceSubscription(invoice){return id(invoice.parent?.subscription_details?.subscription)||id(invoice.subscription);}
async function resolveRiskSubscriptions(event){
 const stripe=stripeClient(),object=event.data.object;
 const charge=event.type==='charge.refunded'?object:await stripe.charges.retrieve(id(object.charge));
 const paymentIntent=id(charge.payment_intent);if(!paymentIntent)return [];
 const subscriptions=new Set();
 // API 2026-09-30: Charge -> PaymentIntent -> InvoicePayment -> Invoice.parent.subscription_details.
 for await(const payment of stripe.invoicePayments.list({payment:{type:'payment_intent',payment_intent:paymentIntent},status:'paid',limit:100})){
  const invoice=await stripe.invoices.retrieve(id(payment.invoice));
  const subscription=await invoiceSubscription(invoice);if(subscription)subscriptions.add(subscription);
 }
 return [...subscriptions];
}
export async function processStripeEvent(event){
 if(await readBilling('event:'+event.id))return {duplicate:true};
 const object=event.data.object;
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))await fulfillCheckout(object);
 else if(event.type==='checkout.session.async_payment_failed')await writeBilling('checkout:'+object.id,{fulfilled:false,paymentFailed:true,at:Date.now()});
 else if(event.type.startsWith('customer.subscription.'))await currentSubscription(object.id);
 else if(event.type.startsWith('invoice.')){
  const subscriptionId=await invoiceSubscription(object);
  if(subscriptionId){await currentSubscription(subscriptionId);await writeBilling('invoice:'+subscriptionId,{id:object.id,status:object.status,lastEvent:event.type,at:Date.now()});}
 }else if(['charge.dispute.created','charge.refunded','radar.early_fraud_warning.created'].includes(event.type)){
  for(const subscriptionId of await resolveRiskSubscriptions(event)){
   const subscription=await currentSubscription(subscriptionId);
   if(!subscription.items.data.some(item=>item.price.id===process.env.STRIPE_PLUS_PRICE_ID))continue;
   // Record the exact affected subscription for manual review. Do not send messages or issue refunds automatically.
   await writeBilling('review:'+event.id+':'+subscriptionId,{event:event.type,subscription:subscriptionId,at:Date.now()});
   if(event.type==='charge.dispute.created'||(event.type==='charge.refunded'&&object.refunded===true))await riskHold(subscriptionId,event.type,event.id);
  }
 }
 await writeBilling('event:'+event.id,{type:event.type,processedAt:Date.now()},7*86400);
 return {received:true};
}
export async function stripeWebhook(request){
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(!process.env.STRIPE_WEBHOOK_SECRET||!process.env.STRIPE_SECRET_KEY||!billingStoreReady())return json({error:'Webhook configuration is incomplete'},503);
 const signature=request.headers.get('stripe-signature');if(!signature)return json({error:'Missing webhook signature'},400);
 const raw=await request.text();if(raw.length>1048576)return json({error:'Payload too large'},413);
 let event;try{event=stripeClient().webhooks.constructEvent(raw,signature,process.env.STRIPE_WEBHOOK_SECRET);}catch{return json({error:'Invalid webhook signature'},400);}
 const testKey=process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')||process.env.STRIPE_SECRET_KEY.startsWith('rk_test_');
 if(event.livemode===testKey)return json({error:'Webhook mode does not match configured Stripe environment'},400);
 if(!WEBHOOK_EVENTS.includes(event.type))return json({received:true,ignored:true},200);
 try{return json(await processStripeEvent(event),200);}catch(error){console.error('Stripe webhook processing failed',{eventId:event.id,type:event.type});return json({error:'Webhook processing failed; retry required'},500);}
}
