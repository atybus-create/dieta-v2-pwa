export const BUILD_ID = '20260826-google-play-rc-stage3';

export const OLD_BACKEND_BASE = 'https://n8n-pi.taild8d05f.ts.net';
export const BACKEND_BASE = 'https://api.atybuslab.com';

export const CORE_MODULE = 'app-core-v13.js';
export const RUNTIME_MODULE = 'canonical-runtime.js';

// Kolejność jest jawna i deterministyczna. Moduły oznaczone jako stare warstwy
// (auth-login-v2, water-compat, water-performance, registration-complete)
// nie są częścią finalnego bundle Etapu 3.
export const MODULES = Object.freeze([
  CORE_MODULE,
  RUNTIME_MODULE,
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
  'native-platform.js',
  'monetization-client.js'
]);
