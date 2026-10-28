const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const carrier = model => model.token.endsWith('t-mobile') ? 't-mobile' : model.token.split('-').pop();
const preferencesKey = 'pickup-watch-preferences';
let preferences = {};
try { preferences = JSON.parse(localStorage.getItem(preferencesKey) || '{}'); } catch {}
const shared = new URLSearchParams(location.search);
let model = MODELS.find(m => m.token === (shared.get('model') || preferences.token)) || MODELS.find(m => m.token === '7.6-inch-display-512gb-night-sky-verizon');
let observations = new Map(), areaCache = new Map();
try {
  const saved = JSON.parse(sessionStorage.getItem('pickup-watch-results-v2') || '{}');
  observations = new Map((saved.observations || []).filter(([, value]) => value.expires > Date.now()));
  areaCache = new Map((saved.areas || []).filter(([, value]) => value.nextCheckAt > Date.now()));
} catch {}
let plan = {tier:'free',paid:false,intervalSeconds:900,checkoutEnabled:false};
let nextCheck = 0, cycleStart = Date.now(), cooldown = false, busy = false, lastZip = '', lastDisplay = '', limit = 12, renderKey = '', lastMode = '';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const stateOptions = [...new Map(STORES.map(store => [store.state, store.stateName])).entries()].sort((a,b) => a[1].localeCompare(b[1]));
for (const [code, name] of stateOptions) { const option = document.createElement('option'); option.value = code; option.textContent = name; $('state').append(option); }
$('state').value = shared.get('state') || preferences.state || '';
$('model-storage').value = model.storage; $('model-color').value = model.color; $('model-carrier').value = carrier(model);
const initialZip = shared.get('zip') || preferences.zip || '';
if (/^\d{5}$/.test(initialZip)) $('zip').value = initialZip;
if (shared.has('zip')) $('feedback').textContent = 'Area and phone loaded from your link. Hit Find my iPhone to check stock.';
function productUrl() { return 'https://www.apple.com/shop/buy-iphone/iphone-duo/' + model.token; }
function persist() {
  try { localStorage.setItem(preferencesKey, JSON.stringify({token:model.token, state:$('state').value, zip:$('zip').value.trim()})); } catch {}
}
function updateModel() {
  $('model-label').textContent = model.storage.toUpperCase() + ' · ' + (model.color === 'nightsky' ? 'Night Sky' : 'Star White') + ' · ' + ({verizon:'Verizon',att:'AT&T','t-mobile':'T-Mobile',unlocked:'Connect later'}[carrier(model)]);
  $('product').href = productUrl(); persist(); render();
}
function resultFor(store, now = Date.now()) {
  const observation = observations.get(store.id);
  if (!observation || observation.expires <= now) return {status:'unknown', message:observation ? 'Previous check expired' : 'Check this area to see stock'};
  return observation.availability[model.part] || {status:'unknown', message:'No result for this configuration'};
}
function render() {
  const now = Date.now(), counts = {available:0,unavailable:0,unknown:0};
  const ranked = STORES.map(store => ({store,result:resultFor(store,now)}));
  ranked.forEach(({result}) => counts[result.status]++);
  for (const key in counts) $(key).textContent = counts[key];
  const query = $('store-search').value.trim().toLowerCase();
  const filtered = ranked.filter(({store,result}) => (!$('state').value || store.state === $('state').value) && (!$('filter').value || result.status === $('filter').value) && (!query || (store.name+' '+store.city+' '+store.stateName).toLowerCase().includes(query)));
  filtered.sort((a,b) => ({available:0,unavailable:1,unknown:2}[a.result.status] - {available:0,unavailable:1,unknown:2}[b.result.status]) || a.store.stateName.localeCompare(b.store.stateName) || a.store.city.localeCompare(b.store.city));
  $('results-count').textContent = filtered.length + (filtered.length === 1 ? ' store' : ' stores');
  $('empty').hidden = filtered.length > 0; $('more').hidden = filtered.length <= limit;
  const visible = filtered.slice(0,limit);
  const signature = model.token+'|'+visible.map(({store,result}) => store.id+result.status+result.message+(observations.get(store.id)?.checkedAt||'')).join('|');
  if (signature === renderKey) return;
  renderKey = signature;
  $('stores').innerHTML = visible.map(({store,result}) => {
    const observation = observations.get(store.id);
    const checked = observation ? ' · checked ' + new Date(observation.checkedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
    return '<article class="store" data-status="'+result.status+'"><div class="store-top"><span class="city">'+escape(store.city+', '+store.state)+'</span><span class="badge '+result.status+'">'+({available:'Available',unavailable:'Unavailable',unknown:'Unconfirmed'}[result.status])+'</span></div><h3>'+escape(store.name)+'</h3><p>'+escape(result.message+checked)+'</p><button data-zip="'+escape(store.zip)+'" aria-label="Check availability near '+escape(store.name)+'">Check this area ↗</button><div class="links"><a href="'+productUrl()+'" target="_blank" rel="noopener">View at Apple ↗</a><a href="'+escape(store.url)+'" target="_blank" rel="noopener">Store details ↗</a></div></article>';
  }).join('');
}
function applyResults(data, zip) {
  for (const store of data.stores) observations.set(store.id,{availability:store.availability,checkedAt:data.checkedAt,expires:data.nextCheckAt});
  areaCache.set((plan.paid?'plus:':'free:')+zip.slice(0,3), data);
  try { sessionStorage.setItem('pickup-watch-results-v2',JSON.stringify({observations:[...observations],areas:[...areaCache]})); } catch {}
  nextCheck=data.nextCheckAt; cycleStart=data.checkedAt; cooldown=false; lastZip=zip;
  if ($('state').value && !data.stores.some(store => store.state === $('state').value)) $('state').value='';
  $('filter').value=''; $('store-search').value=''; limit=12;
  $('feedback').textContent=data.stores.length+' nearby stores · '+(data.cached?'Cached check':'Updated')+' '+new Date(data.checkedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+'. Refreshes automatically while this tab is open.';
  $('store-heading').textContent='Stores near '+zip;
  $('status').textContent='● Watching your area'; persist(); render();
}
async function check(zip) {
  if(busy) return;
  if(!/^\d{5}$/.test(zip)) { $('feedback').textContent='Enter a five-digit US ZIP code.'; $('zip').focus(); return; }
  const local = areaCache.get((plan.paid?'plus:':'free:')+zip.slice(0,3));
  if(local && local.nextCheckAt > Date.now()) { applyResults({...local,cached:true},zip); tick(); return; }
  if(cooldown && Date.now()<nextCheck) { $('feedback').textContent='The next retry is scheduled. Giving Apple a pause helps avoid blocked checks.'; return; }
  busy=true; $('check-area').disabled=true; $('check-area').textContent='Checking…'; $('feedback').textContent='Checking nearby Apple Stores…'; $('status').textContent='● Checking'; $('stores').setAttribute('aria-busy','true'); tick();
  try {
    const response=await fetch('/api/availability?zip='+encodeURIComponent(zip),{cache:'no-store',signal:AbortSignal.timeout(45000)});
    const data=await response.json();
    if(!response.ok || data.error) { nextCheck=data.retryAt||Date.now()+300000; cycleStart=Date.now(); cooldown=true; $('feedback').textContent=data.error||'Apple could not confirm stock. A retry is scheduled.'; $('status').textContent='● Cooldown'; }
    else applyResults(data,zip);
  } catch { nextCheck=Date.now()+300000; cycleStart=Date.now(); cooldown=true; $('status').textContent='● Connection issue'; $('feedback').textContent='Could not reach the checker. We’ll retry after a short pause. Current stock is unconfirmed.'; }
  finally { lastZip=zip; busy=false; $('check-area').disabled=false; $('check-area').textContent='Find my iPhone ↗'; $('stores').setAttribute('aria-busy','false'); persist(); render(); tick(); }
}
$('area-form').addEventListener('submit',event => { event.preventDefault(); check($('zip').value.trim()); });
$('state').addEventListener('change',() => { limit=12; $('store-heading').textContent='Explore stores'; persist(); render(); });
$('filter').addEventListener('change',() => { limit=12; render(); });
let searchTimer;
$('store-search').addEventListener('input',() => { clearTimeout(searchTimer); searchTimer=setTimeout(() => { limit=12; render(); },120); });
$('model-form').addEventListener('submit',event => { event.preventDefault(); model=MODELS.find(item => item.storage===$('model-storage').value && item.color===$('model-color').value && carrier(item)===$('model-carrier').value)||model; updateModel(); $('selection-feedback').textContent='Watching '+$('model-label').textContent+'. Saved on this device.'; });
$('stores').addEventListener('click',event => { const button=event.target.closest('button[data-zip]'); if(button) { $('zip').value=button.dataset.zip; check(button.dataset.zip); } });
$('more').addEventListener('click',() => { limit+=12; render(); });
let toastTimer;
$('share').addEventListener('click',async () => {
  const link=new URL(location.origin+location.pathname); link.searchParams.set('model',model.token);
  if($('state').value) link.searchParams.set('state',$('state').value);
  if(/^\d{5}$/.test($('zip').value.trim())) link.searchParams.set('zip',$('zip').value.trim());
  try { await navigator.clipboard.writeText(link.toString()); $('toast').textContent='Link copied. Send it to your people.'; }
  catch { $('toast').textContent='Your share link is in the address bar.'; history.replaceState(null,'',link); }
  $('toast').hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(() => {$('toast').hidden=true;},3500);
});
document.addEventListener('keydown',event => {if(event.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){event.preventDefault();$('store-search').focus();}});
function tick() {
  if(document.hidden) return;
  const seconds=Math.max(0,Math.ceil((nextCheck-Date.now())/1000));
  const display=busy?'Checking':nextCheck&&seconds?String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'):'Ready';
  if(display!==lastDisplay) {
    const counter=$('countdown');
    if(display.includes(':') && lastDisplay.includes(':') && display.length===lastDisplay.length) {
      Array.from(display).forEach((char,index) => {const element=counter.children[index];if(element&&element.textContent!==char){element.textContent=char;if(!reducedMotion)element.animate([{transform:'translateY(7px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:260,easing:'ease-out'});}});
    } else if(!display.includes(':')) {const word=document.createElement('span');word.className='word';word.textContent=display;counter.replaceChildren(word);}
    else counter.replaceChildren(...Array.from(display,char => {const span=document.createElement('span');span.className=char===':'?'colon':'digit';span.textContent=char;return span;}));
    lastDisplay=display; counter.setAttribute('aria-label',display);
  }
  const mode=busy?'busy':cooldown?'cooldown':lastZip?'watching':'ready';
  if(mode!==lastMode) {
    $('dial').classList.toggle('is-checking',busy); $('timer-panel').classList.toggle('is-cooldown',cooldown); $('status').classList.toggle('cooldown',cooldown);
    $('timer-label').textContent=cooldown?'Cooling down · retry in':lastZip?'Next area check in':'Your next stock check';
    $('time-caption').textContent=busy?'Contacting Apple':cooldown?'Giving Apple a moment':lastZip?(plan.paid?'Plus · 2-minute checks':'Free · 15-minute checks'):'Choose your area';
    $('health').textContent=cooldown?'A retry is scheduled. Current stock is unconfirmed.':lastZip?'Area checks continue while this tab is open.':'Search a ZIP code to check nearby stores.';
    lastMode=mode;
  }
  const fraction=nextCheck?Math.max(0,Math.min(1,(nextCheck-Date.now())/Math.max(1000,nextCheck-cycleStart))):1;
  $('ring-progress').style.strokeDashoffset=String(100*(1-fraction));
  if(!busy&&nextCheck&&Date.now()>=nextCheck&&lastZip){nextCheck=Date.now()+30000;check(lastZip);}
}
updateModel(); tick(); setInterval(tick,1000); setInterval(() => {if(!document.hidden)render();},30000);
document.addEventListener('visibilitychange',() => {if(!document.hidden){render();tick();}});

async function loadPlan() {
 try {
  const response=await fetch('/api/billing',{cache:'no-store'});if(!response.ok)throw new Error();
  const incoming=await response.json(),changed=incoming.paid!==plan.paid;
  plan=incoming;
  if(changed){areaCache.clear();observations.clear();renderKey='';if(lastZip)nextCheck=Date.now()+1000;lastMode='';render();}
  $('plan-nav').textContent=plan.tier==='owner'?'Owner · free':plan.paid?'Plus active':'Plus · $2.99';
  $('free-plan-label').textContent=plan.paid?'Always available':'Current plan';
  $('owner-access').hidden=!plan.ownerEnabled;
  const button=$('upgrade-button');
  button.disabled=plan.tier==='owner'||(!plan.paid&&!plan.canManage&&!plan.checkoutEnabled);
  button.textContent=plan.tier==='owner'?'Owner access active · no charge':plan.canManage?'Manage billing & invoices':plan.checkoutEnabled?(plan.testMode?'Try test checkout · $2.99/mo':'Get Plus · $2.99/month'):'Checkout coming soon';
  $('billing-note').textContent=plan.tier==='owner'?'You have free access to two-minute checks. No subscription is attached.':plan.paid?'Plus is active in this browser. Manage billing or cancel through Stripe.':plan.checkoutEnabled?(plan.testMode?'Stripe test mode. Test payments do not charge real money.':'$2.99 USD billed monthly. Cancel in the billing portal. Payment details are handled by Stripe.'):'Checkout isn’t connected yet. No payments are being accepted.';
  tick();
 }catch{$('billing-feedback').textContent='Plan status could not be verified. Billing controls are unavailable; free checks remain available.';}
}
$('upgrade-button').addEventListener('click',async()=>{
 if(plan.tier==='owner'||(!plan.paid&&!plan.canManage&&!plan.checkoutEnabled))return;
 const button=$('upgrade-button');button.disabled=true;
 $('billing-feedback').textContent=plan.canManage?'Opening secure billing management…':'Opening Stripe checkout. You will confirm the subscription there.';
 try{
  const response=await fetch('/api/billing?action='+(plan.canManage?'portal':'checkout'),{method:'POST'});const data=await response.json();
  if(!response.ok||!data.url)throw new Error(data.error||'Could not open billing.');
  location.assign(data.url);
 }catch(error){$('billing-feedback').textContent=error.message;button.disabled=false;}
});
$('owner-form').addEventListener('submit',async event=>{
 event.preventDefault();const code=$('owner-code').value;$('owner-code').value='';
 try{const response=await fetch('/api/billing?action=owner',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});const data=await response.json();if(!response.ok)throw new Error(data.error);$('billing-feedback').textContent='Owner access activated. Two-minute checks, no payment needed.';await loadPlan();}
 catch(error){$('billing-feedback').textContent=error.message||'Could not activate owner access.';}
});
const billingReturn=new URLSearchParams(location.search).get('billing');
if(billingReturn==='success')$('billing-feedback').textContent='Payment verified. Loading your Plus access…';
if(billingReturn==='cancelled')$('billing-feedback').textContent='Checkout cancelled. You are still on the free plan.';
loadPlan();

if(billingReturn==='pending'){
 const id=new URLSearchParams(location.search).get('session_id');
 let attempts=0;
 async function activateAfterWebhook(){
  if(!id||attempts++>20){$('billing-feedback').textContent='Your payment is still processing. Return to this page later; access activates after Stripe confirms payment.';return;}
  try{const response=await fetch('/api/billing?action=activate&session_id='+encodeURIComponent(id),{cache:'no-store'});const data=await response.json();
   if(response.ok&&data.ok){history.replaceState(null,'','/?billing=success');$('billing-feedback').textContent='Payment verified by Stripe. Your Plus access is ready.';await loadPlan();return;}
   if(response.status!==202){$('billing-feedback').textContent=data.error||'Could not activate access. Please try again later.';return;}
  }catch{}
  $('billing-feedback').textContent='Waiting for Stripe to confirm your payment…';setTimeout(activateAfterWebhook,2000);
 }
 activateAfterWebhook();
}
