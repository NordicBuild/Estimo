const fs = require('fs');
const file = '/app/applet/vite.config.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/src: 'node_modules\/web-ifc\/web-ifc\.wasm'/, "src: 'node_modules/web-ifc/*.wasm'");

fs.writeFileSync(file, code);
console.log('Patched vite.config.ts for all wasm');
