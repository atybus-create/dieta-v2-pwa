(() => {
  let deferredInstallPrompt = null;

  function nativeApp() {
    const ua = String(navigator.userAgent || '');
    return window.__AI_MONITOR_NATIVE__ === true || /DietaV2Native\//i.test(ua);
  }

  function hideNativeInstallUi() {
    window.__AI_MONITOR_NATIVE__ = true;
    document.documentElement.classList.add('native-wrapper');
    ['installFirstBtn', 'installHint', 'installBtn'].forEach(id => {
      document.getElementById(id)?.remove();
    });
  }

  function standalone() {
    return (
      nativeApp() ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function embeddedBrowser() {
    if (nativeApp()) return false;
    const ua = String(navigator.userAgent || '');
    return /FBAN|FBAV|FB_IAB|Messenger|Instagram|TikTok|Line\/|; wv\)|\bwv\b/i.test(ua);
  }

  function setInstallMessage(message, embedded = false) {
    if (nativeApp()) {
      hideNativeInstallUi();
      return;
    }

    const hint = document.getElementById('installHint');
    if (hint) {
      hint.textContent = message;
      hint.classList.remove('hidden');
    }

    const button = document.getElementById('installFirstBtn');
    if (!button) return;

    const title = button.querySelector('strong');
    const subtitle = button.querySelector('small');

    if (embedded) {
      if (title) title.textContent = 'Otwórz w Chrome / przeglądarce';
      if (subtitle) {
        subtitle.textContent =
          'Użyj menu Messengera i wybierz otwarcie linku w Chrome lub domyślnej przeglądarce.';
      }
    } else {
      if (title) title.textContent = 'Zainstaluj aplikację';
      if (subtitle) {
        subtitle.textContent =
          'Jeśli instalacja nie pojawi się automatycznie, użyj menu przeglądarki.';
      }
    }
  }

  function showEmbeddedScreen() {
    if (nativeApp()) {
      hideNativeInstallUi();
      return;
    }

    const auth = document.getElementById('authScreen');
    const app = document.getElementById('app');
    const splash = document.getElementById('startSplash');

    auth?.classList.add('install-only');
    auth?.classList.remove('hidden');
    app?.classList.add('hidden');
    splash?.classList.add('hidden');

    setInstallMessage(
      'Ten link jest otwarty we wbudowanej przeglądarce Messengera. Otwórz menu i wybierz „Otwórz w Chrome” albo „Otwórz w przeglądarce”. Instalację wykonaj już w normalnej przeglądarce.',
      true
    );
  }

  async function continueInRegularBrowser() {
    const auth = document.getElementById('authScreen');
    const splash = document.getElementById('startSplash');

    auth?.classList.remove('install-only');
    auth?.classList.remove('hidden');
    setInstallMessage(
      'Możesz korzystać z aplikacji w przeglądarce. Aby zainstalować ją na ekranie głównym, użyj przycisku powyżej lub menu przeglądarki.'
    );

    try {
      if (typeof window.api === 'function') {
        await window.api('settings_get');
        if (typeof window.enterApp === 'function') {
          await window.enterApp();
          return;
        }
      }
    } catch (error) {
      // Brak aktywnej sesji w przeglądarce jest normalny.
    }

    try {
      if (typeof window.loadProfiles === 'function') {
        await window.loadProfiles();
      }
    } finally {
      splash?.classList.add('hidden');
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    if (nativeApp()) {
      event.preventDefault();
      hideNativeInstallUi();
      return;
    }
    event.preventDefault();
    deferredInstallPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
  });

  document.addEventListener(
    'click',
    async event => {
      const button = event.target.closest?.('#installFirstBtn, #installBtn');
      if (!button) return;

      if (nativeApp()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        hideNativeInstallUi();
        return;
      }

      if (standalone()) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (embeddedBrowser()) {
        showEmbeddedScreen();
        return;
      }

      if (deferredInstallPrompt) {
        const prompt = deferredInstallPrompt;
        deferredInstallPrompt = null;
        await prompt.prompt();
        await prompt.userChoice;
        return;
      }

      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setInstallMessage(
        ios
          ? 'Na iPhonie otwórz menu Udostępnij w Safari i wybierz „Dodaj do ekranu początkowego”.'
          : 'Ta przeglądarka nie udostępniła automatycznego okna instalacji. Otwórz jej menu i wybierz „Zainstaluj aplikację” albo „Dodaj do ekranu głównego”.'
      );
    },
    true
  );

  async function bootInstallFlow() {
    if (nativeApp()) {
      hideNativeInstallUi();
      return;
    }

    if (standalone()) return;

    if (embeddedBrowser()) {
      showEmbeddedScreen();
      return;
    }

    await continueInRegularBrowser();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootInstallFlow, { once: true });
  } else {
    void bootInstallFlow();
  }
})();
