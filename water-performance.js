(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  let dashboardCache = null;
  let dashboardCacheAt = 0;
  let waterBusy = false;

  const baseApiForWaterPerformance = api;
  api = async function waterPerformanceApi(action, payload = {}, file = null) {
    if (action === 'dashboard' && !file && dashboardCache && (Date.now() - dashboardCacheAt) < 1500) {
      return dashboardCache;
    }

    const response = await baseApiForWaterPerformance(action, payload, file);
    if (action === 'dashboard' && response?.success) {
      dashboardCache = response;
      dashboardCacheAt = Date.now();
    }
    return response;
  };

  function readWaterUi() {
    const card = byId('waterCard');
    const consumed = Number(String(byId('waterConsumed')?.textContent || '0').replace(/[^0-9.-]/g, '')) || 0;
    const target = Number(String(byId('waterTarget')?.textContent || '2500').replace(/[^0-9.-]/g, '')) || 2500;
    const meal = Number(card?.dataset?.mealFluidsMl || 0) || 0;
    const plainFromDataset = Number(card?.dataset?.plainWaterMl);
    const plain = Number.isFinite(plainFromDataset) ? plainFromDataset : Math.max(0, consumed - meal);
    return { consumed: Math.max(0, consumed), target: Math.max(0, target), plain: Math.max(0, plain), meal: Math.max(0, meal) };
  }

  function paintWater(consumed, target, plain, meal) {
    const safeConsumed = Math.max(0, Math.round(Number(consumed) || 0));
    const safeTarget = Math.max(0, Math.round(Number(target) || 0));
    const safePlain = Math.max(0, Math.round(Number(plain) || 0));
    const safeMeal = Math.max(0, Math.round(Number(meal) || 0));
    const remaining = Math.max(0, safeTarget - safeConsumed);
    const percent = safeTarget > 0 ? Math.max(0, Math.round((safeConsumed / safeTarget) * 100)) : 0;
    const visualPercent = Math.min(100, percent);
    const card = byId('waterCard');

    if (card) {
      card.dataset.plainWaterMl = String(safePlain);
      card.dataset.mealFluidsMl = String(safeMeal);
    }
    if (byId('waterConsumed')) byId('waterConsumed').textContent = `${safeConsumed} ml`;
    if (byId('waterTarget')) byId('waterTarget').textContent = `cel ${safeTarget} ml`;
    if (byId('waterPercent')) byId('waterPercent').textContent = `${percent}% celu`;
    if (byId('waterRemaining')) byId('waterRemaining').textContent = `pozostało ${remaining} ml`;
    if (byId('waterBar')) byId('waterBar').style.width = `${visualPercent}%`;
    if (byId('waterBreakdown')) byId('waterBreakdown').textContent = `woda ${safePlain} ml · z posiłków ${safeMeal} ml`;
    if (byId('waterUndoBtn')) byId('waterUndoBtn').disabled = waterBusy || safePlain < 250;
    if (byId('waterAddBtn')) byId('waterAddBtn').disabled = waterBusy;
  }

  function animateCard() {
    const card = byId('waterCard');
    card?.classList.remove('water-pop');
    void card?.offsetWidth;
    card?.classList.add('water-pop');
  }

  async function fastAddWater() {
    if (waterBusy) return;
    const before = readWaterUi();
    waterBusy = true;
    paintWater(before.consumed + 250, before.target, before.plain + 250, before.meal);
    animateCard();
    if (typeof toast === 'function') toast('+250 ml wody');

    try {
      await api('water_add');
      dashboardCache = null;
      dashboardCacheAt = 0;
    } catch (error) {
      paintWater(before.consumed, before.target, before.plain, before.meal);
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się dodać wody.');
    } finally {
      waterBusy = false;
      const current = readWaterUi();
      paintWater(current.consumed, current.target, current.plain, current.meal);
    }
  }

  async function fastUndoWater() {
    if (waterBusy) return;
    const before = readWaterUi();
    if (before.plain < 250) {
      if (typeof toast === 'function') toast('Brak wpisu wody do cofnięcia');
      return;
    }

    waterBusy = true;
    paintWater(before.consumed - 250, before.target, before.plain - 250, before.meal);
    animateCard();
    if (typeof toast === 'function') toast('Cofnięto 250 ml wody');

    try {
      const response = await api('water_remove');
      if (Number(response?.removedMl || 0) <= 0) {
        paintWater(before.consumed, before.target, before.plain, before.meal);
        if (typeof toast === 'function') toast('Brak wpisu wody do cofnięcia');
      }
      dashboardCache = null;
      dashboardCacheAt = 0;
    } catch (error) {
      paintWater(before.consumed, before.target, before.plain, before.meal);
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się cofnąć wody.');
    } finally {
      waterBusy = false;
      const current = readWaterUi();
      paintWater(current.consumed, current.target, current.plain, current.meal);
    }
  }

  function bindFastWaterButtons() {
    const add = byId('waterAddBtn');
    const undo = byId('waterUndoBtn');
    if (add) add.onclick = fastAddWater;
    if (undo) undo.onclick = fastUndoWater;
  }

  const baseLoadDashboardForWaterPerformance = loadDashboard;
  loadDashboard = async function fastWaterDashboard() {
    const result = await baseLoadDashboardForWaterPerformance();
    bindFastWaterButtons();
    return result;
  };

  function init() {
    bindFastWaterButtons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
