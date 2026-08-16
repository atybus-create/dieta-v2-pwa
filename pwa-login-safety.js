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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPwaLoginSafety, { once: true });
  } else {
    bindPwaLoginSafety();
  }
})();
