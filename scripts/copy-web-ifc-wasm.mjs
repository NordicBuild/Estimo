import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve('node_modules/web-ifc');
const DEST_DIR = path.resolve('public/wasm');

const filesToCopy = [
  'web-ifc.wasm',
  'web-ifc-mt.wasm',
  'web-ifc-mt.worker.js'
];

if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

console.log('Copying web-ifc WASM files...');

filesToCopy.forEach(file => {
  const srcFile = path.join(SRC_DIR, file);
  const destFile = path.join(DEST_DIR, file);

  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, destFile);
    const stats = fs.statSync(destFile);
    console.log(`Copied ${file} - Size: ${stats.size} bytes`);
  } else {
    console.warn(`Warning: Could not find ${srcFile}`);
  }
});

console.log('Done.');
