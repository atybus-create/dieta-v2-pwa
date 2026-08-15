/*
  Dieta V2 bootstrap.
  Zachowuje poprzedni frontend w app-core-v13.js i nakłada wyłącznie
  bezpieczniejszy mechanizm logowania z auth-login-v2.js.
*/
(async function bootstrapDietaV2() {
  try {
    const [coreResponse, authResponse] = await Promise.all([
      fetch('./app-core-v13.js?v=20260815-auth1', { cache: 'no-store' }),
      fetch('./auth-login-v2.js?v=20260815-auth1', { cache: 'no-store' })
    ]);

    if (!coreResponse.ok || !authResponse.ok) {
      throw new Error('Nie udało się pobrać modułów aplikacji.');
    }

    let core = await coreResponse.text();
    const authOverride = await authResponse.text();

    const oldInitHook = `document.addEventListener(\n  'DOMContentLoaded',\n  init\n);`;
    core = core.replace(oldInitHook, '');

    const startOnce = `\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', init, { once: true });\n} else {\n  init();\n}\n`;

    (0, eval)(core + '\n' + authOverride + startOnce);
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
