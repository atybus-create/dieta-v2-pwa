(() => {
  'use strict';

  function embeddedBrowser() {
    const ua = String(navigator.userAgent || '');
    return /FBAN|FBAV|FB_IAB|Messenger|Instagram|TikTok|Line\/|; wv\)|\bwv\b/i.test(ua);
  }

  function ensureBrandStyles() {
    const styles = [
      ['brandRedesignStyles', './brand-redesign.css?v=20260820-brand2'],
      ['brandRedesignPolishStyles', './brand-redesign-polish.css?v=20260820-brand2']
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

  function bindPwaLoginSafety() {
    ensureBrandStyles();
    if (window.__AI_MONITOR_NATIVE__) return;
    if (embeddedBrowser()) return;

    const auth = document.getElementById('authScreen');
    const loginButton = document.getElementById('claimProfileBtn');
    const createButton = document.getElementById('createUserBtn');

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
