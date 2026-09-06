import fs from 'node:fs/promises';

const monetization = await fs.readFile('monetization-client.js', 'utf8');
const main = await fs.readFile('android-app/app/src/main/java/com/atybuslab/dieta/MainActivity.java', 'utf8');
const billing = await fs.readFile('android-app/app/src/main/java/com/atybuslab/dieta/BillingBridge.java', 'utf8');
const gradle = await fs.readFile('android-app/app/build.gradle', 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const jsMarkers = [
  'REWARDED_AD_WATCHDOG_MS = 10 * 60 * 1000',
  'DEFAULT_AD_WATCHDOG_MS = 60 * 1000',
  "const watchdogMs = type === 'rewarded' ? REWARDED_AD_WATCHDOG_MS : DEFAULT_AD_WATCHDOG_MS",
  "window.AndroidMonetization.showRewarded()",
  "window.AndroidMonetization.showInterstitial()",
  "window.AndroidMonetization.showIngredientNative()",
  "monetizationEvent('rewarded_complete')",
  "monetizationEvent('interstitial_shown')",
  "monetizationEvent('native_shown')",
  "check?.requiredAd || ''",
  'handleAfterAction',
  'subscriptionPlansModal',
  'rewardedGateModal'
];
for (const marker of jsMarkers) assert(monetization.includes(marker), `Brak krytycznego kontraktu monetyzacji JS: ${marker}`);

assert(!monetization.includes('}, 45000);'), 'Rewarded nie może kończyć oczekiwania po 45 sekundach');
assert(!monetization.includes('Obejrzyj reklamę testową'), 'Produkcja nie może zawierać tekstu "reklama testowa" w flow użytkownika');

const nativeMarkers = [
  'rewardedShowPending',
  'interstitialShowPending',
  'if (rewardedLoading)',
  'if (interstitialLoading)',
  'notifyAdResult("rewarded", rewardEarned[0])',
  'notifyAdResult("interstitial", true)',
  'notifyAdResult("native", true)',
  'preloadRewarded(false)',
  'preloadInterstitial(false)'
];
for (const marker of nativeMarkers) assert(main.includes(marker), `Brak natywnego zabezpieczenia reklam: ${marker}`);

assert(main.includes('if (showAfterLoad) interstitialShowPending = true;'), 'Interstitial powinien zapamiętać żądanie podczas ładowania');
assert(main.includes('if (interstitialShowPending) {'), 'Interstitial powinien uruchomić oczekującą reklamę po załadowaniu');

const billingMarkers = [
  'BillingClient',
  'queryProductDetailsAsync',
  'launchBillingFlow',
  'queryPurchasesAsync',
  '__wczBillingPurchase',
  '__wczBillingProducts'
];
for (const marker of billingMarkers) assert(billing.includes(marker), `Billing utracił kontrakt: ${marker}`);

assert(gradle.includes("buildConfigField 'boolean', 'MONETIZATION_TEST_MODE', 'true'"), 'Debug powinien pozostać w trybie reklam testowych');
assert(gradle.includes("buildConfigField 'boolean', 'MONETIZATION_TEST_MODE', 'false'"), 'Release powinien pozostać w trybie produkcyjnym');
assert(gradle.includes('ca-app-pub-1844071625771837/4892706319'), 'Release utracił produkcyjny Rewarded Ad Unit');
assert(gradle.includes('ca-app-pub-1844071625771837/9155490158'), 'Release utracił produkcyjny Interstitial Ad Unit');
assert(gradle.includes('ca-app-pub-1844071625771837/6257864076'), 'Release utracił produkcyjny Native Ad Unit');

if (failures.length) {
  console.error('Monetization regression verification FAILED:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('Monetization regression verification OK: long rewarded ads, preload races, billing contracts and production ad IDs preserved.');
