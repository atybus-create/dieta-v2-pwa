/* Final monetization UI: FREE upsell + PLUS/VIP Google Play bridge */
(function(){
  const ENDPOINT='https://api.atybuslab.com/webhook/dieta-v2-monetization-event';
  const TOKEN_KEY='fotoDietaAccessTokenV2';
  const PRODUCT={plus:'wczai_plus_monthly',vip:'wczai_vip_monthly'};
  let status=null;

  function token(){return localStorage.getItem(TOKEN_KEY)||'';}
  async function event(name,extra={}){
    const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:token(),event:name,...extra})});
    const j=await r.json(); if(!r.ok||j.success===false) throw new Error(j.message||j.error||'Błąd monetyzacji'); return j;
  }
  function nativeBilling(){return !!(window.AndroidBilling&&typeof window.AndroidBilling.purchase==='function');}
  function buy(plan){
    if(!['plus','vip'].includes(plan)) return;
    if(!nativeBilling()){ alert('Subskrypcje PLUS i VIP są dostępne w aplikacji Android z Google Play.'); return; }
    window.AndroidBilling.purchase(PRODUCT[plan],plan);
  }
  function css(){
    const s=document.createElement('style');s.textContent=`
#monetizationBar{margin:10px 16px 4px;padding:12px 14px;border:1px solid rgba(91,234,216,.22);border-radius:18px;background:linear-gradient(135deg,rgba(18,53,57,.92),rgba(9,24,29,.94));box-shadow:0 10px 30px rgba(0,0,0,.16)}
#monetizationBar .mrow{display:flex;gap:10px;align-items:center;justify-content:space-between}#monetizationBar strong{font-size:14px}#monetizationBar small{display:block;margin-top:3px;color:#a9c8c5;line-height:1.3}#monetizationBar button,.m-upgrade-btn{border:0;border-radius:13px;padding:10px 13px;font-weight:800;background:#62ead9;color:#06201d;cursor:pointer}.m-plan-pill{font-size:11px;font-weight:900;letter-spacing:.06em;padding:5px 8px;border-radius:999px;background:rgba(98,234,217,.12);color:#83f2e4}.m-paywall{position:fixed;inset:0;z-index:10050;display:none;place-items:end center;background:rgba(1,8,10,.72);backdrop-filter:blur(7px)}.m-paywall.open{display:grid}.m-sheet{width:min(100%,520px);box-sizing:border-box;padding:22px 18px calc(22px + env(safe-area-inset-bottom));border-radius:28px 28px 0 0;background:#0a171b;border:1px solid rgba(111,241,224,.2)}.m-sheet h2{margin:0 0 7px}.m-sheet>p{color:#aac5c3;margin:0 0 15px}.m-card{padding:15px;margin:10px 0;border:1px solid rgba(116,226,213,.18);border-radius:18px;background:#0e2025}.m-card.vip{border-color:rgba(255,210,109,.35)}.m-card h3{margin:0 0 5px}.m-card p{margin:0 0 12px;color:#b8cfcd;font-size:13px;line-height:1.4}.m-card button{width:100%}.m-close{width:100%;margin-top:8px;border:0;background:transparent;color:#b8cfcd;padding:12px}.m-limit-cta{margin:12px 0;padding:13px;border-radius:16px;background:rgba(98,234,217,.08);border:1px solid rgba(98,234,217,.18)}.m-limit-cta button{margin-top:8px;width:100%}`;document.head.appendChild(s);
  }
  function shell(){
    if(document.getElementById('monetizationPaywall'))return;
    const d=document.createElement('div');d.id='monetizationPaywall';d.className='m-paywall';d.innerHTML=`<div class="m-sheet"><span class="m-plan-pill">WIEM CO ŻRE-M Z AI</span><h2>Więcej AI, mniej ograniczeń</h2><p>Wybierz plan dopasowany do tego, jak często korzystasz z analizy posiłków.</p><div class="m-card"><h3>PLUS</h3><p>Większe limity analiz i wygodniejsze korzystanie z aplikacji. Płatność i odnawianie przez Google Play.</p><button class="m-upgrade-btn" data-plan="plus">Wybieram PLUS</button></div><div class="m-card vip"><h3>VIP</h3><p>Najwyższy plan dla intensywnego korzystania z AI. Płatność i odnawianie przez Google Play.</p><button class="m-upgrade-btn" data-plan="vip">Wybieram VIP</button></div><button class="m-close">Może później</button></div>`;
    document.body.appendChild(d);d.addEventListener('click',e=>{const p=e.target?.dataset?.plan;if(p)buy(p);if(e.target===d||e.target.classList.contains('m-close'))d.classList.remove('open');});
  }
  function open(){shell();document.getElementById('monetizationPaywall')?.classList.add('open');}
  function render(s){
    status=s||status;if(!status)return;const plan=String(status.plan||'free').toLowerCase();
    let bar=document.getElementById('monetizationBar');if(!bar){bar=document.createElement('div');bar.id='monetizationBar';const app=document.getElementById('app');const header=app?.querySelector('header');if(header)header.insertAdjacentElement('afterend',bar);}
    if(!bar)return;
    if(plan==='free')bar.innerHTML=`<div class="mrow"><div><strong>Masz plan FREE</strong><small>Odblokuj większe limity AI w PLUS lub VIP.</small></div><button id="monetizationUpgrade">Zobacz PLUS / VIP</button></div>`;
    else bar.innerHTML=`<div class="mrow"><div><strong>Plan ${plan.toUpperCase()}</strong><small>${plan==='friends'?'Plan przyznany przez administratora.':'Subskrypcja aktywna.'}</small></div><span class="m-plan-pill">${plan.toUpperCase()}</span></div>`;
    document.getElementById('monetizationUpgrade')?.addEventListener('click',open);
  }
  async function refresh(){if(!token())return;try{render(await event('status'));}catch(e){console.warn('Monetization status',e);}}
  window.WCZMonetization={open,refresh,buy,onPurchaseVerified:function(result){status=result;render(result);document.getElementById('monetizationPaywall')?.classList.remove('open');}};
  document.addEventListener('DOMContentLoaded',()=>{css();shell();setTimeout(refresh,1200);});
  document.addEventListener('click',e=>{const t=(e.target?.textContent||'').toLowerCase();if(status?.plan==='free'&&(t.includes('limit')||t.includes('reklam')))setTimeout(open,150);},true);
})();
