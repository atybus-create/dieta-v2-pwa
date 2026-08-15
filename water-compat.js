(() => {
  'use strict';

  const DEFAULT_WATER_ML = 2500;
  const byId = id => document.getElementById(id);

  function patchApi() {
    if (window.__waterApiPatched) return;
    window.__waterApiPatched = true;

    const baseApi = api;
    api = async function waterCompatibleApi(action, payload = {}, file = null) {
      let nextPayload = payload;
      if (action === 'settings_update' && (payload.dailyWaterTargetMl === undefined || payload.dailyWaterTargetMl === '')) {
        nextPayload = {
          ...payload,
          dailyWaterTargetMl: byId('setWater')?.value || DEFAULT_WATER_ML
        };
      }
      return baseApi(action, nextPayload, file);
    };
  }

  function enhanceGoalsResult() {
    const grid = document.querySelector('#goalsCalcResult .goals-result-macros');
    if (grid && !byId('gcWater')) {
      const item = document.createElement('div');
      item.style.gridColumn = '1 / -1';
      item.innerHTML = '<span>Czysta woda</span><strong id="gcWater">0 ml</strong>';
      grid.appendChild(item);
    }

    const run = byId('goalsCalcRun');
    if (run && run.dataset.waterResultWrapped !== '1') {
      const original = run.onclick;
      run.onclick = async function(event) {
        const result = original ? await original.call(this, event) : undefined;
        const waterMl = Number(window.__goalsCalcResult?.waterMl || 0);
        if (byId('gcWater')) byId('gcWater').textContent = `${waterMl} ml`;
        return result;
      };
      run.dataset.waterResultWrapped = '1';
    }
  }

  function init() {
    patchApi();
    enhanceGoalsResult();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
