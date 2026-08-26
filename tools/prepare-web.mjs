import fs from 'node:fs/promises';
import path from 'node:path';
import { BUILD_ID, MODULES } from './frontend-manifest.mjs';

const root = process.cwd();
const dist = path.join(root, 'dist');
const exists = async p => fs.access(p).then(() => true).catch(() => false);

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });

const excludedTop = new Set([
  '.git', '.github', 'android-app', 'tools', 'dist',
  'RELEASE_BASELINE_GOOGLE_PLAY_RC.md', '_tmp-ignore.txt',
  'app.js', 'app.bundle.js', ...MODULES
]);

async function copyEntry(src, dst) {
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    await fs.mkdir(dst, { recursive: true });
    for (const name of await fs.readdir(src)) {
      await copyEntry(path.join(src, name), path.join(dst, name));
    }
    return;
  }
  if (stat.isFile()) await fs.copyFile(src, dst);
}

for (const name of await fs.readdir(root)) {
  if (excludedTop.has(name)) continue;
  await copyEntry(path.join(root, name), path.join(dist, name));
}

const bundlePath = path.join(root, 'app.bundle.js');
if (!(await exists(bundlePath))) throw new Error('Brak app.bundle.js. Najpierw uruchom build-frontend.mjs');
await fs.copyFile(bundlePath, path.join(dist, 'app.bundle.js'));

const indexPath = path.join(root, 'index.html');
let index = await fs.readFile(indexPath, 'utf8');

const staticBrandLinks = [
  '<link id="brandRedesignStyles" rel="stylesheet" href="./brand-redesign.css?v=20260820-brand2">',
  '<link id="brandRedesignPolishStyles" rel="stylesheet" href="./brand-redesign-polish.css?v=20260820-brand2">',
  '<link id="brandFunctionalFixes" rel="stylesheet" href="./brand-functional-fixes.css?v=20260820-fix2">'
].join('\n  ');

if (!index.includes('id="brandRedesignStyles"')) {
  index = index.replace('</head>', `  ${staticBrandLinks}\n</head>`);
}

index = index.replace(
  /<script\s+src="app\.js\?[^\"]+"\s+defer><\/script>/,
  `<script src="app.bundle.js?v=${BUILD_ID}" defer></script>`
);

if (!index.includes(`app.bundle.js?v=${BUILD_ID}`)) {
  throw new Error('Nie udało się przełączyć index.html na app.bundle.js');
}
await fs.writeFile(path.join(dist, 'index.html'), index, 'utf8');

let sw = await fs.readFile(path.join(root, 'sw.js'), 'utf8');
sw = sw.replace(/'wiem-co-zre-m-ai-[^']+'/, `'wiem-co-zre-m-ai-${BUILD_ID}'`);
sw = sw.replace(/'\.\/app\.js\?[^']+'/, `'./app.bundle.js?v=${BUILD_ID}'`);
sw = sw.replace(/^\s*'\.\/pwa-login-safety\.js\?[^']+',?\s*$/gm, '');
sw = sw.replace(/^\s*'\.\/editor-portal\.js\?[^']+',?\s*$/gm, '');
await fs.writeFile(path.join(dist, 'sw.js'), sw, 'utf8');

console.log(`Prepared dist/ for ${BUILD_ID}`);
