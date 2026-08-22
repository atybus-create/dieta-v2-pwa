(() => {
  'use strict';

  if (!window.__AI_MONITOR_NATIVE__ || !window.AndroidAds) return;

  const EVENT_API = 'https://api.atybuslab.com/webhook/dieta-v2-monetization-event';
  const TEST_APP_VERSION = '1.1.3-test';
  const TERMS_VERSION = '2026-08-22-v2';
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

  function ensureRewardPromptStyles() {
    if (document.getElementById('wczai-reward-prompt-styles')) return;
    const style = document.createElement('style');
    style.id = 'wczai-reward-prompt-styles';
    style.textContent = `
      .wczai-reward-overlay{position:fixed;inset:0;z-index:12050;display:grid;place-items:center;padding:22px;background:rgba(1,7,10,.78);backdrop-filter:blur(9px)}
      .wczai-reward-overlay.hidden{display:none!important}
      .wczai-reward-card{width:min(100%,390px);border:1px solid rgba(96,226,210,.25);border-radius:20px;padding:22px;background:linear-gradient(180deg,#0b1a1f,#071014);box-shadow:0 22px 60px rgba(0,0,0,.46);color:#eefbf9}
      .wczai-reward-badge{display:inline-flex;align-items:center;min-height:26px;padding:4px 9px;border-radius:999px;background:rgba(73,211,194,.11);color:#78eadc;font:800 11px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}
      .wczai-reward-title{margin:14px 0 8px;font:850 21px/1.15 system-ui,sans-serif;letter-spacing:-.025em}
      .wczai-reward-copy{margin:0;color:#bfd8d5;font:500 14px/1.5 system-ui,sans-serif}
      .wczai-reward-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:19px}
      .wczai-reward-btn{min-height:46px;border-radius:13px;font:800 14px/1 system-ui,sans-serif;cursor:pointer}
      .wczai-reward-primary{border:1px solid rgba(111,235,221,.42);background:#6fe8da;color:#06201d}
      .wczai-reward-secondary{border:1px solid rgba(159,184,185,.16);background:rgba(255,255,255,.04);color:#aec3c4}
      .wczai-reward-btn:focus-visible{outline:3px solid rgba(111,232,218,.32);outline-offset:2px}
      #app[data-theme="light"]~.wczai-reward-overlay .wczai-reward-card{background:#f8fbfb;color:#142027;border-color:rgba(20,127,119,.18)}
      #app[data-theme="light"]~.wczai-reward-overlay .wczai-reward-copy{color:#52666b}
      @media(max-width:420px){.wczai-reward-actions{grid-template-columns:1fr}.wczai-reward-card{padding:20px}}
    `;
    document.head.appendChild(style);
  }

  function askRewardedConsent(check) {
    ensureRewardPromptStyles();

    return new Promise(resolve => {
      document.querySelector('.wczai-reward-overlay')?.remove();

      const freeIncluded = Math.max(0, Number(check?.freeIncluded || 2));
      const overlay = document.createElement('div');
      overlay.className = 'wczai-reward-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'wczaiRewardTitle');
      overlay.innerHTML = `
        <div class="wczai-reward-card">
          <span class="wczai-reward-badge">Dodatkowa analiza</span>
          <h2 class="wczai-reward-title" id="wczaiRewardTitle">Darmowy limit na dziś wykorzystany</h2>
          <p class="wczai-reward-copy">Masz ${freeIncluded} bezpłatne analizy dziennie. Obejrzyj krótką reklamę, aby odblokować 1 dodatkową analizę.</p>
          <div class="wczai-reward-actions">
            <button class="wczai-reward-btn wczai-reward-primary" type="button">Obejrzyj reklamę</button>
            <button class="wczai-reward-btn wczai-reward-secondary" type="button">Nie teraz</button>
          </div>
        </div>`;

      const finish = value => {
        overlay.remove();
        resolve(value);
      };

      overlay.querySelector('.wczai-reward-primary')?.addEventListener('click', () => finish(true), { once: true });
      overlay.querySelector('.wczai-reward-secondary')?.addEventListener('click', () => finish(false), { once: true });
      overlay.addEventListener('click', event => {
        if (event.target === overlay) finish(false);
      });

      document.body.appendChild(overlay);
      setTimeout(() => overlay.querySelector('.wczai-reward-primary')?.focus(), 0);
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
      const accepted = await askRewardedConsent(check);
      if (!accepted) throw new Error('Analiza nie została uruchomiona.');

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
    let requestPayload = payload || {};

    if (normalized === 'user_create') {
      const termsCheck = document.getElementById('registrationTermsCheck');
      if (!termsCheck?.checked) {
        throw new Error('Aby utworzyć konto, zaakceptuj Regulamin i potwierdź ukończenie 18 lat.');
      }
      requestPayload = {
        ...requestPayload,
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
        appVersion: TEST_APP_VERSION
      };
    }

    if (normalized === 'analyze_text' || normalized === 'analyze_photo') {
      await ensureAiAccess();
    }

    const data = await originalApi(action, requestPayload, file);
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
