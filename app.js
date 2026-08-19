/*
  Dieta V2 bootstrap.
  Ładuje zachowany rdzeń aplikacji, bezpieczniejszy mechanizm logowania
  oraz wszystkie rozszerzenia frontendu w jednym wspólnym zakresie.
  Dzięki temu rozszerzenia mają dostęp do funkcji i stanu rdzenia także
  po przejściu na asynchroniczny bootstrap.
*/
(async function bootstrapDietaV2() {
  try {
    const modules = [
      './app-core-v13.js?v=20260816-pwalogin1',
      './auth-login-v2.js?v=20260816-pwalogin1',
      './confirm-modal.js?v=20260815-extfix1',
      './analysis-item-removal.js?v=20260815-grams2',
      './analysis-item-addition.js?v=20260819-addingredient1',
      './analysis-cancel.js?v=20260815-extfix1',
      './photo-compression.js?v=20260815-extfix1',
      './install-flow-fix.js?v=20260815-extfix1',
      './goals-calculator.js?v=20260815-extfix1',
      './account-recovery.js?v=20260815-recovery1',
      './recovery-complete-message.js?v=20260816-recovery2',
      './water-tracker.js?v=20260815-water1',
      './water-compat.js?v=20260815-water2',
      './water-performance.js?v=20260815-water3',
      './hydration-display.js?v=20260815-hydration1',
      './history-hydration.js?v=20260815-history-hydration1',
      './theme-manager.js?v=20260815-theme1',
      './dashboard-layout-v2.js?v=20260819-rootfix2',
      './dashboard-expand.js?v=20260819-expand1',
      './pwa-login-safety.js?v=20260816-pwalogin1'
    ];

    const responses = await Promise.all(
      modules.map(url => fetch(url, { cache: 'no-store' }))
    );

    const failed = responses.findIndex(response => !response.ok);
    if (failed !== -1) {
      throw new Error(`Nie udało się pobrać modułu aplikacji: ${modules[failed]}`);
    }

    const texts = await Promise.all(responses.map(response => response.text()));
    const oldBackendBase = 'https://n8n-pi.taild8d05f.ts.net';
    const backendBase = 'https://n8n-pi.taild8d05f.ts.net';
    const routedTexts = texts.map(code => code.split(oldBackendBase).join(backendBase));

    let core = routedTexts[0];
    const authOverride = routedTexts[1];
    const extensions = routedTexts.slice(2);
    const extensionUrls = modules.slice(2);

    const oldInitHook = `document.addEventListener(\n  'DOMContentLoaded',\n  init\n);`;
    core = core.replace(oldInitHook, '');

    const startOnce = `\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', init, { once: true });\n} else {\n  init();\n}\n`;

    const isolatedExtensions = extensions
      .map((code, index) => `\ntry {\n${code}\n} catch (error) {\n  console.error('Dieta V2 extension failed: ${extensionUrls[index]}', error);\n}\n`)
      .join('\n');

    (0, eval)(
      core +
      '\n' +
      authOverride +
      startOnce +
      isolatedExtensions
    );
  } catch (error) {
    console.error('Dieta V2 bootstrap error:', error);
    const splash = document.getElementById('startSplash');
    if (splash) splash.classList.add('hidden');
    const authError = document.getElementById('authError');
    if (authError) {
      authError.textContent = 'Nie udało się uruchomić aplikacji. Odśwież stronę.';
      authError.classList.remove('hidden');
    }
    const authScreen = document.getElementById('authScreen');
    if (authScreen) authScreen.classList.remove('hidden');
  }
})();