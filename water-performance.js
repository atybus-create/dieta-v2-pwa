(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  let dashboardCache = null;
  let dashboardCacheAt = 0;
  let waterBusy = false;

  // Cache only the immediately repeated dashboard request created by the
  // compatibility layer. The first request still goes to n8n and remains the
  // source of truth; a duplicate request within 1500 ms reuses its response.
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
    const consumed = Number(String(byId('waterConsumed')?.textContent || '0').replace(/[^0-9.-]/g, '')) || 0;
    const target = Number(String(byId('waterTarget')?.textContent || '2500').replace(/[^0-9.-]/g, '')) || 2500;
    return { consumed: Math.max(0, consumed), target: Math.max(0, target) };
  }

  function paintWater(consumed, target) {
    const safeConsumed = Math.max(0, Math.round(Number(consumed) || 0));
    const safeTarget = Math.max(0, Math.round(Number(target) || 0));
    const remaining = Math.max(0, safeTarget - safeConsumed);
    const percent = safeTarget > 0 ? Math.max(0, Math.round((safeConsumed / safeTarget) * 100)) : 0;
    const visualPercent = Math.min(100, percent);

    if (byId('waterConsumed')) byId('waterConsumed').textContent = `${safeConsumed} ml`;
    if (byId('waterTarget')) byId('waterTarget').textContent = `cel ${safeTarget} ml`;
    if (byId('waterPercent')) byId('waterPercent').textContent = `${percent}% celu`;
    if (byId('waterRemaining')) byId('waterRemaining').textContent = `pozostało ${remaining} ml`;
    if (byId('waterBar')) byId('waterBar').style.width = `${visualPercent}%`;
    if (byId('waterUndoBtn')) byId('waterUndoBtn').disabled = waterBusy || safeConsumed < 250;
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

    // Immediate visual response. Backend confirmation happens in background.
    paintWater(before.consumed + 250, before.target);
    animateCard();
    if (typeof toast === 'function') toast('+250 ml wody');

    try {
      await api('water_add');
      dashboardCache = null;
      dashboardCacheAt = 0;
    } catch (error) {
      paintWater(before.consumed, before.target);
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się dodać wody.');
    } finally {
      waterBusy = false;
      const current = readWaterUi();
      paintWater(current.consumed, current.target);
    }
  }

  async function fastUndoWater() {
    if (waterBusy) return;
    const before = readWaterUi();
    if (before.consumed < 250) {
      if (typeof toast === 'function') toast('Brak wpisu wody do cofnięcia');
      return;
    }

    waterBusy = true;
    paintWater(before.consumed - 250, before.target);
    animateCard();
    if (typeof toast === 'function') toast('Cofnięto 250 ml wody');

    try {
      const response = await api('water_remove');
      if (Number(response?.removedMl || 0) <= 0) {
        paintWater(before.consumed, before.target);
        if (typeof toast === 'function') toast('Brak wpisu wody do cofnięcia');
      }
      dashboardCache = null;
      dashboardCacheAt = 0;
    } catch (error) {
      paintWater(before.consumed, before.target);
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się cofnąć wody.');
    } finally {
      waterBusy = false;
      const current = readWaterUi();
      paintWater(current.consumed, current.target);
    }
  }

  function bindFastWaterButtons() {
    const add = byId('waterAddBtn');
    const undo = byId('waterUndoBtn');
    if (add) add.onclick = fastAddWater;
    if (undo) undo.onclick = fastUndoWater;
  }

  // Water card already exists after water-tracker.js initialization. Rebind now
  // and also after dashboard navigation in case DOM is recreated in the future.
  const baseLoadDashboardForWaterPerformance = loadDashboard;
  loadDashboard = async function fastWaterDashboard() {
    const result = await baseLoadDashboardForWaterPerformance();
    bindFastWaterButtons();
    return result;
  };

  function init() {
    bindFastWaterButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
