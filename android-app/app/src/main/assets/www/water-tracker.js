(() => {
  'use strict';

  const STYLE_ID = 'waterTrackerStyles';

  function el(id) {
    return document.getElementById(id);
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function injectStyles() {
    if (el(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .water-card{
        position:relative;
        overflow:hidden;
        margin-top:16px;
        padding:20px;
        border:1px solid rgba(82,181,255,.24);
        border-radius:24px;
        background:linear-gradient(145deg,rgba(10,35,49,.96),rgba(7,23,33,.96));
        box-shadow:0 18px 50px rgba(0,0,0,.22);
      }
      .water-card::after{
        content:"";
        position:absolute;
        width:190px;
        height:190px;
        right:-70px;
        top:-95px;
        border-radius:50%;
        background:radial-gradient(circle,rgba(67,182,255,.18),transparent 67%);
        pointer-events:none;
      }
      .water-head{display:flex;align-items:center;justify-content:space-between;gap:14px;position:relative;z-index:1}
      .water-heading{display:flex;align-items:center;gap:13px;min-width:0}
      .water-icon{
        width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;
        border-radius:16px;background:rgba(56,167,255,.11);border:1px solid rgba(81,183,255,.22);color:#62c7ff
      }
      .water-icon svg{width:27px;height:27px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .water-title{font-size:17px;font-weight:900;color:#edf8ff}.water-sub{margin-top:3px;font-size:12px;color:#86aaba}
      .water-value{text-align:right;white-space:nowrap}.water-value strong{display:block;font-size:22px;color:#edf8ff}.water-value span{font-size:12px;color:#8caebb}
      .water-progress{height:11px;margin:18px 0 10px;overflow:hidden;border-radius:999px;background:rgba(92,160,190,.12);border:1px solid rgba(90,173,209,.10)}
      .water-progress-fill{height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#247bd9,#38c7ff);box-shadow:0 0 18px rgba(56,199,255,.34);transition:width .25s ease}
      .water-progress-copy{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#8caebb}
      .water-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;margin-top:15px}
      .water-add,.water-undo{min-height:48px;border-radius:15px;font:inherit;font-weight:850;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .water-add{display:flex;align-items:center;justify-content:center;gap:9px;border:0;color:#05131a;background:linear-gradient(135deg,#66d5ff,#2a9df4);box-shadow:0 12px 26px rgba(42,157,244,.16)}
      .water-add svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .water-undo{padding:0 16px;border:1px solid rgba(102,197,240,.18);color:#a9c8d5;background:rgba(10,28,37,.72)}
      .water-add:disabled,.water-undo:disabled{opacity:.55;cursor:default}
      .water-pop{animation:waterPop .28s ease}
      @keyframes waterPop{0%{transform:scale(.98)}55%{transform:scale(1.015)}100%{transform:scale(1)}}
      @media(max-width:430px){.water-actions{grid-template-columns:1fr}.water-undo{min-height:44px}.water-head{align-items:flex-start}.water-value strong{font-size:20px}}
    `;
    document.head.appendChild(style);
  }

  function ensureWaterFields() {
    if (!el('newWater')) {
      const newGrid = document.querySelector('#newUserDetails .form-grid');
      if (newGrid) {
        const label = document.createElement('label');
        label.innerHTML = `
          Woda / dzień
          <div class="unit-input">
            <input id="newWater" type="number" min="500" max="10000" step="250" value="2500" inputmode="numeric">
            <span>ml</span>
          </div>
        `;
        newGrid.appendChild(label);
      }
    }

    if (!el('setWater')) {
      const profileGrid = document.querySelector('#viewProfile .goals-grid');
      if (profileGrid) {
        const label = document.createElement('label');
        label.innerHTML = `
          Woda
          <div class="unit-input">
            <input id="setWater" type="number" min="500" max="10000" step="250" inputmode="numeric">
            <span>ml</span>
          </div>
        `;
        profileGrid.appendChild(label);
      }
    }
  }

  function ensureWaterCard() {
    if (el('waterCard')) return;
    const macroGrid = document.querySelector('#viewToday .macro-grid');
    if (!macroGrid) return;

    const card = document.createElement('article');
    card.id = 'waterCard';
    card.className = 'water-card';
    card.innerHTML = `
      <div class="water-head">
        <div class="water-heading">
          <span class="water-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M7 4h10l-1 16H8L7 4Z"/><path d="M8 9c2 .9 3.5.9 5.2 0 1.2-.6 2.1-.6 3.3 0"/></svg>
          </span>
          <div>
            <div class="water-title">Woda</div>
            <div class="water-sub">Liczymy wyłącznie czystą wodę</div>
          </div>
        </div>
        <div class="water-value">
          <strong id="waterConsumed">0 ml</strong>
          <span id="waterTarget">cel 2500 ml</span>
        </div>
      </div>
      <div class="water-progress" aria-label="Realizacja dziennego celu wody"><div id="waterBar" class="water-progress-fill"></div></div>
      <div class="water-progress-copy"><span id="waterPercent">0% celu</span><span id="waterRemaining">pozostało 2500 ml</span></div>
      <div class="water-actions">
        <button id="waterAddBtn" class="water-add" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10l-1 16H8L7 4Z"/><path d="M8 9c2 .9 3.5.9 5.2 0 1.2-.6 2.1-.6 3.3 0"/></svg>
          Szklanka wody +250 ml
        </button>
        <button id="waterUndoBtn" class="water-undo" type="button">Cofnij 250 ml</button>
      </div>
    `;
    macroGrid.insertAdjacentElement('afterend', card);
    el('waterAddBtn').onclick = addWater;
    el('waterUndoBtn').onclick = undoWater;
  }

  function renderWater(data) {
    ensureWaterCard();
    const water = data?.water || {};
    const consumed = Math.max(0, Math.round(Number(water.consumedMl || 0)));
    const target = Math.max(0, Math.round(Number(water.targetMl || 2500)));
    const remaining = Math.max(0, Math.round(Number(water.remainingMl ?? (target - consumed))));
    const percent = target > 0 ? Math.max(0, Math.round((consumed / target) * 100)) : 0;
    const visualPercent = Math.min(100, percent);

    if (el('waterConsumed')) el('waterConsumed').textContent = `${consumed} ml`;
    if (el('waterTarget')) el('waterTarget').textContent = `cel ${target} ml`;
    if (el('waterPercent')) el('waterPercent').textContent = `${percent}% celu`;
    if (el('waterRemaining')) el('waterRemaining').textContent = `pozostało ${remaining} ml`;
    if (el('waterBar')) el('waterBar').style.width = `${visualPercent}%`;
    if (el('waterUndoBtn')) el('waterUndoBtn').disabled = consumed < 250;
  }

  async function addWater() {
    const add = el('waterAddBtn');
    const undo = el('waterUndoBtn');
    if (add) add.disabled = true;
    if (undo) undo.disabled = true;
    try {
      await api('water_add');
      const card = el('waterCard');
      card?.classList.remove('water-pop');
      void card?.offsetWidth;
      card?.classList.add('water-pop');
      if (typeof toast === 'function') toast('+250 ml wody');
      await loadDashboard();
    } catch (error) {
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się dodać wody.');
    } finally {
      if (add) add.disabled = false;
    }
  }

  async function undoWater() {
    const add = el('waterAddBtn');
    const undo = el('waterUndoBtn');
    if (add) add.disabled = true;
    if (undo) undo.disabled = true;
    try {
      const response = await api('water_remove');
      if (typeof toast === 'function') {
        toast(Number(response?.removedMl || 0) > 0 ? 'Cofnięto 250 ml wody' : 'Brak wpisu wody do cofnięcia');
      }
      await loadDashboard();
    } catch (error) {
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się cofnąć wody.');
    }
  }

  const baseLoadDashboard = loadDashboard;
  loadDashboard = async function waterAwareLoadDashboard() {
    await baseLoadDashboard();
    try {
      const data = await api('dashboard');
      renderWater(data);
    } catch (_) {
      // Rdzeń obsługuje swój błąd; moduł wody nie powinien blokować pulpitu.
    }
  };

  const baseLoadSettings = loadSettings;
  loadSettings = async function waterAwareLoadSettings() {
    await baseLoadSettings();
    try {
      const data = await api('settings_get');
      if (el('setWater')) el('setWater').value = data?.settings?.dailyWaterTargetMl ?? 2500;
    } catch (_) {}
  };

  saveSettings = async function waterAwareSaveSettings() {
    loading(true, 'Zapisuję ustawienia…', 'Aktualizuję dzienne cele.');
    try {
      await api('settings_update', {
        dailyCalorieTarget: el('setCalories').value,
        dailyProteinTarget: el('setProtein').value,
        dailyCarbsTarget: el('setCarbs').value,
        dailyFatTarget: el('setFat').value,
        dailyWaterTargetMl: el('setWater')?.value || 2500
      });
      if (typeof toast === 'function') toast('Zmiany zapisane');
      await loadSettings();
    } catch (error) {
      if (typeof toast === 'function') toast(error?.message || 'Nie udało się zapisać ustawień.');
    } finally {
      loading(false);
    }
  };

  createUser = async function waterAwareCreateUser() {
    hide('authError');
    const displayName = el('newName')?.value.trim() || '';
    const email = el('newEmail')?.value.trim().toLowerCase() || '';
    const accessPin = el('newPin')?.value.trim() || '';
    const water = Number(el('newWater')?.value || 0);

    if (displayName.length < 2) {
      el('authError').textContent = 'Podaj imię lub nazwę użytkownika.';
      show('authError');
      return;
    }
    if (!validEmail(email)) {
      el('authError').textContent = 'Podaj poprawny adres e-mail.';
      show('authError');
      return;
    }
    if (!/^\d{4,8}$/.test(accessPin)) {
      el('authError').textContent = 'PIN musi mieć 4–8 cyfr.';
      show('authError');
      return;
    }
    if (!Number.isFinite(water) || water < 500 || water > 10000) {
      el('authError').textContent = 'Podaj dzienny cel wody od 500 do 10000 ml.';
      show('authError');
      return;
    }

    const payload = {
      action: 'user_create',
      displayName,
      email,
      accessPin,
      dailyCalorieTarget: el('newCalories').value,
      dailyProteinTarget: el('newProtein').value,
      dailyCarbsTarget: el('newCarbs').value,
      dailyFatTarget: el('newFat').value,
      dailyWaterTargetMl: el('newWater').value
    };

    loading(true, 'Tworzę profil…', 'Zapisuję profil, adres odzyskiwania i cele dzienne.');
    try {
      const created = await post(API, payload);
      const userId = created.user?.userId;
      if (!userId) throw new Error('Nie udało się utworzyć profilu.');
      const auth = await post(AUTH, { login: userId, accessPin });
      rememberSession(auth.accessToken, userId, created.user?.displayName || displayName);
      await enterApp();
    } catch (error) {
      el('authError').textContent = error?.message || 'Nie udało się utworzyć profilu.';
      show('authError');
    } finally {
      loading(false);
    }
  };

  function bindGoalCalculator() {
    const use = el('goalsCalcUse');
    if (!use || use.dataset.waterBound === '1') return;
    use.dataset.waterBound = '1';
    use.addEventListener('click', () => {
      const water = Number(window.__goalsCalcResult?.waterMl || 0);
      if (!water) return;
      const target = document.querySelector('#viewProfile.active') ? el('setWater') : el('newWater');
      if (target) target.value = water;
    });
  }

  function bindHandlers() {
    injectStyles();
    ensureWaterFields();
    ensureWaterCard();
    bindGoalCalculator();
    if (el('createUserBtn')) el('createUserBtn').onclick = createUser;
    if (el('saveSettingsBtn')) el('saveSettingsBtn').onclick = saveSettings;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindHandlers, { once: true });
  else bindHandlers();
})();
