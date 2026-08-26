import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFile(path.join(root, file), 'utf8');
const main = await read('android-app/app/src/main/java/com/atybuslab/dieta/MainActivity.java');
const reminder = await read('android-app/app/src/main/java/com/atybuslab/dieta/ReminderAwareActivity.java');
const receiver = await read('android-app/app/src/main/java/com/atybuslab/dieta/ReminderReceiver.java');
const manifest = await read('android-app/app/src/main/AndroidManifest.xml');

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

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
  'postDelayed(this::installNativeCameraJavascript'
];
for (const marker of forbiddenMain) {
  assert(!main.includes(marker), `MainActivity nadal zawiera stary lub niestabilny mechanizm: ${marker}`);
}

assert(reminder.includes('ReminderReceiver.scheduleAll(this)'), 'ReminderAwareActivity utracił harmonogram przypomnień');
assert(reminder.includes('ReminderReceiver.markAppForeground(this, true)'), 'ReminderAwareActivity utracił foreground tracking');
assert(reminder.includes('POST_NOTIFICATIONS'), 'ReminderAwareActivity utracił obsługę uprawnienia powiadomień');
assert(!reminder.includes('AndroidCamera'), 'ReminderAwareActivity nadal zawiera kamerę');
assert(!reminder.includes('DIRECT_CAMERA_REQUEST'), 'ReminderAwareActivity nadal zawiera stary request aparatu');

assert(receiver.includes('AlarmManager'), 'ReminderReceiver utracił AlarmManager');
assert(receiver.includes('12'), 'ReminderReceiver wygląda na pozbawiony slotu przypomnień');
assert(manifest.includes('android:name=".ReminderAwareActivity"'), 'Manifest nie uruchamia ReminderAwareActivity');
assert(manifest.includes('android:name=".ReminderReceiver"'), 'Manifest utracił ReminderReceiver');
assert(manifest.includes('android.permission.POST_NOTIFICATIONS'), 'Manifest utracił POST_NOTIFICATIONS');
assert(manifest.includes('android.permission.RECEIVE_BOOT_COMPLETED'), 'Manifest utracił RECEIVE_BOOT_COMPLETED');

if (failures.length) {
  console.error('Android architecture verification FAILED:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('Android architecture verification OK: explicit bridge, one camera flow, package metadata versioning, reminders and monetization preserved.');
