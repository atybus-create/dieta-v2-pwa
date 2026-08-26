import fs from 'node:fs/promises';
import path from 'node:path';
import { BUILD_ID, MODULES, CORE_MODULE, RUNTIME_MODULE, OLD_BACKEND_BASE, BACKEND_BASE } from './frontend-manifest.mjs';

const root = process.cwd();
const bundle = await fs.readFile(path.join(root, 'app.bundle.js'), 'utf8');
const distIndex = await fs.readFile(path.join(root, 'dist/index.html'), 'utf8');
const distSw = await fs.readFile(path.join(root, 'dist/sw.js'), 'utf8');
const gradle = await fs.readFile(path.join(root, 'android-app/app/build.gradle'), 'utf8');

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const count = regex => (bundle.match(regex) || []).length;

assert(MODULES.length === 28, `Manifest powinien zawierać 28 modułów Etapu 3, ma ${MODULES.length}`);
assert(MODULES[0] === CORE_MODULE, 'Pierwszym modułem musi być rdzeń');
assert(MODULES[1] === RUNTIME_MODULE, 'Drugim modułem musi być canonical-runtime.js');

const forbiddenLegacyModules = [
  'auth-login-v2.js',
  'water-compat.js',
  'water-performance.js',
  'registration-complete.js'
];
for (const moduleName of forbiddenLegacyModules) {
  assert(!MODULES.includes(moduleName), `Stara warstwa nadal jest w finalnym manifeście: ${moduleName}`);
}

for (const moduleName of MODULES) {
  try { await fs.access(path.join(root, moduleName)); }
  catch { failures.push(`Brak modułu źródłowego: ${moduleName}`); }
}

assert(!/\(0,\s*eval\)|\beval\s*\(/.test(bundle), 'Bundle nadal zawiera eval');
assert(!bundle.includes('modules.map(url => fetch'), 'Bundle nadal zawiera stary runtime module loader');
assert(!bundle.includes("fetch('./monetization-client.js"), 'Monetyzacja nadal ładowana dynamicznie');
assert(!bundle.includes("createElement('script')"), 'Bundle nadal tworzy dynamiczny tag script');
assert(!bundle.includes(OLD_BACKEND_BASE), 'Bundle nadal zawiera stary backend host');
assert(count(new RegExp(BACKEND_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) === 1, 'Backend base powinien wystąpić dokładnie raz w APP_CONFIG');

// Etap 3: jeden właściciel krytycznych przepływów, bez łańcuchów wrapperów.
assert(count(/async function post\s*\(/g) === 1, 'post() nie ma dokładnie jednego właściciela');
assert(count(/async function api\s*\(/g) === 1, 'api() nie ma dokładnie jednego właściciela');
assert(count(/async function claimProfile\s*\(/g) === 1, 'claimProfile() nie ma dokładnie jednego właściciela');
assert(count(/async function createUser\s*\(/g) === 1, 'createUser() nie ma dokładnie jednego właściciela');
assert(count(/async function enterApp\s*\(/g) === 1, 'enterApp() nie ma dokładnie jednego właściciela');
assert(count(/function clearSession\s*\(/g) === 1, 'clearSession() nie ma dokładnie jednego właściciela');

const forbiddenLayerPatterns = [
  [/\bapi\s*=\s*async\s+function/g, 'runtime override api()'],
  [/\bpost\s*=\s*async\s+function/g, 'runtime override post()'],
  [/\bclaimProfile\s*=\s*async\s+function/g, 'runtime override claimProfile()'],
  [/\bcreateUser\s*=\s*async\s+function/g, 'runtime override createUser()'],
  [/\benterApp\s*=\s*async\s+function/g, 'runtime override enterApp()'],
  [/\bclearSession\s*=\s*function/g, 'runtime override clearSession()'],
  [/\banalyzePhoto\s*=\s*async\s+function/g, 'runtime override analyzePhoto()'],
  [/\bbaseApi\w*\b/g, 'łańcuch baseApi*'],
  [/\bbaseEnterApp\w*\b/g, 'łańcuch baseEnterApp*'],
  [/\bbaseCreateUser\w*\b/g, 'łańcuch baseCreateUser*'],
  [/\bbaseAnalyzePhoto\w*\b/g, 'łańcuch baseAnalyzePhoto*'],
  [/\bbaseLoad(?:Dashboard|Settings|History)\w*\b/g, 'łańcuch baseLoad*'],
  [/\boriginalPost\s*=\s*post\b/g, 'tymczasowe podmienianie post()']
];
for (const [pattern, label] of forbiddenLayerPatterns) {
  assert(!pattern.test(bundle), `Bundle zawiera niedozwoloną warstwę: ${label}`);
}

assert(bundle.includes('const AppHooks = (() =>'), 'Brak jawnego rejestru AppHooks');
assert(bundle.includes("AppHooks.on('beforeApi', 'legal-ai-consent'"), 'Zgody AI nie są podpięte przez hook');
assert(bundle.includes("AppHooks.on('beforeApi', 'monetization-access'"), 'Monetyzacja nie jest podpięta przez hook');
assert(bundle.includes("AppHooks.on('beforeApi', 'photo-preprocessing'"), 'Kompresja zdjęcia nie jest podpięta przez hook');
assert(bundle.includes("AppHooks.on('beforeEnterApp', 'recovery-required-email'"), 'Recovery nie jest podpięte przez hook');
assert(bundle.includes("AppHooks.on('beforeEnterApp', 'theme-local'"), 'Motyw nie jest podpięty przez hook');
assert(bundle.includes("AppHooks.on('afterEnterApp', 'theme-sync'"), 'Synchronizacja motywu nie jest podpięta przez hook');
assert(bundle.includes("AppHooks.on('afterEnterApp', 'account-ui'"), 'UI konta nie jest podpięte przez hook');
assert(bundle.includes("AppHooks.on('afterApi', 'water-response-ui'"), 'Woda nie jest podpięta przez hook');
assert(bundle.includes("AppHooks.on('afterApi', 'hydration-breakdown'"), 'Nawodnienie nie jest podpięte przez hook');
assert(bundle.includes("AppHooks.on('afterApi', 'history-hydration'"), 'Historia nawodnienia nie jest podpięta przez hook');

// Etap 5: regresje wykryte w testach APK 1.1.10.
assert(bundle.includes('let waterActionBusy = false'), 'Brak jednego źródła stanu zajętości nawodnienia');
assert(bundle.includes('function setWaterActionBusy(busy)'), 'Kontrolki nawodnienia nie mają wspólnej funkcji odblokowującej');
assert(count(/setWaterActionBusy\(false\)/g) >= 2, 'Dodawanie i cofanie wody muszą zawsze odblokować kontrolki');
assert(bundle.includes('width:max(68vw,37.778dvh)'), 'Animowany pasek startowy nie zakrywa statycznego paska na różnych proporcjach ekranu');
assert(bundle.includes('height:clamp(22px,max(4.6dvh,8.28vw),38px)'), 'Pasek startowy nie ma powiększonej wysokości');
assert(bundle.includes('window.visualViewport'), 'Modal usuwania profilu nie reaguje na klawiaturę ekranową');
assert(bundle.includes('profile-delete-actions{position:sticky'), 'Przyciski modalu usuwania profilu nie pozostają dostępne nad klawiaturą');
assert(bundle.includes('profile-delete-card{width:min(100%,460px);max-height:'), 'Modal usuwania profilu nie ma przewijalnej wysokości dla małych ekranów');

const versionName = gradle.match(/versionName\s+['"]([^'"]+)['"]/)?.[1];
const versionCode = gradle.match(/versionCode\s+(\d+)/)?.[1];
assert(Boolean(versionName && versionCode), 'Nie można odczytać wersji Android z build.gradle');
assert(bundle.includes(`versionName: '${versionName}'`), 'Bundle nie pobiera versionName z Android build.gradle');
assert(bundle.includes(`versionCode: ${Number(versionCode)}`), 'Bundle nie pobiera versionCode z Android build.gradle');
assert(count(/const APP_VERSION\s*=/g) === 1, 'APP_VERSION powinien mieć jedno źródło runtime');

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

console.log(`Frontend verification OK: build=${BUILD_ID}, modules=${MODULES.length}, version=${versionName}(${versionCode}), bundleBytes=${Buffer.byteLength(bundle)}`);
