import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFile(path.join(root, file), 'utf8');
const main = await read('android-app/app/src/main/java/com/atybuslab/dieta/MainActivity.java');
const reminder = await read('android-app/app/src/main/java/com/atybuslab/dieta/ReminderAwareActivity.java');
const receiver = await read('android-app/app/src/main/java/com/atybuslab/dieta/ReminderReceiver.java');
const manifest = await read('android-app/app/src/main/AndroidManifest.xml');
const gradle = await read('android-app/app/build.gradle');
const nativePlatform = await read('native-platform.js');
const workflow = await read('.github/workflows/android-apk.yml');

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const count = (source, regex) => (source.match(regex) || []).length;

const requiredMain = [
  'new AppBridge(), "AndroidApp"',
  'new CameraBridge(), "AndroidCamera"',
  'new MonetizationBridge(), "AndroidMonetization"',
  'captureMealPhoto()',
  'getCapabilities()',
  'getAppVersionName()',
  'getAppVersionCode()',
  'PackageInfo',
  '__wczNativeCameraEvent',
  '__wczNativeCameraPhoto',
  'showRewardedInternal',
  'showInterstitialInternal',
  'showNativeInternal',
  'normalizeCameraPhoto'
];
for (const marker of requiredMain) {
  assert(main.includes(marker), `MainActivity utracił kontrakt/funkcję: ${marker}`);
}

const forbiddenMain = [
  'onShowFileChooser',
  'FILE_CHOOSER_REQUEST',
  'DietaV2Native/1.1.9',
  'BuildConfig.VERSION_NAME',
  'BuildConfig.VERSION_CODE',
  'installNativeCameraJavascript',
  'postDelayed(this::installNativeCameraJavascript',
  'DIRECT_CAMERA_REQUEST'
];
for (const marker of forbiddenMain) {
  assert(!main.includes(marker), `MainActivity nadal zawiera stary lub niestabilny mechanizm: ${marker}`);
}

assert(count(main, /addJavascriptInterface\(new CameraBridge\(\), "AndroidCamera"\)/g) === 1,
  'AndroidCamera powinien być rejestrowany dokładnie raz');
assert(count(main, /void captureMealPhoto\s*\(/g) === 1,
  'captureMealPhoto() powinno mieć dokładnie jednego właściciela');
assert(main.includes('settings.setAllowFileAccess(false)'), 'WebView powinien blokować bezpośredni file access');
assert(main.includes('WebViewAssetLoader'), 'Android powinien ładować frontend przez WebViewAssetLoader');
assert(main.includes('LOCAL_APP_URL = "https://appassets.androidplatform.net/assets/www/index.html"'),
  'Android powinien uruchamiać wyłącznie lokalny bundle frontendu');

assert(reminder.includes('ReminderReceiver.scheduleAll(this)'), 'ReminderAwareActivity utracił harmonogram przypomnień');
assert(reminder.includes('ReminderReceiver.markAppForeground(this, true)'), 'ReminderAwareActivity utracił foreground tracking');
assert(reminder.includes('POST_NOTIFICATIONS'), 'ReminderAwareActivity utracił obsługę uprawnienia powiadomień');
assert(!reminder.includes('AndroidCamera'), 'ReminderAwareActivity nadal zawiera kamerę');
assert(!reminder.includes('DIRECT_CAMERA_REQUEST'), 'ReminderAwareActivity nadal zawiera stary request aparatu');

assert(receiver.includes('private static final int[] REMINDER_HOURS = {12, 16, 20};'),
  'ReminderReceiver nie ma dokładnie slotów 12:00 / 16:00 / 20:00');
assert(receiver.includes('AlarmManager'), 'ReminderReceiver utracił AlarmManager');
assert(receiver.includes('Intent.ACTION_BOOT_COMPLETED'), 'ReminderReceiver nie odtwarza alarmów po restarcie');
assert(receiver.includes('Intent.ACTION_MY_PACKAGE_REPLACED'), 'ReminderReceiver nie odtwarza alarmów po aktualizacji');
assert(receiver.includes('Intent.ACTION_TIME_CHANGED'), 'ReminderReceiver nie reaguje na zmianę czasu');
assert(receiver.includes('Intent.ACTION_TIMEZONE_CHANGED'), 'ReminderReceiver nie reaguje na zmianę strefy czasowej');

assert(manifest.includes('android:name=".ReminderAwareActivity"'), 'Manifest nie uruchamia ReminderAwareActivity');
assert(manifest.includes('android:name=".ReminderReceiver"'), 'Manifest utracił ReminderReceiver');
assert(manifest.includes('android.permission.POST_NOTIFICATIONS'), 'Manifest utracił POST_NOTIFICATIONS');
assert(manifest.includes('android.permission.RECEIVE_BOOT_COMPLETED'), 'Manifest utracił RECEIVE_BOOT_COMPLETED');
assert(!manifest.includes('android.permission.CAMERA'),
  'Manifest nie powinien wymagać CAMERA, bo zdjęcie wykonuje zewnętrzna aplikacja aparatu przez Intent');

const versionName = gradle.match(/versionName\s+['"]([^'"]+)['"]/)?.[1];
const versionCode = gradle.match(/versionCode\s+(\d+)/)?.[1];
assert(Boolean(versionName && versionCode), 'Nie można odczytać wersji z build.gradle');
assert(main.includes('" DietaV2Native/" + getAppVersionName()'), 'User-Agent nie pobiera wersji z pakietu');
assert(main.includes('result.put("appVersion", getAppVersionName())'), 'AndroidApp nie raportuje versionName z pakietu');
assert(main.includes('result.put("versionCode", getAppVersionCode())'), 'AndroidApp nie raportuje versionCode z pakietu');
assert(workflow.includes('VERSION_NAME="$(sed -n'), 'Workflow nie wyprowadza versionName z build.gradle');
assert(workflow.includes('VERSION_CODE="$(sed -n'), 'Workflow nie wyprowadza versionCode z build.gradle');
assert(!/Wiem-co-Zre-m-z-AI-v\d+\.\d+\.\d+-rc-unified-api36/.test(workflow),
  'Workflow nadal zawiera ręcznie wpisaną wersję w nazwie artefaktu');

assert(nativePlatform.includes("const hasAppBridge = Boolean(window.AndroidApp"), 'Frontend nie wykrywa jawnie AndroidApp');
assert(nativePlatform.includes("typeof camera.captureMealPhoto === 'function'"), 'Frontend nie korzysta z jawnego kontraktu AndroidCamera');
assert(nativePlatform.includes("tile.dataset.nativeCameraBound === '1'"), 'Frontend nie chroni przed podwójnym podpięciem aparatu');
assert(nativePlatform.includes("if (!hasAppBridge)"), 'PWA nie ma jawnej ścieżki bez Android bridge');
assert(!nativePlatform.includes('setTimeout(bindNativeCamera'), 'Native camera nie powinna być dołączana przez opóźnioną łatkę');
assert(!nativePlatform.includes('photoInput.click()'), 'Native camera nie powinna wracać do ukrytego file chooser');

if (failures.length) {
  console.error('Android architecture verification FAILED:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Android architecture verification OK: one camera bridge, local bundled frontend, package-driven versioning ${versionName}(${versionCode}), reminders 12/16/20 and monetization preserved.`);
