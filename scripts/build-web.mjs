import { cp, mkdir, rm } from 'node:fs/promises';

const files = [
  'index.html',
  'styles.css',
  'theme-light.css',
  'app.js',
  'app-core-v13.js',
  'auth-login-v2.js',
  'confirm-modal.js',
  'analysis-item-removal.js',
  'analysis-cancel.js',
  'photo-compression.js',
  'install-flow-fix.js',
  'goals-calculator.js',
  'account-recovery.js',
  'water-tracker.js',
  'water-compat.js',
  'water-performance.js',
  'hydration-display.js',
  'history-hydration.js',
  'day-refresh.js',
  'theme-manager.js',
  'native-bootstrap.js',
  'manifest.webmanifest',
  'sw.js',
  'icon.svg',
  'icon-192.png',
  'icon-512.png'
];

await rm('www', { recursive: true, force: true });
await mkdir('www', { recursive: true });

for (const file of files) {
  await cp(file, `www/${file}`);
}

console.log(`Native web bundle prepared in www/ (${files.length} files).`);
