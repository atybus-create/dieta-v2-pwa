import fs from 'node:fs/promises';

const main = await fs.readFile('android-app/app/src/main/java/com/atybuslab/dieta/MainActivity.java', 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const lifecycleMarkers = [
  'STATE_CAMERA_OUTPUT_URI',
  'STATE_CAMERA_IN_PROGRESS',
  'cameraCaptureInProgress',
  'cameraPhotoProcessing',
  'webViewReady',
  'pendingCameraPhotoBase64',
  'savedInstanceState.getString(STATE_CAMERA_OUTPUT_URI)',
  'savedInstanceState.getBoolean(STATE_CAMERA_IN_PROGRESS, false)',
  'outState.putString(STATE_CAMERA_OUTPUT_URI, cameraOutputUri.toString())',
  'outState.putBoolean(STATE_CAMERA_IN_PROGRESS, cameraCaptureInProgress)',
  'flushPendingCameraPhoto()',
  'isFinishing() && cameraOutputUri != null && !cameraCaptureInProgress && !cameraPhotoProcessing'
];
for (const marker of lifecycleMarkers) {
  assert(main.includes(marker), `Brak zabezpieczenia lifecycle aparatu: ${marker}`);
}

const compatibilityMarkers = [
  'new Intent(MediaStore.ACTION_IMAGE_CAPTURE)',
  'cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraOutputUri)',
  'cameraIntent.setClipData(ClipData.newRawUri("meal-photo", cameraOutputUri))',
  'grantUriPermission(info.activityInfo.packageName, cameraOutputUri, grantFlags)',
  'Uri returnedUri = data != null ? data.getData() : null',
  'hasContent(cameraOutputUri)',
  'hasContent(returnedUri)',
  'normalizeCameraPhoto(photoUri)',
  'Bitmap.CompressFormat.JPEG, 80',
  'MAX_EDGE = 1280',
  'window.__wczNativeCameraPhoto'
];
for (const marker of compatibilityMarkers) {
  assert(main.includes(marker), `Regresja istniejącej kompatybilności aparatu: ${marker}`);
}

assert(!main.includes('android.Manifest.permission.CAMERA'), 'Nie przywracaj bezpośredniego CAMERA permission');
assert(!main.includes('onShowFileChooser'), 'Nie przywracaj starego WebView file chooser');

if (failures.length) {
  console.error('Camera lifecycle/device regression verification FAILED:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('Camera lifecycle/device regression verification OK: current Motorola-compatible capture path preserved and Activity recreation resilience enabled.');
