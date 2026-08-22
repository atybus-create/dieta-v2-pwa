(() => {
  'use strict';

  if (!window.__AI_MONITOR_NATIVE__ || !window.AndroidAds) return;

  const EVENT_API = 'https://api.atybuslab.com/webhook/dieta-v2-monetization-event';
  const originalApi = api;
  let rewardedResolver = null;
  let rewardedTimer = null;
  let interstitialPending = false;
  let nativePending = false;

  async function monetizationEvent(event) {
    if (!state?.token) throw new Error('Brak aktywnej sesji.');
    return post(EVENT_API, {
      accessToken: state.token,
      event
    });
  }

  function clearRewardedWait() {
    if (rewardedTimer) clearTimeout(rewardedTimer);
    rewardedTimer = null;
  }

  function waitForRewarded() {
    if (rewardedResolver) {
      return Promise.reject(new Error('Reklama jest już uruchamiana.'));
    }

    return new Promise((resolve, reject) => {
      rewardedResolver = { resolve, reject };
      rewardedTimer = setTimeout(() => {
        rewardedResolver = null;
        rewardedTimer = null;
        reject(new Error('Reklama testowa nie odpowiedziała. Spróbuj ponownie.'));
      }, 90000);

      try {
        window.AndroidAds.showRewarded();
      } catch (error) {
        clearRewardedWait();
        rewardedResolver = null;
        reject(new Error('Nie udało się uruchomić reklamy testowej.'));
      }
    });
  }

  async function ensureAiAccess() {
    const check = await monetizationEvent('check_ai');

    if (check?.wouldAllow !== false) return true;

    if (String(check?.reason || '') === 'DAILY_LIMIT') {
      throw new Error(`Wykorzystano dzienny limit ${Number(check.aiMaxPerDay || 0)} analiz AI.`);
    }

    if (String(check?.requiredAd || '') === 'rewarded') {
      const earned = await waitForRewarded();
      if (!earned) throw new Error('Aby odblokować kolejną analizę, obejrzyj reklamę do końca.');
      return true;
    }

    throw new Error('Kolejna analiza jest obecnie niedostępna.');
  }

  function handleMonetization(action, data) {
    const m = data?.monetization;
    if (!m || m.adsEnabled !== true) return;

    if ((action === 'analyze_text' || action === 'analyze_photo') && m.interstitialDue === true && !interstitialPending) {
      interstitialPending = true;
      setTimeout(() => {
        try {
          window.AndroidAds.showInterstitial();
        } catch (_) {
          interstitialPending = false;
        }
      }, 450);
    }

    if (action === 'ingredient_search' && m.nativeDue === true && !nativePending) {
      nativePending = true;
      setTimeout(() => {
        try {
          window.AndroidAds.showNative();
        } catch (_) {
          nativePending = false;
        }
      }, 350);
    }
  }

  api = async function monetizedApi(action, payload = {}, file = null) {
    const normalized = String(action || '').trim().toLowerCase();

    if (normalized === 'analyze_text' || normalized === 'analyze_photo') {
      await ensureAiAccess();
    }

    const data = await originalApi(action, payload, file);
    handleMonetization(normalized, data);
    return data;
  };

  window.WCZMonetization = {
    async onRewardedResult(earned) {
      const pending = rewardedResolver;
      if (!pending) return;
      rewardedResolver = null;
      clearRewardedWait();

      if (!earned) {
        pending.resolve(false);
        return;
      }

      try {
        await monetizationEvent('rewarded_complete');
        pending.resolve(true);
      } catch (error) {
        pending.reject(new Error(error?.message || 'Nie udało się zapisać nagrody za reklamę.'));
      }
    },

    onRewardedUnavailable() {
      const pending = rewardedResolver;
      if (!pending) return;
      rewardedResolver = null;
      clearRewardedWait();
      pending.reject(new Error('Reklama testowa nie jest jeszcze gotowa. Spróbuj ponownie za chwilę.'));
    },

    async onInterstitialShown() {
      try {
        await monetizationEvent('interstitial_shown');
      } catch (_) {
        // Reklama została pokazana; błąd licznika nie może blokować aplikacji testowej.
      }
    },

    onInterstitialResult() {
      interstitialPending = false;
    },

    async onNativeShown() {
      nativePending = false;
      try {
        await monetizationEvent('native_shown');
      } catch (_) {
        // Jak wyżej: błąd telemetrii nie blokuje działania aplikacji.
      }
    }
  };

  setTimeout(() => {
    if (typeof toast === 'function') toast('Tryb reklam testowych aktywny.');
  }, 1200);
})();
