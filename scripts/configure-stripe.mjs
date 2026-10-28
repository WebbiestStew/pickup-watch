// Run interactively; credentials are read from hidden stdin, never command arguments.
import fs from 'node:fs';
import crypto from 'node:crypto';
import Stripe from 'stripe';
process.on('uncaughtException',error=>{console.error('Stripe test setup failed: '+(error.code||error.type||error.name)+' — '+String(error.message).replace(/[sr]k_(?:test|live)_[A-Za-z0-9]+/g,'[redacted]'));process.exit(1);});
if(process.stdin.isTTY){const tty=await import('node:child_process');tty.execFileSync('stty',['-echo'],{stdio:['inherit','inherit','inherit']});process.on('exit',()=>{try{tty.execFileSync('stty',['echo'],{stdio:['inherit','inherit','inherit']});}catch{}});}
console.log('Ready for test Stripe credentials on hidden stdin.');
let line='';
for await(const chunk of process.stdin){line+=chunk;if(line.includes('\n'))break;}
const input=JSON.parse(line.trim());
if(!input.secretKey?.startsWith('sk_test_')||!input.publishableKey?.startsWith('pk_test_'))throw new Error('Only Stripe TEST keys are accepted by this setup script.');
const stripe=new Stripe(input.secretKey,{apiVersion:'2026-09-30.endive',maxNetworkRetries:2});
const balance=await stripe.balance.retrieve();
if(balance.livemode!==false)throw new Error('Refusing to configure a live account.');
let price=(await stripe.prices.list({active:true,lookup_keys:['pickup_watch_plus_monthly_v1'],limit:1})).data[0];
if(!price){
 const product=await stripe.products.create({name:'Pickup Watch Plus',description:'Two-minute iPhone Duo pickup availability checks while your tab is open. Stock and purchase success are not guaranteed.',metadata:{app:'pickup-watch',plan:'plus'}},{idempotencyKey:'pickup-watch-product-plus-v1'});
 price=await stripe.prices.create({product:product.id,unit_amount:299,currency:'usd',recurring:{interval:'month'},lookup_key:'pickup_watch_plus_monthly_v1'},{idempotencyKey:'pickup-watch-price-plus-monthly-v1'});
}
if(price.unit_amount!==299||price.currency!=='usd'||price.recurring?.interval!=='month')throw new Error('Existing price does not match $2.99 monthly.');
let portal=(await stripe.billingPortal.configurations.list({active:true,limit:100})).data.find(item=>item.metadata?.app==='pickup-watch');
if(!portal)portal=await stripe.billingPortal.configurations.create({business_profile:{headline:'Manage Pickup Watch Plus'},features:{customer_update:{enabled:true,allowed_updates:['email','address']},invoice_history:{enabled:true},payment_method_update:{enabled:true},subscription_cancel:{enabled:true,mode:'at_period_end',cancellation_reason:{enabled:true,options:['too_expensive','unused','other']}}},metadata:{app:'pickup-watch'}},{idempotencyKey:'pickup-watch-portal-config-v2'});
const file=new URL('../.env.local',import.meta.url);
let previous='';try{previous=fs.readFileSync(file,'utf8');}catch{}
const names=new Map(previous.split('\n').filter(line=>line.includes('=')&&!line.startsWith('#')).map(line=>{const i=line.indexOf('=');return[line.slice(0,i),line.slice(i+1)];}));
names.set('STRIPE_SECRET_KEY',input.secretKey);names.set('STRIPE_PUBLISHABLE_KEY',input.publishableKey);names.set('STRIPE_PLUS_PRICE_ID',price.id);names.set('STRIPE_PORTAL_CONFIGURATION_ID',portal.id);
if(!names.get('SESSION_SECRET'))names.set('SESSION_SECRET',crypto.randomBytes(48).toString('hex'));
if(!names.get('OWNER_ACCESS_KEY'))names.set('OWNER_ACCESS_KEY',crypto.randomBytes(48).toString('hex'));
if(!names.get('SITE_URL'))names.set('SITE_URL','http://127.0.0.1:8767');
fs.writeFileSync(file,'# Local test configuration. Ignored by Git; do not commit.\n'+[...names].map(([key,value])=>key+'='+value).join('\n')+'\n',{mode:0o600});fs.chmodSync(file,0o600);
console.log(JSON.stringify({mode:'test',priceId:price.id,monthlyAmount:299,currency:'usd',portalConfigured:true,localEnvSaved:true,chargesCreated:0,subscriptionsCreated:0}));
