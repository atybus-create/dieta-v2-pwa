(() => {
  'use strict';

  function embeddedBrowser() {
    const ua = String(navigator.userAgent || '');
    return /FBAN|FBAV|FB_IAB|Messenger|Instagram|TikTok|Line\/|; wv\)|\bwv\b/i.test(ua);
  }

  function installRegressionFixes() {
    if (window.__WCZAI_REGRESSION_FIXES__) return;
    window.__WCZAI_REGRESSION_FIXES__ = true;

    let calorieOpenedAt = -Infinity;

    document.addEventListener('pointerup', event => {
      const calorie = event.target?.closest?.('#viewToday .calorie-card');
      if (!calorie || calorie.classList.contains('dashboard-panel-expanded')) return;
      calorieOpenedAt = performance.now();
    }, true);

    document.addEventListener('click', event => {
      if (event.target?.id !== 'dashboardExpandBackdrop') return;
      if ((performance.now() - calorieOpenedAt) > 700) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function bindPwaLoginSafety() {
    installRegressionFixes();

    const auth = document.getElementById('authScreen');
    const loginButton = document.getElementById('claimProfileBtn');
    const createButton = document.getElementById('createUserBtn');

    if (window.__AI_MONITOR_NATIVE__) {
      if (loginButton && typeof claimProfile === 'function') {
        loginButton.onclick = () => claimProfile();
      }
      if (createButton && typeof createUser === 'function') {
        createButton.onclick = () => createUser();
      }
      return;
    }

    if (embeddedBrowser()) return;

    auth?.classList.remove('install-only');

    if (loginButton && typeof claimProfile === 'function') {
      loginButton.onclick = () => claimProfile();
    }

    if (createButton && typeof createUser === 'function') {
      createButton.onclick = () => createUser();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPwaLoginSafety, { once: true });
  } else {
    bindPwaLoginSafety();
  }
})();
