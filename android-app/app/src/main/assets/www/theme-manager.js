(() => {
  'use strict';

  const THEME_KEY_PREFIX = 'dietaV2Theme:';
  const VALID = new Set(['dark', 'light']);
  let currentTheme = 'dark';
  let saving = false;

  function ensureStyles() {
    if (document.getElementById('themeLightStyles')) return;
    const link = document.createElement('link');
    link.id = 'themeLightStyles';
    link.rel = 'stylesheet';
    link.href = './theme-light.css?v=20260815-theme1';
    document.head.appendChild(link);
  }

  function profileId() { return String(state?.profile?.userId || '').trim(); }
  function storageKey() { const id = profileId(); return id ? `${THEME_KEY_PREFIX}${id}` : ''; }
  function localTheme() { const key = storageKey(); if (!key) return 'dark'; const value = String(localStorage.getItem(key) || '').toLowerCase(); return VALID.has(value) ? value : 'dark'; }
  function rememberLocal(theme) { const key = storageKey(); if (key && VALID.has(theme)) localStorage.setItem(key, theme); }
  function setMetaColor(theme) { const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', theme === 'light' ? '#fbfaf7' : '#071014'); }

  function applyTheme(theme, { remember = true } = {}) {
    ensureStyles();
    const next = VALID.has(theme) ? theme : 'dark';
    currentTheme = next;
    const app = document.getElementById('app');
    if (app) app.dataset.theme = next;
    document.body.classList.toggle('theme-light-active', next === 'light' && !app?.classList.contains('hidden'));
    setMetaColor(next);
    if (remember) rememberLocal(next);
    updateButtons();
  }

  function forceAuthDark() {
    currentTheme = 'dark';
    const app = document.getElementById('app');
    if (app) app.dataset.theme = 'dark';
    document.body.classList.remove('theme-light-active');
    setMetaColor('dark');
    updateButtons();
  }

  function updateButtons() {
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', button.dataset.themeChoice === currentTheme ? 'true' : 'false'));
  }

  function ensureUi() {
    ensureStyles();
    if (document.getElementById('themePanel')) return;
    const profile = document.getElementById('viewProfile');
    const goals = profile?.querySelector('.goals-panel');
    if (!profile || !goals) return;
    const panel = document.createElement('div');
    panel.id = 'themePanel';
    panel.className = 'panel glass-card theme-panel';
    panel.innerHTML = `<div class="panel-heading compact"><span class="panel-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg></span><div><h3>Motyw aplikacji</h3><p>Wybierz wygląd używany po zalogowaniu. Ustawienie jest przypisane do Twojego profilu.</p></div></div><div class="theme-choice-grid" role="group" aria-label="Motyw aplikacji"><button class="theme-choice" type="button" data-theme-choice="dark" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg><span>Motyw ciemny</span></button><button class="theme-choice" type="button" data-theme-choice="light" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.41M17.66 6.34l1.41-1.41"/></svg><span>Motyw jasny</span></button></div>`;
    goals.insertAdjacentElement('beforebegin', panel);
    panel.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => changeTheme(button.dataset.themeChoice)));
    updateButtons();
  }

  async function syncTheme() {
    if (!state?.token || !profileId()) { forceAuthDark(); return; }
    applyTheme(localTheme(), { remember: false });
    try {
      const data = await api('theme_get');
      applyTheme(VALID.has(data?.uiTheme) ? data.uiTheme : 'dark');
    } catch (error) { console.warn('Nie udało się zsynchronizować motywu:', error); }
  }

  async function changeTheme(theme) {
    if (!VALID.has(theme) || saving || theme === currentTheme) return;
    const previous = currentTheme;
    applyTheme(theme);
    saving = true;
    document.querySelectorAll('[data-theme-choice]').forEach(b => b.disabled = true);
    try {
      await api('theme_update', { uiTheme: theme });
      toast(theme === 'light' ? 'Włączono motyw jasny' : 'Włączono motyw ciemny');
    } catch (error) {
      applyTheme(previous);
      toast(error?.message || 'Nie udało się zapisać motywu.');
    } finally {
      saving = false;
      document.querySelectorAll('[data-theme-choice]').forEach(b => b.disabled = false);
    }
  }

  const baseEnterApp = enterApp;
  enterApp = async function themeAwareEnterApp(...args) {
    if (state?.profile?.userId) applyTheme(localTheme(), { remember: false });
    const result = await baseEnterApp(...args);
    ensureUi();
    document.body.classList.toggle('theme-light-active', currentTheme === 'light');
    syncTheme();
    return result;
  };

  const baseClearSession = clearSession;
  clearSession = function themeAwareClearSession(...args) { const result = baseClearSession(...args); forceAuthDark(); return result; };

  const baseLoadSettings = loadSettings;
  loadSettings = async function themeAwareLoadSettings(...args) { const result = await baseLoadSettings(...args); ensureUi(); return result; };

  function initThemeModule() { ensureUi(); if (state?.token && profileId()) applyTheme(localTheme(), { remember: false }); else forceAuthDark(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initThemeModule, { once: true }); else initThemeModule();
})();

(() => {
  'use strict';

  const PROFILE_DELETE_API = API.replace(/\/dieta-v2$/, '/dieta-v2-profile-delete');
  let deleting = false;

  function setAuthError(message) {
    const error = document.getElementById('authError');
    if (!error) return;
    error.textContent = message;
    error.classList.remove('hidden');
  }

  function ensurePinConfirmation() {
    const pin = document.getElementById('newPin');
    if (!pin) return;

    if (!document.getElementById('newPinConfirm')) {
      const label = document.createElement('label');
      label.textContent = 'Powtórz PIN';
      const input = document.createElement('input');
      input.id = 'newPinConfirm';
      input.type = 'password';
      input.inputMode = 'numeric';
      input.maxLength = 8;
      input.autocomplete = 'new-password';
      input.placeholder = 'Powtórz 4–8 cyfr';
      label.appendChild(input);
      pin.closest('label')?.insertAdjacentElement('afterend', label);
    }

    const button = document.getElementById('createUserBtn');
    if (!button || button.dataset.pinConfirmGuard === '1') return;
    button.dataset.pinConfirmGuard = '1';
    button.addEventListener('click', event => {
      const first = String(document.getElementById('newPin')?.value || '').trim();
      const second = String(document.getElementById('newPinConfirm')?.value || '').trim();
      if (!/^\d{4,8}$/.test(second) || first !== second) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setAuthError('PIN-y nie są zgodne. Wprowadź ten sam PIN w obu polach.');
        document.getElementById('newPinConfirm')?.focus();
      }
    }, true);
  }

  function ensureDeleteStyles() {
    if (document.getElementById('profileDeleteStyles')) return;
    const style = document.createElement('style');
    style.id = 'profileDeleteStyles';
    style.textContent = `
      .profile-danger-panel{border-color:rgba(244,91,91,.28)!important}
      .profile-danger-panel h3{color:#ffb0b0}
      .profile-delete-btn{width:100%;border:1px solid rgba(244,91,91,.5);background:rgba(244,91,91,.1);color:#ffd0d0;border-radius:14px;padding:13px 16px;font:700 15px/1.2 system-ui,sans-serif;cursor:pointer}
      .profile-delete-btn:disabled{opacity:.55;cursor:wait}
      .profile-delete-modal{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:20px;background:rgba(2,8,11,.82);backdrop-filter:blur(8px)}
      .profile-delete-modal.hidden{display:none!important}
      .profile-delete-card{width:min(92vw,430px);border:1px solid rgba(244,91,91,.32);border-radius:20px;padding:22px;background:#0b171c;box-shadow:0 24px 80px rgba(0,0,0,.5)}
      .profile-delete-card h3{margin:0 0 10px;color:#ffd1d1}
      .profile-delete-card p{margin:0 0 16px;color:#c8d8da;line-height:1.5}
      .profile-delete-card label{display:grid;gap:7px;color:#dbe9e9;font-weight:700}
      .profile-delete-card input{width:100%;box-sizing:border-box;margin-top:4px}
      .profile-delete-error{margin-top:10px!important;color:#ff9d9d!important;font-weight:700}
      .profile-delete-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
      .profile-delete-cancel,.profile-delete-confirm{border-radius:13px;padding:12px 14px;font-weight:800;cursor:pointer}
      .profile-delete-cancel{border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#e6f2f1}
      .profile-delete-confirm{border:1px solid rgba(244,91,91,.6);background:#8e2f35;color:#fff}
      .profile-delete-confirm:disabled{opacity:.55;cursor:wait}
      #app[data-theme="light"] .profile-delete-card{background:#fffaf8;color:#24191a}
      #app[data-theme="light"] .profile-delete-card p{color:#5f4a4d}
      #app[data-theme="light"] .profile-delete-card label{color:#392629}
    `;
    document.head.appendChild(style);
  }

  function closeDeleteModal() {
    const modal = document.getElementById('profileDeleteModal');
    modal?.classList.add('hidden');
    document.body.classList.remove('modal-open');
    const pin = document.getElementById('profileDeletePin');
    if (pin) pin.value = '';
    const error = document.getElementById('profileDeleteError');
    if (error) {
      error.textContent = '';
      error.classList.add('hidden');
    }
  }

  function openDeleteModal() {
    const modal = document.getElementById('profileDeleteModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('profileDeletePin')?.focus(), 20);
  }

  async function deleteProfile() {
    if (deleting || !state?.token) return;
    const pin = String(document.getElementById('profileDeletePin')?.value || '').trim();
    const error = document.getElementById('profileDeleteError');
    if (!/^\d{4,8}$/.test(pin)) {
      if (error) {
        error.textContent = 'Wpisz poprawny PIN 4–8 cyfr.';
        error.classList.remove('hidden');
      }
      return;
    }

    deleting = true;
    const confirm = document.getElementById('profileDeleteConfirm');
    const launch = document.getElementById('deleteProfileBtn');
    if (confirm) confirm.disabled = true;
    if (launch) launch.disabled = true;
    loading(true, 'Usuwam profil…', 'Trwale usuwam profil i wszystkie powiązane dane.');

    const deletedUserId = String(state?.profile?.userId || '');
    try {
      await post(PROFILE_DELETE_API, { accessToken: state.token, accessPin: pin });
      if (deletedUserId) localStorage.removeItem(`dietaV2Theme:${deletedUserId}`);
      closeDeleteModal();
      clearSession();
      hide('app');
      document.getElementById('authScreen')?.classList.remove('install-only');
      show('authScreen');
      if (document.getElementById('profileLogin')) document.getElementById('profileLogin').value = '';
      if (document.getElementById('profilePin')) document.getElementById('profilePin').value = '';
      await loadProfiles();
      toast('Profil i wszystkie dane zostały usunięte.');
    } catch (err) {
      if (error) {
        error.textContent = err?.message || 'Nie udało się usunąć profilu.';
        error.classList.remove('hidden');
      }
    } finally {
      deleting = false;
      if (confirm) confirm.disabled = false;
      if (launch) launch.disabled = false;
      loading(false);
    }
  }

  function ensureDeleteUi() {
    ensureDeleteStyles();
    const themePanel = document.getElementById('themePanel');
    if (!themePanel || document.getElementById('profileDangerPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'profileDangerPanel';
    panel.className = 'panel glass-card profile-danger-panel';
    panel.innerHTML = `<div class="panel-heading compact"><div><h3>Usuń profil</h3><p>Trwale usuń profil oraz wszystkie powiązane dane z aplikacji.</p></div></div><button id="deleteProfileBtn" class="profile-delete-btn" type="button">Usuń profil</button>`;
    themePanel.insertAdjacentElement('afterend', panel);

    if (!document.getElementById('profileDeleteModal')) {
      const modal = document.createElement('div');
      modal.id = 'profileDeleteModal';
      modal.className = 'profile-delete-modal hidden';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'profileDeleteTitle');
      modal.innerHTML = `<div class="profile-delete-card"><h3 id="profileDeleteTitle">Usunąć profil?</h3><p>Ta operacja trwale usunie profil, historię posiłków, nawodnienie, ulubione, ustawienia i dane dostępu. Tej operacji nie można cofnąć.</p><label>Potwierdź PIN<input id="profileDeletePin" type="password" inputmode="numeric" maxlength="8" autocomplete="current-password" placeholder="Wpisz PIN"></label><p id="profileDeleteError" class="profile-delete-error hidden" role="alert"></p><div class="profile-delete-actions"><button id="profileDeleteCancel" class="profile-delete-cancel" type="button">Anuluj</button><button id="profileDeleteConfirm" class="profile-delete-confirm" type="button">Usuń wszystko</button></div></div>`;
      document.body.appendChild(modal);
      document.getElementById('profileDeleteCancel')?.addEventListener('click', closeDeleteModal);
      document.getElementById('profileDeleteConfirm')?.addEventListener('click', deleteProfile);
      modal.addEventListener('click', event => { if (event.target === modal && !deleting) closeDeleteModal(); });
    }

    document.getElementById('deleteProfileBtn')?.addEventListener('click', openDeleteModal);
  }

  function ensureAccountUi() {
    ensurePinConfirmation();
    ensureDeleteUi();
  }

  const baseEnterAppAccount = enterApp;
  enterApp = async function accountAwareEnterApp(...args) {
    const result = await baseEnterAppAccount(...args);
    ensureAccountUi();
    return result;
  };

  const baseLoadSettingsAccount = loadSettings;
  loadSettings = async function accountAwareLoadSettings(...args) {
    const result = await baseLoadSettingsAccount(...args);
    ensureAccountUi();
    return result;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureAccountUi, { once: true }); else ensureAccountUi();
})();
