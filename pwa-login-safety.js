(() => {
  'use strict';

  function embeddedBrowser() {
    const ua = String(navigator.userAgent || '');
    return /FBAN|FBAV|FB_IAB|Messenger|Instagram|TikTok|Line\/|; wv\)|\bwv\b/i.test(ua);
  }

  function ensureBrandStyles() {
    const styles = [
      ['brandRedesignStyles', './brand-redesign.css?v=20260820-brand2'],
      ['brandRedesignPolishStyles', './brand-redesign-polish.css?v=20260820-brand2'],
      ['brandFunctionalFixes', './brand-functional-fixes.css?v=20260820-fix2']
    ];
    styles.forEach(([id, href]) => {
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
  }

  function ensureEditorPortal() {
    if (document.getElementById('editorPortalScript')) return;
    const script = document.createElement('script');
    script.id = 'editorPortalScript';
    script.src = './editor-portal.js?v=20260820-scroll1';
    script.async = false;
    document.head.appendChild(script);
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
    ensureBrandStyles();
    ensureEditorPortal();
    installRegressionFixes();

    const auth = document.getElementById('authScreen');
    const loginButton = document.getElementById('claimProfileBtn');
    const createButton = document.getElementById('createUserBtn');

    // Android ładuje moduły rozszerzeń po bazowym init(). Musimy ponownie
    // podpiąć finalne funkcje po ich opakowaniu (m.in. zgody/Regulamin).
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
