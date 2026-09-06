(() => {
  'use strict';

  const EVENT_API = API.replace(/\/dieta-v2$/, '/dieta-v2-monetization-event');
  const BILLING_VERIFY_API = API.replace(/\/dieta-v2$/, '/dieta-v2-billing-verify');
  const STYLE_ID = 'monetizationClientStyles';
  const PROMPT_ID = 'rewardedGateModal';
  const PLANS_ID = 'subscriptionPlansModal';
  const PLAN_PANEL_ID = 'monetizationPlanPanel';
  let status = null;
  let pendingAd = null;
  let billingReady = false;
  let billingProducts = {};
  let billingBusy = false;

  const isNative = () => Boolean(window.__AI_MONITOR_NATIVE__ && window.AndroidMonetization);
  const hasBilling = () => Boolean(window.__AI_MONITOR_NATIVE__ && window.AndroidBilling);

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .mon-overlay{position:fixed;inset:0;z-index:14500;display:grid;place-items:center;padding:16px;background:rgba(2,8,11,.92);backdrop-filter:blur(12px)}
      .mon-overlay.hidden{display:none!important}.mon-card{width:min(94vw,520px);max-height:88vh;overflow:auto;box-sizing:border-box;padding:22px;border-radius:24px;border:1px solid rgba(112,235,218,.24);background:linear-gradient(145deg,#102027,#081318);box-shadow:0 30px 95px rgba(0,0,0,.58);color:#edf7f6}
      .mon-kicker{font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#63dece}.mon-card h2{margin:7px 0 10px;font-size:25px}.mon-card p{color:#a9bfc0;line-height:1.5}.mon-highlight{padding:13px 14px;border-radius:14px;background:rgba(112,235,218,.07);border:1px solid rgba(112,235,218,.16);color:#d9f7f3!important}
      .mon-actions{display:grid;gap:9px;margin-top:18px}.mon-primary,.mon-secondary{min-height:50px;border-radius:15px;padding:12px 16px;font:inherit;font-weight:850;cursor:pointer}.mon-primary{border:0;background:linear-gradient(135deg,#72f5df,#22c9d6);color:#061316}.mon-secondary{border:1px solid rgba(160,200,202,.2);background:#112027;color:#d7e5e5}.mon-primary:disabled,.mon-secondary:disabled{opacity:.5}
      .mon-plans{display:grid;gap:10px;margin-top:14px}.mon-plan{padding:14px;border-radius:16px;border:1px solid rgba(160,200,202,.16);background:rgba(255,255,255,.025)}.mon-plan.current{border-color:rgba(112,235,218,.42);background:rgba(112,235,218,.07)}.mon-plan-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.mon-plan strong{font-size:17px}.mon-pill{padding:5px 9px;border-radius:999px;background:rgba(112,235,218,.1);color:#86eee0;font-size:11px;font-weight:900}.mon-plan ul{margin:9px 0 0;padding-left:19px;color:#a9bfc0;line-height:1.45;font-size:13px}.mon-buy{margin-top:12px;width:100%}
      .mon-panel{margin-top:16px!important}.mon-panel-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.mon-panel-copy{color:#91a9aa;font-size:13px;margin-top:5px}.mon-panel-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}@media(max-width:520px){.mon-overlay{padding:9px}.mon-card{padding:18px;border-radius:20px}.mon-panel-row{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  async function monetizationEvent(eventName) {
    if (!state?.token) throw new Error('Brak aktywnej sesji.');
    const data = await post(EVENT_API, { accessToken: state.token, event: eventName });
    status = data || status;
    updatePlanPanel();
    return data;
  }

  async function verifyPurchase(productId, purchaseToken, restore) {
    if (!state?.token) throw new Error('Brak aktywnej sesji.');
    const data = await post(BILLING_VERIFY_API, { accessToken: state.token, productId, purchaseToken, restore: Boolean(restore) });
    await refreshMonetizationStatus();
    return data;
  }

  function ensureRewardedModal() {
    injectStyles();
    let overlay = document.getElementById(PROMPT_ID);
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = PROMPT_ID;
    overlay.className = 'mon-overlay hidden';
    overlay.innerHTML = `<div class="mon-card" role="dialog" aria-modal="true"><div class="mon-kicker">Plan FREE</div><h2>Kolejna analiza po reklamie</h2><p>W planie FREE dwie pierwsze analizy AI każdego dnia są bez reklamy. Każda kolejna analiza wymaga krótkiej reklamy nagradzanej.</p><p class="mon-highlight">Obejrzyj reklamę, aby odblokować tę analizę. Możesz też przejść na PLUS lub VIP.</p><div class="mon-actions"><button id="rewardedWatchBtn" class="mon-primary" type="button">Obejrzyj reklamę i analizuj</button><button id="rewardedPlansBtn" class="mon-secondary" type="button">Zobacz plany subskrypcyjne</button><button id="rewardedCancelBtn" class="mon-secondary" type="button">Anuluj analizę</button></div></div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function planPrice(productId, fallback) { return billingProducts[productId]?.formattedPrice || fallback; }

  function updatePlansModal() {
    const overlay = document.getElementById(PLANS_ID);
    if (!overlay) return;
    const current = String(status?.plan || 'free').toLowerCase();
    overlay.querySelectorAll('.mon-plan').forEach(el => el.classList.toggle('current', el.dataset.plan === current));
    const plusPrice = overlay.querySelector('[data-price="plus"]');
    const vipPrice = overlay.querySelector('[data-price="vip"]');
    if (plusPrice) plusPrice.textContent = `${planPrice('plus', '9,99 zł')} / mies.`;
    if (vipPrice) vipPrice.textContent = `${planPrice('vip', '49,99 zł')} / mies.`;
    overlay.querySelectorAll('.mon-buy').forEach(btn => {
      const plan = btn.dataset.product;
      btn.disabled = billingBusy || !billingReady || current === plan;
      btn.textContent = current === plan ? 'Aktualny plan' : (billingReady ? `Wybierz ${plan.toUpperCase()}` : 'Łączę z Google Play…');
    });
  }

  function ensurePlansModal() {
    injectStyles();
    let overlay = document.getElementById(PLANS_ID);
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = PLANS_ID;
    overlay.className = 'mon-overlay hidden';
    overlay.style.zIndex = '14600';
    overlay.innerHTML = `<div class="mon-card" role="dialog" aria-modal="true"><div class="mon-kicker">Plany aplikacji</div><h2>Wybierz sposób korzystania</h2><p>Subskrypcje PLUS i VIP są rozliczane bezpiecznie przez Google Play. Cena zostanie potwierdzona na ekranie płatności Google.</p><div class="mon-plans"><div class="mon-plan" data-plan="free"><div class="mon-plan-head"><strong>FREE</strong><span class="mon-pill">bez opłat</span></div><ul><li>2 analizy AI dziennie bez reklamy</li><li>kolejne analizy po reklamie nagradzanej</li></ul></div><div class="mon-plan" data-plan="plus"><div class="mon-plan-head"><strong>PLUS</strong><span class="mon-pill" data-price="plus">9,99 zł / mies.</span></div><ul><li>do 20 analiz AI dziennie</li><li>bez reklam nagradzanych przed analizą</li></ul><button class="mon-primary mon-buy" data-product="plus" type="button">Wybierz PLUS</button></div><div class="mon-plan" data-plan="vip"><div class="mon-plan-head"><strong>VIP</strong><span class="mon-pill" data-price="vip">49,99 zł / mies.</span></div><ul><li>do 50 analiz AI dziennie</li><li>bez reklam</li></ul><button class="mon-primary mon-buy" data-product="vip" type="button">Wybierz VIP</button></div></div><div class="mon-actions"><button id="plansRestoreBtn" class="mon-secondary" type="button">Przywróć zakupy</button><button id="plansCloseBtn" class="mon-secondary" type="button">Wróć</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.mon-buy').forEach(btn => btn.onclick = () => startPurchase(btn.dataset.product));
    document.getElementById('plansRestoreBtn').onclick = restorePurchases;
    document.getElementById('plansCloseBtn').onclick = () => overlay.classList.add('hidden');
    updatePlansModal();
    return overlay;
  }

  function openPlans() {
    const overlay = ensurePlansModal(); updatePlansModal(); overlay.classList.remove('hidden');
    if (hasBilling()) { try { window.AndroidBilling.queryProducts(); } catch (_) {} }
  }

  function startPurchase(productId) {
    if (!hasBilling()) return typeof toast === 'function' && toast('Zakupy są dostępne w aplikacji z Google Play.');
    if (!billingReady) return typeof toast === 'function' && toast('Google Play Billing jeszcze się uruchamia.');
    billingBusy = true; updatePlansModal();
    try { window.AndroidBilling.purchase(productId); }
    catch (_) { billingBusy = false; updatePlansModal(); if (typeof toast === 'function') toast('Nie udało się otworzyć płatności Google Play.'); }
  }

  function restorePurchases() {
    if (!hasBilling()) return typeof toast === 'function' && toast('Przywracanie zakupów jest dostępne w aplikacji Android.');
    billingBusy = true; updatePlansModal();
    try { window.AndroidBilling.restorePurchases(); }
    catch (_) { billingBusy = false; updatePlansModal(); }
  }

  window.__wczBillingState = ready => {
    billingReady = Boolean(ready);
    if (billingReady && hasBilling()) { try { window.AndroidBilling.queryProducts(); } catch (_) {} }
    updatePlansModal();
  };

  window.__wczBillingProducts = products => {
    billingProducts = {};
    (Array.isArray(products) ? products : []).forEach(p => { if (p?.productId && p?.basePlanId === 'monthly') billingProducts[p.productId] = p; });
    billingReady = Boolean(billingProducts.plus || billingProducts.vip); updatePlansModal();
  };

  window.__wczBillingPurchase = async payload => {
    billingBusy = false; updatePlansModal();
    const purchases = Array.isArray(payload?.purchases) ? payload.purchases : [];
    if (!purchases.length) { if (payload?.restore && typeof toast === 'function') toast('Nie znaleziono aktywnych subskrypcji do przywrócenia.'); return; }
    let verified = 0;
    for (const purchase of purchases) {
      if (!purchase?.purchased || purchase?.pending) continue;
      const productId = (purchase.products || []).find(p => p === 'plus' || p === 'vip');
      if (!productId || !purchase.purchaseToken) continue;
      try { await verifyPurchase(productId, purchase.purchaseToken, payload?.restore); verified += 1; }
      catch (error) { console.error('Billing verification failed:', error); }
    }
    if (verified) {
      if (typeof toast === 'function') toast(payload?.restore ? 'Subskrypcja została przywrócona.' : 'Subskrypcja została aktywowana.');
      document.getElementById(PLANS_ID)?.classList.add('hidden');
    } else if (purchases.some(p => p?.pending)) {
      if (typeof toast === 'function') toast('Płatność oczekuje na potwierdzenie w Google Play.');
    } else if (typeof toast === 'function') toast('Nie udało się potwierdzić subskrypcji.');
  };

  window.__wczBillingError = error => {
    billingBusy = false; updatePlansModal(); const code = String(error?.code || '');
    if (code === 'USER_CANCELED') return;
    if (typeof toast === 'function') toast(code === 'ALREADY_SUBSCRIBED' ? 'Ten plan jest już aktywny.' : (error?.message || 'Błąd Google Play Billing.'));
  };

  function askForRewarded() {
    const overlay = ensureRewardedModal(); overlay.classList.remove('hidden');
    return new Promise(resolve => {
      document.getElementById('rewardedWatchBtn').onclick = () => { overlay.classList.add('hidden'); resolve('watch'); };
      document.getElementById('rewardedCancelBtn').onclick = () => { overlay.classList.add('hidden'); resolve('cancel'); };
      document.getElementById('rewardedPlansBtn').onclick = openPlans;
    });
  }

  function showDailyLimit(data) {
    injectStyles(); const old = document.getElementById('dailyAiLimitModal'); if (old) old.remove();
    const overlay = document.createElement('div'); overlay.id = 'dailyAiLimitModal'; overlay.className = 'mon-overlay';
    overlay.innerHTML = `<div class="mon-card"><div class="mon-kicker">Limit dzienny</div><h2>Dzisiejszy limit analiz został wykorzystany</h2><p>Plan ${String(data?.plan || 'FREE').toUpperCase()} wykorzystał dziś ${Number(data?.aiSuccessCount || 0)} z ${Number(data?.aiMaxPerDay || 0)} analiz AI.</p><div class="mon-actions"><button id="limitPlansBtn" class="mon-primary" type="button">Zobacz plany</button><button id="limitCloseBtn" class="mon-secondary" type="button">Zamknij</button></div></div>`;
    document.body.appendChild(overlay); document.getElementById('limitPlansBtn').onclick = openPlans; document.getElementById('limitCloseBtn').onclick = () => overlay.remove();
  }

  function requestNativeAd(type) {
    if (!isNative()) return Promise.resolve(false); if (pendingAd) return Promise.resolve(false);
    return new Promise(resolve => {
      const timer = setTimeout(() => { if (pendingAd?.type === type) pendingAd = null; resolve(false); }, 45000);
      pendingAd = { type, resolve: ok => { clearTimeout(timer); pendingAd = null; resolve(Boolean(ok)); } };
      try { if (type === 'rewarded') window.AndroidMonetization.showRewarded(); else if (type === 'interstitial') window.AndroidMonetization.showInterstitial(); else if (type === 'native') window.AndroidMonetization.showIngredientNative(); else pendingAd.resolve(false); } catch (_) { pendingAd.resolve(false); }
    });
  }

  window.__wczMonetizationAdResult = (type, success) => { if (pendingAd && pendingAd.type === String(type || '')) pendingAd.resolve(Boolean(success)); };

  async function ensureAiAccess() {
    if (!isNative()) return true;
    let check; try { check = await monetizationEvent('check_ai'); } catch (error) { console.warn('Monetization pre-check failed:', error); return true; }
    if (check?.wouldAllow !== false) return true;
    if (String(check?.reason || '') === 'DAILY_LIMIT') { showDailyLimit(check); return false; }
    if (String(check?.requiredAd || '') === 'rewarded') {
      const choice = await askForRewarded(); if (choice !== 'watch') return false;
      const earned = await requestNativeAd('rewarded'); if (!earned) { if (typeof toast === 'function') toast('Reklama nie została ukończona.'); return false; }
      try { await monetizationEvent('rewarded_complete'); return true; } catch (_) { if (typeof toast === 'function') toast('Nie udało się odblokować analizy po reklamie.'); return false; }
    }
    return true;
  }

  async function handleAfterAction(action, response) {
    if (!isNative() || !response?.monetization) return;
    status = { ...status, ...response.monetization }; updatePlanPanel();
    if ((action === 'analyze_text' || action === 'analyze_photo') && response.monetization.interstitialDue) { const shown = await requestNativeAd('interstitial'); if (shown) { try { await monetizationEvent('interstitial_shown'); } catch (_) {} } }
    if (action === 'ingredient_search' && response.monetization.nativeDue) { const shown = await requestNativeAd('native'); if (shown) { try { await monetizationEvent('native_shown'); } catch (_) {} } }
  }

  function ensurePlanPanel() {
    if (document.getElementById(PLAN_PANEL_ID)) return;
    const anchor = document.getElementById('legalPrivacyPanel') || document.getElementById('themePanel'); if (!anchor) return;
    const panel = document.createElement('div'); panel.id = PLAN_PANEL_ID; panel.className = 'panel glass-card mon-panel';
    panel.innerHTML = `<div class="mon-panel-row"><div><div class="section-kicker">Plan i limity</div><h3 style="margin:5px 0 0">Plan <span id="monCurrentPlan">FREE</span></h3><div id="monPlanCopy" class="mon-panel-copy">Sprawdzam bieżący limit…</div></div><span id="monPlanBadge" class="mon-pill">FREE</span></div><div class="mon-panel-actions"><button id="monPlansBtn" class="legal-secondary" type="button">Zobacz plany</button></div>`;
    anchor.insertAdjacentElement('afterend', panel); document.getElementById('monPlansBtn').onclick = openPlans;
  }

  function updatePlanPanel() {
    ensurePlanPanel(); const plan = String(status?.plan || 'free').toUpperCase(); const used = Number(status?.aiSuccessCount || 0); const max = Number(status?.aiMaxPerDay || (plan === 'VIP' || plan === 'FRIENDS' ? 50 : 20));
    const name = document.getElementById('monCurrentPlan'); const badge = document.getElementById('monPlanBadge'); const copy = document.getElementById('monPlanCopy');
    if (name) name.textContent = plan; if (badge) badge.textContent = plan; if (copy) copy.textContent = `Analizy AI dzisiaj: ${used}/${max}${plan === 'FREE' ? ' · pierwsze 2 bez reklamy' : ''}`; updatePlansModal();
  }

  async function refreshMonetizationStatus() { if (!state?.token) return; try { await monetizationEvent('status'); } catch (_) { ensurePlanPanel(); } }

  const baseApi = api;
  api = async function monetizationAwareApi(action, payload = {}, file = null) {
    const normalized = String(action || '').trim().toLowerCase();
    if ((normalized === 'analyze_text' || normalized === 'analyze_photo') && isNative()) { const allowed = await ensureAiAccess(); if (!allowed) throw new Error('Analiza została anulowana.'); }
    const response = await baseApi(action, payload, file); await handleAfterAction(normalized, response); return response;
  };

  const baseEnterApp = enterApp;
  enterApp = async function monetizationAwareEnterApp(...args) {
    const result = await baseEnterApp(...args); ensurePlanPanel(); await refreshMonetizationStatus();
    if (hasBilling()) { try { billingReady = Boolean(window.AndroidBilling.isReady()); window.AndroidBilling.queryProducts(); } catch (_) {} }
    return result;
  };

  function initMonetization() {
    injectStyles(); ensureRewardedModal(); ensurePlansModal(); ensurePlanPanel();
    if (state?.token) refreshMonetizationStatus();
    if (hasBilling()) { try { billingReady = Boolean(window.AndroidBilling.isReady()); window.AndroidBilling.queryProducts(); } catch (_) {} }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMonetization, { once: true }); else initMonetization();
})();
