(() => {
  'use strict';

  const THEME_KEY_PREFIX = 'dietaV2Theme:';
  const VALID = new Set(['dark', 'light']);
  let currentTheme = 'dark';
  let saving = false;

  function profileId() {
    return String(state?.profile?.userId || '').trim();
  }

  function storageKey() {
    const id = profileId();
    return id ? `${THEME_KEY_PREFIX}${id}` : '';
  }

  function localTheme() {
    const key = storageKey();
    if (!key) return 'dark';
    const value = String(localStorage.getItem(key) || '').toLowerCase();
    return VALID.has(value) ? value : 'dark';
  }

  function rememberLocal(theme) {
    const key = storageKey();
    if (key && VALID.has(theme)) localStorage.setItem(key, theme);
  }

  function setMetaColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#fbfaf7' : '#071014');
  }

  function applyTheme(theme, { remember = true } = {}) {
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
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      const active = button.dataset.themeChoice === currentTheme;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function ensureUi() {
    if (document.getElementById('themePanel')) return;
    const profile = document.getElementById('viewProfile');
    const goals = profile?.querySelector('.goals-panel');
    if (!profile || !goals) return;

    const panel = document.createElement('div');
    panel.id = 'themePanel';
    panel.className = 'panel glass-card theme-panel';
    panel.innerHTML = `
      <div class="panel-heading compact">
        <span class="panel-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg>
        </span>
        <div>
          <h3>Motyw aplikacji</h3>
          <p>Wybierz wygląd używany po zalogowaniu. Ustawienie jest przypisane do Twojego profilu.</p>
        </div>
      </div>
      <div class="theme-choice-grid" role="group" aria-label="Motyw aplikacji">
        <button class="theme-choice" type="button" data-theme-choice="dark" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>
          <span>Motyw ciemny</span>
        </button>
        <button class="theme-choice" type="button" data-theme-choice="light" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.41M17.66 6.34l1.41-1.41"/></svg>
          <span>Motyw jasny</span>
        </button>
      </div>`;
    goals.insertAdjacentElement('beforebegin', panel);

    panel.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.addEventListener('click', () => changeTheme(button.dataset.themeChoice));
    });
    updateButtons();
  }

  async function syncTheme() {
    if (!state?.token || !profileId()) {
      forceAuthDark();
      return;
    }

    applyTheme(localTheme(), { remember: false });
    try {
      const data = await api('theme_get');
      const serverTheme = VALID.has(data?.uiTheme) ? data.uiTheme : 'dark';
      applyTheme(serverTheme);
    } catch (error) {
      console.warn('Nie udało się zsynchronizować motywu:', error);
    }
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
  clearSession = function themeAwareClearSession(...args) {
    const result = baseClearSession(...args);
    forceAuthDark();
    return result;
  };

  const baseLoadSettings = loadSettings;
  loadSettings = async function themeAwareLoadSettings(...args) {
    const result = await baseLoadSettings(...args);
    ensureUi();
    return result;
  };

  function initThemeModule() {
    ensureUi();
    if (state?.token && profileId()) applyTheme(localTheme(), { remember: false });
    else forceAuthDark();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initThemeModule, { once: true });
  else initThemeModule();
})();
