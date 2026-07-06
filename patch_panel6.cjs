const fs = require('fs');
const file = '/app/applet/src/components/BIMLeftPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const glbBuffer = gltf;/, 'const glbBuffer = gltf as ArrayBuffer;');

fs.writeFileSync(file, code);
console.log('Patched BIMLeftPanel.tsx glbBuffer cast');
