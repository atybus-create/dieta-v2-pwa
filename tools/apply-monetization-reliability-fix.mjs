import fs from 'node:fs/promises';

const monetizationPath = 'monetization-client.js';
const mainPath = 'android-app/app/src/main/java/com/atybuslab/dieta/MainActivity.java';

let monetization = await fs.readFile(monetizationPath, 'utf8');
let main = await fs.readFile(mainPath, 'utf8');

const replaceOnce = (source, from, to, label) => {
  if (source.includes(to)) return source;
  const first = source.indexOf(from);
  const last = source.lastIndexOf(from);
  if (first < 0) throw new Error(`Monetization reliability patch: missing anchor: ${label}`);
  if (first !== last) throw new Error(`Monetization reliability patch: anchor is not unique: ${label}`);
  return source.replace(from, to);
};

monetization = replaceOnce(
  monetization,
`  let billingProducts = {};
  let billingBusy = false;`,
`  let billingProducts = {};
  let billingBusy = false;
  const REWARDED_AD_WATCHDOG_MS = 10 * 60 * 1000;
  const DEFAULT_AD_WATCHDOG_MS = 60 * 1000;`,
  'ad watchdog constants'
);

monetization = replaceOnce(
  monetization,
`  function requestNativeAd(type) {
    if (!isNative()) return Promise.resolve(false); if (pendingAd) return Promise.resolve(false);
    return new Promise(resolve => {
      const timer = setTimeout(() => { if (pendingAd?.type === type) pendingAd = null; resolve(false); }, 45000);
      pendingAd = { type, resolve: ok => { clearTimeout(timer); pendingAd = null; resolve(Boolean(ok)); } };
      try { if (type === 'rewarded') window.AndroidMonetization.showRewarded(); else if (type === 'interstitial') window.AndroidMonetization.showInterstitial(); else if (type === 'native') window.AndroidMonetization.showIngredientNative(); else pendingAd.resolve(false); } catch (_) { pendingAd.resolve(false); }
    });
  }`,
`  function requestNativeAd(type) {
    if (!isNative()) return Promise.resolve(false);
    if (pendingAd) return Promise.resolve(false);
    return new Promise(resolve => {
      const watchdogMs = type === 'rewarded' ? REWARDED_AD_WATCHDOG_MS : DEFAULT_AD_WATCHDOG_MS;
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (pendingAd?.type === type) pendingAd = null;
        resolve(Boolean(ok));
      };
      const timer = setTimeout(() => finish(false), watchdogMs);
      pendingAd = { type, resolve: finish };
      try {
        if (type === 'rewarded') window.AndroidMonetization.showRewarded();
        else if (type === 'interstitial') window.AndroidMonetization.showInterstitial();
        else if (type === 'native') window.AndroidMonetization.showIngredientNative();
        else finish(false);
      } catch (_) {
        finish(false);
      }
    });
  }`,
  'rewarded ad timeout handling'
);

main = replaceOnce(
  main,
`    private boolean rewardedLoading = false;
    private boolean rewardedShowPending = false;
    private boolean interstitialLoading = false;`,
`    private boolean rewardedLoading = false;
    private boolean rewardedShowPending = false;
    private boolean interstitialLoading = false;
    private boolean interstitialShowPending = false;`,
  'interstitial pending field'
);

main = replaceOnce(
  main,
`    private void preloadInterstitial(boolean showAfterLoad) {
        if (!canRequestAds()) {
            if (showAfterLoad) notifyAdResult("interstitial", false);
            return;
        }
        if (interstitialLoading) return;
        if (interstitialAd != null) {
            if (showAfterLoad) showInterstitialInternal();
            return;
        }
        interstitialLoading = true;
        InterstitialAd.load(this, INTERSTITIAL_AD_ID, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(@NonNull InterstitialAd ad) {
                interstitialLoading = false;
                interstitialAd = ad;
                if (showAfterLoad) showInterstitialInternal();
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError error) {
                interstitialLoading = false;
                interstitialAd = null;
                if (showAfterLoad) notifyAdResult("interstitial", false);
            }
        });
    }`,
`    private void preloadInterstitial(boolean showAfterLoad) {
        if (!canRequestAds()) {
            if (showAfterLoad || interstitialShowPending) {
                interstitialShowPending = false;
                notifyAdResult("interstitial", false);
            }
            return;
        }
        if (interstitialLoading) {
            if (showAfterLoad) interstitialShowPending = true;
            return;
        }
        if (interstitialAd != null) {
            if (showAfterLoad || interstitialShowPending) {
                interstitialShowPending = false;
                showInterstitialInternal();
            }
            return;
        }
        interstitialShowPending = interstitialShowPending || showAfterLoad;
        interstitialLoading = true;
        InterstitialAd.load(this, INTERSTITIAL_AD_ID, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(@NonNull InterstitialAd ad) {
                interstitialLoading = false;
                interstitialAd = ad;
                if (interstitialShowPending) {
                    interstitialShowPending = false;
                    showInterstitialInternal();
                }
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError error) {
                interstitialLoading = false;
                interstitialAd = null;
                boolean shouldNotify = interstitialShowPending;
                interstitialShowPending = false;
                if (shouldNotify) notifyAdResult("interstitial", false);
            }
        });
    }`,
  'interstitial preload race'
);

main = replaceOnce(
  main,
`        if (interstitialAd == null) {
            preloadInterstitial(true);
            return;
        }`,
`        if (interstitialAd == null) {
            if (interstitialLoading) {
                interstitialShowPending = true;
            } else {
                preloadInterstitial(true);
            }
            return;
        }`,
  'interstitial show while loading'
);

await fs.writeFile(monetizationPath, monetization, 'utf8');
await fs.writeFile(mainPath, main, 'utf8');
console.log('Monetization reliability patch applied: rewarded long-ad watchdog and interstitial preload race fixed.');
