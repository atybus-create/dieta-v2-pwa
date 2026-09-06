import fs from 'node:fs/promises';
import path from 'node:path';
import {
  BUILD_ID,
  MODULES,
  CORE_MODULE,
  RUNTIME_MODULE,
  OLD_BACKEND_BASE,
  BACKEND_BASE
} from './frontend-manifest.mjs';

const root = process.cwd();
const read = file => fs.readFile(path.join(root, file), 'utf8');

const sourceBootstrap = await read('app.js');
const marker = '(async function bootstrapDietaV2() {';
const markerIndex = sourceBootstrap.indexOf(marker);
if (markerIndex < 0) throw new Error('Nie znaleziono starego bootstrapu w app.js');
const startupBranding = sourceBootstrap.slice(0, markerIndex).trimEnd();

const gradle = await read('android-app/app/build.gradle');
const versionName = gradle.match(/versionName\s+['"]([^'"]+)['"]/)?.[1];
const versionCode = gradle.match(/versionCode\s+(\d+)/)?.[1];
if (!versionName || !versionCode) throw new Error('Nie udało się odczytać wersji z android-app/app/build.gradle');

const sectionMarker = title => `/* =====================================================\n   ${title}\n===================================================== */`;
function removeSection(source, title, nextTitle) {
  const startMarker = sectionMarker(title);
  const nextMarker = sectionMarker(nextTitle);
  const start = source.indexOf(startMarker);
  const end = source.indexOf(nextMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Nie udało się usunąć sekcji rdzenia: ${title}`);
  return source.slice(0, start) + source.slice(end);
}

function replaceBlock(source, startText, endText, replacement, moduleName) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start + startText.length);
  if (start < 0 || end < 0) throw new Error(`Nie znaleziono oczekiwanego bloku w ${moduleName}`);
  return source.slice(0, start) + replacement + '\n\n' + source.slice(end);
}

function centralizeEndpointLiterals(code) {
  const escaped = OLD_BACKEND_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const backendLiteral = new RegExp(`(['"])${escaped}([^'"\\n\\r]*)\\1`, 'g');
  return code.replace(backendLiteral, (_match, _quote, suffix) => {
    if (!suffix) return 'APP_CONFIG.backendBase';
    return `APP_CONFIG.backendBase + '${String(suffix).replace(/'/g, "\\'")}'`;
  });
}

function sanitizeAccountRecovery(code) {
  const hooks = `  AppHooks.on('beforeEnterApp', 'recovery-required-email', async () => {\n    const settingsData = await api('settings_get');\n    return requireEmailIfMissing(settingsData);\n  });`;
  code = replaceBlock(code, '  const baseEnterApp = enterApp;', '  function bindHandlers() {', hooks, 'account-recovery.js');
  code = code.replace("    if ($('claimProfileBtn')) $('claimProfileBtn').onclick = claimProfile;\n", '');
  code = code.replace("    if ($('createUserBtn')) $('createUserBtn').onclick = createUser;\n", '');
  code = code.replace(/\n    if \(state\.token\) \{\n      requireEmailIfMissing\(\)\.then\(ok => \{\n        if \(ok && document\.getElementById\('app'\)\?\.classList\.contains\('hidden'\)\) \{\n          document\.getElementById\('app'\)\?\.classList\.remove\('hidden'\);\n        \}\n      \}\);\n    \}/, '');
  return code;
}

function sanitizeLegalConsents(code) {
  const hooks = `  AppHooks.on('beforeCreateUser', 'legal-registration', async context => {\n    ensureRegistrationTerms();\n    const checked = document.getElementById('registrationTermsCheck')?.checked === true;\n    if (!checked) {\n      setAuthError('Aby utworzyć profil, zaakceptuj Regulamin aplikacji i potwierdź, że masz ukończone 18 lat.');\n      document.getElementById('registrationTermsCheck')?.focus();\n      return false;\n    }\n    return {\n      ...context,\n      payload: {\n        ...context.payload,\n        termsAccepted: true,\n        termsVersion: TERMS_VERSION,\n        appVersion: APP_VERSION\n      }\n    };\n  });\n\n  AppHooks.on('beforeApi', 'legal-ai-consent', async context => {\n    if (AI_ACTIONS.has(context.action)) {\n      const allowed = await ensureAiConsent();\n      if (!allowed) throw new Error('Analiza AI nie została uruchomiona.');\n    }\n    return context;\n  });\n\n  AppHooks.on('beforeEnterApp', 'legal-current-terms', async () => ensureCurrentTerms());\n\n  AppHooks.on('afterEnterApp', 'legal-ui', async () => {\n    ensureSettingsPanel();\n    ensureEstimateNote();\n    try { await refreshConsents(); } catch (_) {}\n  });\n\n  AppHooks.on('clearSession', 'legal-reset-state', () => {\n    consentState = { loaded: false, termsAccepted: false, aiConsentAccepted: false };\n    termsPromise = null;\n    aiPromise = null;\n  });`;
  return replaceBlock(code, '  const baseCreateUser = createUser;', '  function initLegal() {', hooks, 'legal-consents.js');
}

function sanitizeMonetization(code) {
  const hooks = `  AppHooks.on('beforeApi', 'monetization-access', async context => {\n    if ((context.action === 'analyze_text' || context.action === 'analyze_photo') && isNative()) {\n      const allowed = await ensureAiAccess();\n      if (!allowed) throw new Error('Analiza została anulowana.');\n    }\n    return context;\n  });\n\n  AppHooks.on('afterApi', 'monetization-after-action', async context => {\n    await handleAfterAction(context.action, context.response);\n    return context;\n  });\n\n  AppHooks.on('afterEnterApp', 'monetization-status', async () => {\n    ensurePlanPanel();\n    await refreshMonetizationStatus();\n  });`;
  code = replaceBlock(code, '  const baseApi = api;', '  function initMonetization() {', hooks, 'monetization-client.js');
  code = code.replace("    if (state?.token) refreshMonetizationStatus();\n", '');
  return code;
}

function sanitizeWaterTracker(code) {
  const hooks = `  AppHooks.on('beforeApi', 'water-settings-payload', context => {\n    if (context.action !== 'settings_update') return context;\n    if (context.payload.dailyWaterTargetMl !== undefined && context.payload.dailyWaterTargetMl !== '') return context;\n    return {\n      ...context,\n      payload: {\n        ...context.payload,\n        dailyWaterTargetMl: el('setWater')?.value || 2500\n      }\n    };\n  });\n\n  AppHooks.on('afterApi', 'water-response-ui', context => {\n    if (context.action === 'dashboard' && context.response?.water) renderWater(context.response);\n    if (context.action === 'settings_get') {\n      ensureWaterFields();\n      if (el('setWater')) el('setWater').value = context.response?.settings?.dailyWaterTargetMl ?? 2500;\n    }\n    return context;\n  });`;
  code = replaceBlock(code, '  const baseLoadDashboard = loadDashboard;', '  function bindGoalCalculator() {', hooks, 'water-tracker.js');
  code = code.replace("    if (el('createUserBtn')) el('createUserBtn').onclick = createUser;\n", '');
  code = code.replace("    if (el('saveSettingsBtn')) el('saveSettingsBtn').onclick = saveSettings;\n", '');
  return code;
}

function sanitizeHydrationDisplay(code) {
  const hook = `  AppHooks.on('afterApi', 'hydration-breakdown', context => {\n    if (context.action === 'dashboard' && context.response?.water) {\n      latestWater = context.response.water;\n      setTimeout(() => applyWaterBreakdown(context.response.water), 0);\n    }\n    return context;\n  });`;
  return replaceBlock(code, '  const baseApiForHydration = api;', '  function init() {', hook, 'hydration-display.js');
}

function sanitizeHistoryHydration(code) {
  const hook = `  AppHooks.on('afterApi', 'history-hydration', context => {\n    if (context.action === 'history' && context.response?.success) {\n      latestHistory = context.response;\n      setTimeout(() => renderHistoryHydration(context.response), 0);\n    }\n    return context;\n  });`;
  return replaceBlock(code, '  const baseApiForHistoryHydration = api;', '  injectStyles();', hook, 'history-hydration.js');
}

function sanitizeThemeManager(code) {
  const themeHooks = `  AppHooks.on('beforeEnterApp', 'theme-local', () => {\n    if (state?.profile?.userId) applyTheme(localTheme(), { remember: false });\n  });\n  AppHooks.on('afterEnterApp', 'theme-sync', async () => {\n    ensureUi();\n    await syncTheme();\n  });\n  AppHooks.on('clearSession', 'theme-clear', () => forceAuthDark());\n  `;
  code = replaceBlock(
    code,
    '  const baseEnterApp=enterApp;',
    "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUi,{once:true});else ensureUi();",
    themeHooks,
    'theme-manager.js/theme'
  );

  const accountHook = `AppHooks.on('afterEnterApp', 'account-ui', () => { ensureAccountUi(); }); `;
  code = replaceBlock(
    code,
    'const baseEnterAppAccount=enterApp;',
    "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureAccountUi,{once:true});else ensureAccountUi();",
    accountHook,
    'theme-manager.js/account'
  );
  return code;
}

function sanitizePhotoCompression(code) {
  const hook = `  AppHooks.on('beforeApi', 'photo-preprocessing', async context => {\n    if (context.action !== 'analyze_photo' || !context.file) return context;\n    let uploadFile = context.file;\n    if (typeof loading === 'function') {\n      loading(true, 'Analizuję zdjęcie…', 'Przygotowuję zdjęcie do wysłania.');\n    }\n    await nextPaint();\n    try {\n      uploadFile = await optimizePhoto(context.file);\n    } catch (error) {\n      console.warn('Photo preprocessing failed; checking original fallback.', error);\n      if (!canSendOriginal(context.file)) {\n        throw new Error(\n          Number(context.file?.size || 0) > MAX_ORIGINAL_FALLBACK_BYTES\n            ? 'Zdjęcie jest zbyt duże. Zrób zdjęcie ponownie.'\n            : 'Nie udało się odczytać zdjęcia. Zrób zdjęcie ponownie.'\n        );\n      }\n      uploadFile = context.file;\n    }\n    return { ...context, file: uploadFile };\n  });`;
  return replaceBlock(code, "  if (typeof analyzePhoto !== 'function') {", '})();', hook, 'photo-compression.js');
}

function sanitizePwaLoginSafety(code) {
  const clean = `  function bindPwaLoginSafety() {\n    installRegressionFixes();\n    if (embeddedBrowser()) return;\n    document.getElementById('authScreen')?.classList.remove('install-only');\n  }`;
  return replaceBlock(code, '  function bindPwaLoginSafety() {', "  if (document.readyState === 'loading') {", clean, 'pwa-login-safety.js');
}

function sanitizeModule(moduleName, code) {
  code = centralizeEndpointLiterals(code);
  code = code.replace(/^\s*const APP_VERSION\s*=\s*['"][^'"]+['"];\s*$/gm, '');

  if (moduleName === 'account-recovery.js') return sanitizeAccountRecovery(code);
  if (moduleName === 'legal-consents.js') return sanitizeLegalConsents(code);
  if (moduleName === 'monetization-client.js') return sanitizeMonetization(code);
  if (moduleName === 'water-tracker.js') return sanitizeWaterTracker(code);
  if (moduleName === 'hydration-display.js') return sanitizeHydrationDisplay(code);
  if (moduleName === 'history-hydration.js') return sanitizeHistoryHydration(code);
  if (moduleName === 'theme-manager.js') return sanitizeThemeManager(code);
  if (moduleName === 'photo-compression.js') return sanitizePhotoCompression(code);
  if (moduleName === 'pwa-login-safety.js') return sanitizePwaLoginSafety(code);
  return code;
}

let core = await read(CORE_MODULE);
const tokenKeyIndex = core.indexOf('const TOKEN_KEY =');
if (tokenKeyIndex < 0) throw new Error('Nie znaleziono początku właściwego rdzenia przy TOKEN_KEY');
core = core.slice(tokenKeyIndex);
core = removeSection(core, 'HTTP', 'SESSION');
core = removeSection(core, 'SESSION', 'AUTH / USERS');
core = removeSection(core, 'AUTH / USERS', 'NAV');
core = removeSection(core, 'ENTER APP', 'INIT');

const oldInitHook = `document.addEventListener(\n  'DOMContentLoaded',\n  init\n);`;
if (!core.includes(oldInitHook)) throw new Error('Nie znaleziono starego init hooka rdzenia');
core = core.replace(oldInitHook, '');

core = core.replace(
  /const hideSplash = \(\) =>\s*hide\('startSplash'\);/,
  `const hideSplash = (() => {\n  let splashHideTimer = null;\n  return () => {\n    const remaining = Math.max(0, 2100 - performance.now());\n    if (splashHideTimer) clearTimeout(splashHideTimer);\n    if (remaining > 0) splashHideTimer = setTimeout(() => hide('startSplash'), remaining);\n    else hide('startSplash');\n  };\n})();`
);
core = core.replace(`./sw.js?v=20260814-13`, `./sw.js?v=${BUILD_ID}`);
core = core.replace(
  /\/\*\s*W przeglądarce pokazujemy tylko instalację PWA\.[\s\S]*?\$\('authScreen'\)\s*\?\.classList\.remove\(\s*'install-only'\s*\);\s*\n\s*refreshInstallButtons\(\);/,
  `/* Logowanie i odtwarzanie sesji działają zarówno w przeglądarce, jak i w zainstalowanej PWA. */\n\n  $('authScreen')?.classList.remove('install-only');\n  refreshInstallButtons();`
);

const runtime = await read(RUNTIME_MODULE);
const extensionNames = MODULES.filter(name => name !== CORE_MODULE && name !== RUNTIME_MODULE);
const extensions = [];
for (const moduleName of extensionNames) {
  const code = sanitizeModule(moduleName, await read(moduleName));
  extensions.push(`\ntry {\n${code}\n} catch (error) {\n  console.error('Dieta V2 extension failed: ${moduleName}', error);\n}\n`);
}

const config = `window.__WCZ_APP_CONFIG__ = Object.freeze({\n  buildId: '${BUILD_ID}',\n  versionName: '${versionName}',\n  versionCode: ${Number(versionCode)},\n  backendBase: '${BACKEND_BASE}',\n  endpoint(route) { return this.backendBase + '/webhook/' + String(route || '').replace(/^\\/+/, ''); }\n});`;

const startOnce = `\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', init, { once: true });\n} else {\n  init();\n}\n`;

const bundle = `${startupBranding}\n\n/* GENERATED FILE - ${BUILD_ID}\n * Source of truth: root modules + tools/frontend-manifest.mjs + Android version metadata.\n * Runtime fetch/eval and layered global overrides intentionally removed.\n */\n\n${config}\n\n${core}\n\n${runtime}\n${extensions.join('\n')}\n${startOnce}`;

if (/\(0,\s*eval\)|\beval\s*\(/.test(bundle)) throw new Error('W wygenerowanym bundle pozostał eval');
if (bundle.includes('modules.map(url => fetch')) throw new Error('W wygenerowanym bundle pozostał runtime module fetch');
if (bundle.includes(OLD_BACKEND_BASE)) throw new Error('W bundle pozostał stary backend host');

await fs.writeFile(path.join(root, 'app.bundle.js'), bundle, 'utf8');
console.log(`Built app.bundle.js (${Buffer.byteLength(bundle)} bytes), modules=${MODULES.length}, build=${BUILD_ID}, version=${versionName}(${versionCode})`);
