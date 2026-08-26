import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const androidWeb = path.join(root, 'android-app/app/src/main/assets/www');

await fs.access(path.join(dist, 'index.html'));
await fs.access(path.join(dist, 'app.bundle.js'));

await fs.rm(androidWeb, { recursive: true, force: true });
await fs.mkdir(path.dirname(androidWeb), { recursive: true });
await fs.cp(dist, androidWeb, { recursive: true });

console.log('Android web assets synchronized from dist/');
