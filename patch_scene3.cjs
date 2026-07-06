const fs = require('fs');
const file = '/app/applet/src/bim/3d/BIMScene.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const elementId = mesh\.userData\?\.guid \|\| mesh\.name \|\| mesh\.uuid;/, `const elementId = mesh.userData?.expressID !== undefined ? String(mesh.userData.expressID) : (mesh.userData?.guid || mesh.name || mesh.uuid);`);

fs.writeFileSync(file, code);
console.log('Patched BIMScene.ts loadGLB expressID');
