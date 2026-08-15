/*
  Dieta V2 bootstrap.
  Ładuje zachowany rdzeń aplikacji, bezpieczniejszy mechanizm logowania
  oraz wszystkie rozszerzenia frontendu w jednym wspólnym zakresie.
  Dzięki temu rozszerzenia mają dostęp do funkcji i stanu rdzenia także
  po przejściu na asynchroniczny bootstrap.
*/
(async function bootstrapDietaV2() {
  try {
    const nativeBridgeUrl =
      './native-bootstrap.js?v=20260815-capacitor1';

    const modules = [
      './app-core-v13.js?v=20260815-extfix1',
      './auth-login-v2.js?v=20260815-extfix1',
      './confirm-modal.js?v=20260815-extfix1',
      './analysis-item-removal.js?v=20260815-grams2',
      './analysis-cancel.js?v=20260815-extfix1',
      './photo-compression.js?v=20260815-extfix1',
      './install-flow-fix.js?v=20260815-extfix1',
      './goals-calculator.js?v=20260815-extfix1',
      './account-recovery.js?v=20260815-recovery1',
      './water-tracker.js?v=20260815-water1',
      './water-compat.js?v=20260815-water2',
      './water-performance.js?v=20260815-water3',
      './hydration-display.js?v=20260815-hydration1',
      './history-hydration.js?v=20260815-history-hydration1',
      './theme-manager.js?v=20260815-theme1'
    ];

    const responses = await Promise.all(
      [nativeBridgeUrl, ...modules].map(url =>
        fetch(url, { cache: 'no-store' })
      )
    );

    const failed = responses.findIndex(response => !response.ok);
    if (failed !== -1) {
      const failedUrl = [nativeBridgeUrl, ...modules][failed];
      throw new Error(`Nie udało się pobrać modułu aplikacji: ${failedUrl}`);
    }

    const texts = await Promise.all(responses.map(response => response.text()));
    const nativeBridge = texts[0];
    let core = texts[1];
    const authOverride = texts[2];
    const extensions = texts.slice(3);

    const oldInitHook = `document.addEventListener(\n  'DOMContentLoaded',\n  init\n);`;
    core = core.replace(oldInitHook, '');

    const startOnce = `\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', init, { once: true });\n} else {\n  init();\n}\n`;

    (0, eval)(
      nativeBridge +
      '\n' +
      core +
      '\n' +
      authOverride +
      startOnce +
      '\n' +
      extensions.join('\n')
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
