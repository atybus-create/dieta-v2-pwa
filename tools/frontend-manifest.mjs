export const BUILD_ID = '20260826-google-play-rc-android1';

export const OLD_BACKEND_BASE = 'https://n8n-pi.taild8d05f.ts.net';
export const BACKEND_BASE = 'https://api.atybuslab.com';

// Kolejność jest kontraktem zgodności z ostatnią kompletną wersją APK 1.1.10.
// Nie zmieniać kolejności bez pełnego testu regresji.
export const MODULES = Object.freeze([
  'app-core-v13.js',
  'auth-login-v2.js',
  'splash-visual-v2.js',
  'confirm-modal.js',
  'analysis-item-removal.js',
  'analysis-item-addition.js',
  'analysis-cancel.js',
  'photo-compression.js',
  'install-flow-fix.js',
  'goals-calculator.js',
  'account-recovery.js',
  'recovery-complete-message.js',
  'water-tracker.js',
  'water-compat.js',
  'water-performance.js',
  'hydration-display.js',
  'history-hydration.js',
  'theme-manager.js',
  'legal-consents.js',
  'dashboard-layout-v2.js',
  'dashboard-expand.js',
  'favorites-editor.js',
  'add-text-overlay.js',
  'today-meal-editor.js',
  'overlay-history.js',
  'refresh-controller.js',
  'editor-portal.js',
  'pwa-login-safety.js',
  'registration-complete.js',
  'native-platform.js',
  'monetization-client.js'
]);
