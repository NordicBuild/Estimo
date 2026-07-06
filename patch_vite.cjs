const fs = require('fs');
const file = '/app/applet/vite.config.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{ defineConfig, loadEnv \} from 'vite';\nimport react from '@vitejs\/plugin-react';\nimport path from 'path';\n\nexport default defineConfig\(\(\{ mode \}\) => \{\n  const env = loadEnv\(mode, process\.cwd\(\), ''\);\n  return \{\n    plugins: \[\n      react\(\)\n    \],/, `import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/web-ifc/web-ifc.wasm',
            dest: 'wasm'
          }
        ]
      })
    ],`);

fs.writeFileSync(file, code);
console.log('Patched vite.config.ts');
