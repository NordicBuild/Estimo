const fs = require('fs');
const file = '/app/applet/src/stores/useBIMStore.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/          set\(\{ activeModelId: modelId, loading: true, error: null \}\);/, `          set({ activeModelId: modelId, loading: true, error: null, parsedMeshes: undefined });`);

fs.writeFileSync(file, code);
console.log('Patched useBIMStore.ts activeModel');
