import fs from 'node:fs/promises';
import path from 'node:path';
import { BUILD_ID, MODULES, OLD_BACKEND_BASE, BACKEND_BASE } from './frontend-manifest.mjs';

const root = process.cwd();
const read = file => fs.readFile(path.join(root, file), 'utf8');

const sourceBootstrap = await read('app.js');
const marker = '(async function bootstrapDietaV2() {';
const markerIndex = sourceBootstrap.indexOf(marker);
if (markerIndex < 0) throw new Error('Nie znaleziono starego bootstrapu w app.js');

// Zachowujemy branding/splash 1:1, usuwamy wyłącznie runtime loader.
const startupBranding = sourceBootstrap.slice(0, markerIndex).trimEnd();

const moduleSources = [];
for (const moduleName of MODULES) {
  let code = await read(moduleName);
  code = code.split(OLD_BACKEND_BASE).join(BACKEND_BASE);
  moduleSources.push(code);
}

let core = moduleSources[0];
const authOverride = moduleSources[1];
const extensions = moduleSources.slice(2);
const extensionNames = MODULES.slice(2);

// Te transformacje są celowo identyczne z ostatnim kompletnym bootstrapem 1.1.10.
const oldInitHook = `document.addEventListener(\n  'DOMContentLoaded',\n  init\n);`;
core = core.replace(oldInitHook, '');

core = core.replace(
  /const hideSplash = \(\) =>\s*hide\('startSplash'\);/,
  `const hideSplash = (() => {\n  let splashHideTimer = null;\n  return () => {\n    const remaining = Math.max(0, 2100 - performance.now());\n    if (splashHideTimer) clearTimeout(splashHideTimer);\n    if (remaining > 0) {\n      splashHideTimer = setTimeout(() => hide('startSplash'), remaining);\n    } else {\n      hide('startSplash');\n    }\n  };\n})();`
);

core = core.replace(`./sw.js?v=20260814-13`, `./sw.js?v=${BUILD_ID}`);

core = core.replace(
  /\/\*\s*W przeglądarce pokazujemy tylko instalację PWA\.[\s\S]*?\$\('authScreen'\)\s*\?\.classList\.remove\(\s*'install-only'\s*\);\s*\n\s*refreshInstallButtons\(\);/,
  `/* Logowanie i odtwarzanie sesji działają zarówno w przeglądarce, jak i w zainstalowanej PWA. */\n\n  $('authScreen')\n    ?.classList.remove(\n      'install-only'\n    );\n\n  refreshInstallButtons();`
);

const startOnce = `\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', init, { once: true });\n} else {\n  init();\n}\n`;

const isolatedExtensions = extensions.map((code, index) => `\ntry {\n${code}\n} catch (error) {\n  console.error('Dieta V2 extension failed: ${extensionNames[index]}', error);\n}\n`).join('\n');

const bundle = `${startupBranding}\n\n/* GENERATED FILE - ${BUILD_ID}\n * Source of truth: root frontend modules + tools/frontend-manifest.mjs\n * Runtime fetch/eval intentionally removed.\n */\n\n${core}\n${authOverride}\n${startOnce}\n${isolatedExtensions}\n`;

if (/\(0,\s*eval\)|\beval\s*\(/.test(bundle)) {
  throw new Error('W wygenerowanym bundle pozostał eval');
}
if (bundle.includes('modules.map(url => fetch')) {
  throw new Error('W wygenerowanym bundle pozostał runtime module fetch');
}

await fs.writeFile(path.join(root, 'app.bundle.js'), bundle, 'utf8');
console.log(`Built app.bundle.js (${Buffer.byteLength(bundle)} bytes), modules=${MODULES.length}, build=${BUILD_ID}`);
