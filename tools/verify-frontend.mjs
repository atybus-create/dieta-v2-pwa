import fs from 'node:fs/promises';
import path from 'node:path';
import { BUILD_ID, MODULES } from './frontend-manifest.mjs';

const root = process.cwd();
const bundle = await fs.readFile(path.join(root, 'app.bundle.js'), 'utf8');
const distIndex = await fs.readFile(path.join(root, 'dist/index.html'), 'utf8');
const distSw = await fs.readFile(path.join(root, 'dist/sw.js'), 'utf8');

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(MODULES.length === 31, `Manifest powinien zawierać 31 modułów, ma ${MODULES.length}`);
for (const moduleName of MODULES) {
  try { await fs.access(path.join(root, moduleName)); }
  catch { failures.push(`Brak modułu źródłowego: ${moduleName}`); }
}

assert(!/\(0,\s*eval\)|\beval\s*\(/.test(bundle), 'Bundle nadal zawiera eval');
assert(!bundle.includes('modules.map(url => fetch'), 'Bundle nadal zawiera stary runtime module loader');
assert(!bundle.includes("fetch('./monetization-client.js"), 'Monetyzacja nadal ładowana dynamicznie');
assert(!bundle.includes("createElement('script')"), 'Bundle nadal tworzy dynamiczny tag script');
assert(distIndex.includes(`app.bundle.js?v=${BUILD_ID}`), 'dist/index.html nie wskazuje na finalny bundle');
assert(!distIndex.includes('src="app.js?'), 'dist/index.html nadal uruchamia stary bootstrap');
assert(distIndex.includes('id="brandRedesignStyles"'), 'Brak statycznego brand-redesign.css');
assert(distIndex.includes('id="brandRedesignPolishStyles"'), 'Brak statycznego brand-redesign-polish.css');
assert(distIndex.includes('id="brandFunctionalFixes"'), 'Brak statycznego brand-functional-fixes.css');
assert(distSw.includes(`wiem-co-zre-m-ai-${BUILD_ID}`), 'Service Worker ma stary cache id');
assert(distSw.includes(`app.bundle.js?v=${BUILD_ID}`), 'Service Worker nie cacheuje finalnego bundle');

const requiredUi = [
  'photoInput', 'analyzeTextBtn', 'saveMealBtn', 'saveFavoriteBtn',
  'viewFavorites', 'viewHistory', 'viewProfile', 'logoutBtn',
  'newPin', 'createUserBtn', 'claimProfileBtn'
];
for (const marker of requiredUi) {
  assert(distIndex.includes(`id="${marker}"`), `Brak krytycznego elementu UI: ${marker}`);
}

const requiredFeatureMarkers = [
  'resetToken', 'water', 'consent', 'favorite',
  'analysis', 'meal', 'theme', 'history', 'profile'
];
const lowerBundle = bundle.toLowerCase();
for (const marker of requiredFeatureMarkers) {
  assert(lowerBundle.includes(marker.toLowerCase()), `Bundle nie zawiera markera funkcji: ${marker}`);
}

const monetizationMarkers = [
  '__wczMonetizationAdResult',
  'rewardedGateModal',
  'subscriptionPlansModal',
  'AndroidMonetization',
  'ensureAiAccess',
  'handleAfterAction'
];
for (const marker of monetizationMarkers) {
  assert(bundle.includes(marker), `Bundle nie zawiera markera monetyzacji: ${marker}`);
}

const nativeMarkers = [
  'AndroidApp',
  'AndroidCamera',
  'captureMealPhoto',
  '__wczNativeCameraEvent',
  '__wczNativeCameraPhoto',
  '__WCZ_NATIVE_CAPABILITIES__',
  'photo_click',
  'analyze_photo_sent'
];
for (const marker of nativeMarkers) {
  assert(bundle.includes(marker), `Bundle nie zawiera kontraktu Android: ${marker}`);
}

if (failures.length) {
  console.error('Frontend verification FAILED:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Frontend verification OK: build=${BUILD_ID}, modules=${MODULES.length}, bundleBytes=${Buffer.byteLength(bundle)}`);
