(() => {
  'use strict';

  const DEFAULT_WATER_ML = 2500;
  const SERVING_ML = 250;
  const STYLE_ID = 'water-module-styles';

  function byId(id) {
    return document.getElementById(id);
  }

  function injectStyles() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .water-card{margin-top:16px;padding:18px;border-radius:22px;border:1px solid rgba(74,174,255,.22);background:linear-gradient(145deg,rgba(13,36,49,.96),rgba(8,22,30,.96));box-shadow:0 18px 46px rgba(0,0,0,.22)}
      .water-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.water-title{display:flex;align-items:center;gap:11px}.water-drop{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:rgba(56,170,255,.12);color:#62c4ff;border:1px solid rgba(98,196,255,.2)}.water-drop svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.water-title strong{display:block;font-size:18px}.water-title small{display:block;margin-top:3px;color:#88a9ba;font-size:12px}.water-value{text-align:right}.water-value strong{display:block;font-size:20px;color:#dff5ff}.water-value small{display:block;margin-top:3px;color:#7f9daa;font-size:12px}
      .water-progress{height:10px;margin-top:16px;overflow:hidden;border-radius:999px;background:rgba(82,173,230,.12);box-shadow:inset 0 0 0 1px rgba(103,190,242,.08)}.water-progress>div{height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#2998ee,#6dd5ff);box-shadow:0 0 18px rgba(66,179,255,.42);transition:width .24s ease}
      .water-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;margin-top:14px}.water-add,.water-undo{min-height:50px;border-radius:15px;font:inherit;font-weight:850;cursor:pointer;-webkit-tap-highlight-color:transparent}.water-add{display:flex;align-items:center;justify-content:center;gap:10px;border:0;color:#06131b;background:linear-gradient(135deg,#69d6ff,#2fa7f4);box-shadow:0 10px 26px rgba(47,167,244,.2)}.water-add svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.water-undo{padding:0 17px;border:1px solid rgba(112,178,214,.18);color:#adc5d0;background:rgba(7,21,29,.62)}.water-add:disabled,.water-undo:disabled{opacity:.55;cursor:wait}
      .water-flash{animation:waterFlash .36s ease}@keyframes waterFlash{50%{transform:scale(1.015);box-shadow:0 0 0 3px rgba(70,181,255,.09),0 18px 46px rgba(0,0,0,.22)}}
      .water-goal-help{display:block;margin-top:5px;color:#7f9a9c;font-size:11px;font-weight:500;line-height:1.35}
      .goals-water-result{grid-column:1/-1!important;color:#bfeaff}.goals-water-result strong{color:#72cfff}
      @media(max-width:480px){.water-actions{grid-template-columns:1fr}.water-undo{min-height:44px}.water-head{align-items:center}}
    `;
    document.head.appendChild(style);
  }

  function makeWaterField(id, defaultValue) {
    const label = document.createElement('label');
    label.dataset.waterField = id;
    label.innerHTML = `
      Woda / dzień
      <div class="unit-input">
        <input id="${id}" type="number" min="500" max="10000" step="250" value="${defaultValue}">
        <span>ml</span>
      </div>
      <small class="water-goal-help">Tylko czysta woda. Inne napoje zapisuj jako posiłek.</small>
    `;
    return label;
  }

  function injectGoalFields() {
    const newGrid = document.querySelector('#newUserDetails .form-grid');
    if (newGrid && !byId('newWater')) {
      newGrid.appendChild(makeWaterField('newWater', DEFAULT_WATER_ML));
    }

    const profileGrid = document.querySelector('#viewProfile .goals-grid');
    if (profileGrid && !byId('setWater')) {
      profileGrid.appendChild(makeWaterField('setWater', DEFAULT_WATER_ML));
    }
  }

  function injectWaterCard() {
    if (byId('waterCard')) return;
    const macroGrid = document.querySelector('#viewToday .macro-grid');
    if (!macroGrid) return;

    const card = document.createElement('article');
    card.id = 'waterCard';
    card.className = 'water-card';
    card.innerHTML = `
      <div class="water-head">
        <div class="water-title">
          <span class="water-drop" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 3s5.5 6.4 5.5 10.5a5.5 5.5 0 1 1-11 0C6.5 9.4 12 3 12 3Z"/><path d="M9.5 15.2c.7 1.2 1.6 1.8 2.8 1.8"/></svg>
          </span>
          <div><strong>Woda</strong><small>Tylko czysta woda</small></div>
        </div>
        <div class="water-value"><strong><span id="waterConsumed">0</span> / <span id="waterTarget">2500</span> ml</strong><small id="waterRemaining">pozostało 2500 ml</small></div>
      </div>
      <div class="water-progress" role="progressbar" aria-label="Realizacja dziennego celu wody" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="waterBar"></div></div>
      <div class="water-actions">
        <button id="waterAddBtn" class="water-add" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10l-1 16H8L7 4Z"/><path d="M8 9h8"/><path d="M12 12v5M9.5 14.5h5"/></svg>
          <span>Szklanka +250 ml</span>
        </button>
        <button id="waterUndoBtn" class="water-undo" type="button">Cofnij</button>
      </div>
    `;
    macroGrid.insertAdjacentElement('afterend', card);
    byId('waterAddBtn').onclick = () => changeWater('water_add');
    byId('waterUndoBtn').onclick = () => changeWater('water_remove');
  }

  function renderWater(data) {
    injectWaterCard();
    const water = data?.water || {};
    const consumed = Math.max(0, Number(water.consumedMl || 0));
    const target = Math.max(1, Number(water.targetMl || data?.targets?.waterMl || DEFAULT_WATER_ML));
    const remaining = Math.max(0, Number(water.remainingMl ?? target - consumed));
    const pct = Math.max(0, Math.min(100, (consumed / target) * 100));

    if (byId('waterConsumed')) byId('waterConsumed').textContent = Math.round(consumed);
    if (byId('waterTarget')) byId('waterTarget').textContent = Math.round(target);
    if (byId('waterRemaining')) byId('waterRemaining').textContent = remaining > 0 ? `pozostało ${Math.round(remaining)} ml` : 'cel osiągnięty';
    if (byId('waterBar')) byId('waterBar').style.width = `${pct}%`;
    const progress = byId('waterCard')?.querySelector('.water-progress');
    if (progress) progress.setAttribute('aria-valuenow', String(Math.round(pct)));
    if (byId('waterUndoBtn')) byId('waterUndoBtn').disabled = consumed <= 0;
  }

  async function changeWater(action) {
    const add = byId('waterAddBtn');
    const undo = byId('waterUndoBtn');
    if (!state?.token) return;
    if (add) add.disabled = true;
    if (undo) undo.disabled = true;
    try {
      const result = await api(action);
      if (typeof toast === 'function') {
        toast(action === 'water_add' ? '+250 ml wody' : (Number(result?.removedMl || 0) > 0 ? 'Cofnięto 250 ml' : 'Nie ma czego cofnąć'));
      }
      const dashboard = await api('dashboard');
      renderWater(dashboard);
      const card = byId('waterCard');
      if (card) {
        card.classList.remove('water-flash');
        void card.offsetWidth;
        card.classList.add('water-flash');
      }
    } catch (error) {
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się zaktualizować wody.');
    } finally {
      if (add) add.disabled = false;
      const consumed = Number(byId('waterConsumed')?.textContent || 0);
      if (undo) undo.disabled = consumed <= 0;
    }
  }

  function patchTransport() {
    const basePost = post;
    post = async function waterAwarePost(url, payload = {}, file = null) {
      let nextPayload = payload;
      if (url === API && payload?.action === 'user_create' && (payload.dailyWaterTargetMl === undefined || payload.dailyWaterTargetMl === '')) {
        nextPayload = { ...payload, dailyWaterTargetMl: byId('newWater')?.value || DEFAULT_WATER_ML };
      }
      return basePost(url, nextPayload, file);
    };

    const baseApi = api;
    api = async function waterAwareApi(action, payload = {}, file = null) {
      let nextPayload = payload;
      if (action === 'settings_update' && (payload.dailyWaterTargetMl === undefined || payload.dailyWaterTargetMl === '')) {
        nextPayload = { ...payload, dailyWaterTargetMl: byId('setWater')?.value || DEFAULT_WATER_ML };
      }
      const data = await baseApi(action, nextPayload, file);
      if (action === 'dashboard') renderWater(data);
      if (action === 'settings_get') {
        const target = Number(data?.settings?.dailyWaterTargetMl || DEFAULT_WATER_ML);
        if (byId('setWater')) byId('setWater').value = target;
      }
      return data;
    };
  }

  function patchGoalsCalculator() {
    const resultGrid = document.querySelector('#goalsCalcResult .goals-result-macros');
    if (resultGrid && !byId('gcWater')) {
      const item = document.createElement('div');
      item.className = 'goals-water-result';
      item.innerHTML = '<span>Czysta woda</span><strong id="gcWater">0 ml</strong>';
      resultGrid.appendChild(item);
    }

    const run = byId('goalsCalcRun');
    if (run && !run.dataset.waterWrapped) {
      const original = run.onclick;
      run.onclick = async function(event) {
        const value = original ? await original.call(this, event) : undefined;
        const waterMl = Number(window.__goalsCalcResult?.waterMl || 0);
        if (byId('gcWater')) byId('gcWater').textContent = `${waterMl} ml`;
        return value;
      };
      run.dataset.waterWrapped = '1';
    }

    const use = byId('goalsCalcUse');
    if (use && !use.dataset.waterWrapped) {
      const original = use.onclick;
      use.onclick = function(event) {
        const waterMl = Number(window.__goalsCalcResult?.waterMl || DEFAULT_WATER_ML);
        const profileVisible = document.querySelector('#viewProfile')?.classList.contains('active');
        const target = profileVisible ? byId('setWater') : byId('newWater');
        if (target) target.value = waterMl;
        return original ? original.call(this, event) : undefined;
      };
      use.dataset.waterWrapped = '1';
    }
  }

  function initWaterModule() {
    injectStyles();
    injectGoalFields();
    injectWaterCard();
    patchTransport();
    patchGoalsCalculator();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWaterModule, { once: true });
  } else {
    initWaterModule();
  }
})();
