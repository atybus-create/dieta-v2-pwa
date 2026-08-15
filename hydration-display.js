(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  let latestWater = null;

  function ensureHydrationUi() {
    const card = byId('waterCard');
    if (!card) return;

    const sub = card.querySelector('.water-sub');
    if (sub) sub.textContent = 'Woda + płyny z posiłków';

    if (!byId('waterBreakdown')) {
      const copy = card.querySelector('.water-progress-copy');
      if (copy) {
        const line = document.createElement('div');
        line.id = 'waterBreakdown';
        line.style.marginTop = '7px';
        line.style.fontSize = '12px';
        line.style.color = '#789aaa';
        line.textContent = 'woda 0 ml · z posiłków 0 ml';
        copy.insertAdjacentElement('afterend', line);
      }
    }
  }

  function applyWaterBreakdown(water) {
    if (!water) return;
    latestWater = water;
    ensureHydrationUi();

    const card = byId('waterCard');
    if (!card) return;

    const plainWaterMl = Math.max(0, Math.round(Number(water.plainWaterMl ?? water.consumedMl ?? 0)));
    const mealFluidsMl = Math.max(0, Math.round(Number(water.mealFluidsMl || 0)));

    card.dataset.plainWaterMl = String(plainWaterMl);
    card.dataset.mealFluidsMl = String(mealFluidsMl);

    const breakdown = byId('waterBreakdown');
    if (breakdown) breakdown.textContent = `woda ${plainWaterMl} ml · z posiłków ${mealFluidsMl} ml`;
  }

  const baseApiForHydration = api;
  api = async function hydrationAwareApi(action, payload = {}, file = null) {
    const response = await baseApiForHydration(action, payload, file);
    if (action === 'dashboard' && response?.water) applyWaterBreakdown(response.water);
    return response;
  };

  function init() {
    ensureHydrationUi();
    if (latestWater) applyWaterBreakdown(latestWater);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
