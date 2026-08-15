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
      './app-core-v13.js?v=20260815-extfix1',
      './auth-login-v2.js?v=20260815-extfix1',
      './confirm-modal.js?v=20260815-extfix1',
      './analysis-item-removal.js?v=20260815-extfix1',
      './analysis-cancel.js?v=20260815-extfix1',
      './photo-compression.js?v=20260815-extfix1',
      './install-flow-fix.js?v=20260815-extfix1',
      './goals-calculator.js?v=20260815-extfix1',
      './account-recovery.js?v=20260815-recovery1',
      './water-tracker.js?v=20260815-water1'
    ];

    const responses = await Promise.all(
      modules.map(url => fetch(url, { cache: 'no-store' }))
    );

    const failed = responses.findIndex(response => !response.ok);
    if (failed !== -1) {
      throw new Error(`Nie udało się pobrać modułu aplikacji: ${modules[failed]}`);
    }

    const texts = await Promise.all(responses.map(response => response.text()));
    let core = texts[0];
    const authOverride = texts[1];
    const extensions = texts.slice(2);

    const oldInitHook = `document.addEventListener(\n  'DOMContentLoaded',\n  init\n);`;
    core = core.replace(oldInitHook, '');

    // Rejestrujemy start rdzenia przed rozszerzeniami, tak jak w poprzednim
    // układzie zwykłych skryptów defer. Gdy DOM jest już gotowy, init rusza
    // od razu, a rozszerzenia inicjalizują się zaraz po nim.
    const startOnce = `\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', init, { once: true });\n} else {\n  init();\n}\n`;

    (0, eval)(
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
