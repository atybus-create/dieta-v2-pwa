(() => {
  'use strict';

  function embeddedBrowser() {
    const ua = String(navigator.userAgent || '');
    return /FBAN|FBAV|FB_IAB|Messenger|Instagram|TikTok|Line\/|; wv\)|\bwv\b/i.test(ua);
  }

  function bindPwaLoginSafety() {
    if (window.__AI_MONITOR_NATIVE__) return;
    if (embeddedBrowser()) return;

    const auth = document.getElementById('authScreen');
    const loginButton = document.getElementById('claimProfileBtn');
    const createButton = document.getElementById('createUserBtn');

    // Regular browser and installed PWA must always keep the authentication
    // controls usable. Installation remains optional outside embedded browsers.
    auth?.classList.remove('install-only');

    if (loginButton && typeof claimProfile === 'function') {
      loginButton.onclick = () => claimProfile();
    }

    if (createButton && typeof createUser === 'function') {
      createButton.onclick = () => createUser();
    }
  }

  async function loadBrandRedesign() {
    try {
      const response = await fetch('./brand-redesign.js?v=20260820-brand1', { cache: 'no-store' });
      if (!response.ok) throw new Error('Nie udało się pobrać brand-redesign.js');
      const code = await response.text();
      (0, eval)(code);
    } catch (error) {
      console.error('Dieta V2 brand redesign failed:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bindPwaLoginSafety();
      loadBrandRedesign();
    }, { once: true });
  } else {
    bindPwaLoginSafety();
    loadBrandRedesign();
  }
})();
