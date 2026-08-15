(() => {
  const capacitor = window.Capacitor;
  const isNative = Boolean(
    capacitor && (
      (typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform()) ||
      (typeof capacitor.getPlatform === 'function' && capacitor.getPlatform() !== 'web')
    )
  );

  if (!isNative) return;

  window.__AI_MONITOR_NATIVE__ = true;
  document.documentElement.classList.add('native-app');

  // The existing frontend deliberately unlocks login only in standalone mode.
  // Native Capacitor is already a system-installed standalone application, so
  // expose that fact without changing the browser/PWA behavior.
  const originalMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = query => {
    const result = originalMatchMedia(query);
    if (String(query).trim() !== '(display-mode: standalone)') return result;

    return new Proxy(result, {
      get(target, property) {
        if (property === 'matches') return true;
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
  };

  // A service worker is useful for the hosted PWA, but not for bundled local
  // assets in Capacitor. Prevent native builds from registering the PWA worker.
  try {
    if (navigator.serviceWorker?.register) {
      const sw = navigator.serviceWorker;
      sw.register = async () => ({
        active: null,
        installing: null,
        waiting: null,
        unregister: async () => true,
        update: async () => undefined
      });
    }
  } catch (error) {
    console.info('Native mode: service worker registration is unavailable.', error);
  }

  const hidePwaInstallUi = () => {
    document.getElementById('installFirstBtn')?.classList.add('hidden');
    document.getElementById('installBtn')?.classList.add('hidden');
    document.getElementById('installHint')?.classList.add('hidden');
  };

  const handleBack = async () => {
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal && !logoutModal.classList.contains('hidden')) {
      document.getElementById('logoutCancelBtn')?.click();
      return;
    }

    const auth = document.getElementById('authScreen');
    const app = document.getElementById('app');
    if (auth && !auth.classList.contains('hidden') && app?.classList.contains('hidden')) {
      await capacitor.Plugins?.App?.exitApp?.();
      return;
    }

    const activeView = document.querySelector('.view.active');
    if (activeView?.id && activeView.id !== 'viewToday') {
      document.querySelector('.bottom-nav [data-nav="today"]')?.click();
      return;
    }

    await capacitor.Plugins?.App?.exitApp?.();
  };

  const attachNativeListeners = async () => {
    hidePwaInstallUi();

    const appPlugin = capacitor.Plugins?.App;
    if (!appPlugin?.addListener) return;

    try {
      await appPlugin.addListener('backButton', handleBack);
    } catch (error) {
      console.warn('Native back button listener could not be attached.', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachNativeListeners, { once: true });
  } else {
    attachNativeListeners();
  }
})();
