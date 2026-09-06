import fs from 'node:fs/promises';
import { MODULES, BACKEND_BASE, BUILD_ID } from './frontend-manifest.mjs';

const read = path => fs.readFile(path, 'utf8');
const [bundle, index, manifest, gradle, main, billing, reminder, receiver] = await Promise.all([
  read('app.bundle.js'),
  read('dist/index.html'),
  read('android-app/app/src/main/AndroidManifest.xml'),
  read('android-app/app/build.gradle'),
  read('android-app/app/src/main/java/com/atybuslab/dieta/MainActivity.java'),
  read('android-app/app/src/main/java/com/atybuslab/dieta/BillingBridge.java'),
  read('android-app/app/src/main/java/com/atybuslab/dieta/ReminderAwareActivity.java'),
  read('android-app/app/src/main/java/com/atybuslab/dieta/ReminderReceiver.java')
]);

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const hasAll = (source, markers, area) => markers.forEach(marker => assert(source.includes(marker), `${area}: brak ${marker}`));

assert(BUILD_ID.includes('1.1.18'), 'Build ID nie wskazuje 1.1.18');
assert(MODULES.length === 29, `Finalny frontend powinien mieć 29 modułów, ma ${MODULES.length}`);
assert(bundle.includes(BACKEND_BASE), 'Finalny bundle nie wskazuje produkcyjnego api.atybuslab.com');
assert(!bundle.includes('n8n-pi.taild8d05f.ts.net'), 'Finalny bundle zawiera stary host Tailscale');

hasAll(index, [
  'id="photoInput"', 'id="analyzeTextBtn"', 'id="saveMealBtn"', 'id="saveFavoriteBtn"',
  'id="viewFavorites"', 'id="viewHistory"', 'id="viewProfile"', 'id="logoutBtn"',
  'id="newPin"', 'id="createUserBtn"', 'id="claimProfileBtn"'
], 'UI');

hasAll(bundle, [
  'claimProfile', 'createUser', 'resetToken', 'recovery',
  'analyze_photo', 'analyze_text', 'saveMeal', 'favorite', 'history', 'profile',
  'water', 'hydration', 'theme', 'consent', 'clearSession',
  'AppHooks', 'beforeApi', 'afterApi',
  'AndroidCamera', '__wczNativeCameraPhoto',
  'AndroidMonetization', 'rewarded_complete', 'interstitial_shown', 'native_shown',
  'AndroidBilling', '__wczBillingPurchase', '__wczBillingProducts',
  'showPrivacyOptions', '__wczPrivacyOptionsAvailability'
], 'Frontend');

hasAll(manifest, [
  'android.permission.INTERNET', 'android.permission.POST_NOTIFICATIONS', 'android.permission.RECEIVE_BOOT_COMPLETED',
  'android:allowBackup="false"', 'android:usesCleartextTraffic="false"',
  'android:name=".ReminderAwareActivity"', 'android:name=".ReminderReceiver"',
  'android.media.action.IMAGE_CAPTURE'
], 'Manifest');
assert(!manifest.includes('android.permission.CAMERA'), 'Manifest nie może przywracać CAMERA permission');

hasAll(main, [
  'WebViewAssetLoader', 'setAllowFileAccess(false)', 'AndroidApp', 'AndroidCamera', 'AndroidMonetization',
  'MediaStore.ACTION_IMAGE_CAPTURE', 'MediaStore.EXTRA_OUTPUT', 'grantUriPermission',
  'normalizeCameraPhoto', 'STATE_CAMERA_OUTPUT_URI', 'STATE_CAMERA_IN_PROGRESS', 'pendingCameraPhotoBase64',
  'RewardedAd', 'InterstitialAd', 'NativeAd', 'UserMessagingPlatform',
  'rewardedShowPending', 'interstitialShowPending'
], 'Android MainActivity');

hasAll(billing, [
  'BillingClient', 'queryProductDetailsAsync', 'launchBillingFlow', 'queryPurchasesAsync',
  '__wczBillingState', '__wczBillingProducts', '__wczBillingPurchase', '__wczBillingError'
], 'Billing');

hasAll(reminder, ['POST_NOTIFICATIONS', 'ReminderReceiver.scheduleAll(this)', 'ReminderReceiver.markAppForeground(this, true)'], 'Reminder activity');
hasAll(receiver, ['REMINDER_HOURS = {12, 16, 20}', 'AlarmManager', 'ACTION_BOOT_COMPLETED', 'ACTION_MY_PACKAGE_REPLACED', 'ACTION_TIME_CHANGED', 'ACTION_TIMEZONE_CHANGED'], 'Reminder receiver');

hasAll(gradle, [
  "applicationId 'com.atybuslab.dieta'", 'compileSdk 36', 'targetSdk 36', 'minSdk 29',
  'versionCode 21', "versionName '1.1.18'",
  'play-services-ads:25.4.0', 'user-messaging-platform:4.0.0', 'billing:9.1.0',
  'ca-app-pub-1844071625771837/4892706319', 'ca-app-pub-1844071625771837/9155490158', 'ca-app-pub-1844071625771837/6257864076'
], 'Gradle');

const legalFiles = ['polityka-prywatnosci.html', 'regulamin.html', 'kontakt.html', 'usun-konto.html'];
for (const file of legalFiles) {
  try { await fs.access(file); } catch { failures.push(`Brak pliku prawnego/kontaktowego: ${file}`); }
}

if (failures.length) {
  console.error('FULL REGRESSION CONTRACT FAILED:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('FULL REGRESSION CONTRACT OK: auth/recovery, analyses, meals, favorites, history, hydration, profile, theme, camera, ads, billing, privacy, reminders and legal assets preserved.');
