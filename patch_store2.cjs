const fs = require('fs');
const file = '/app/applet/src/stores/useBIMStore.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/export interface BIMState \{/, `import type { ParsedIfcModel } from '../bim/ifc/parseIfc';

export interface BIMState {
  parsedMeshes?: ParsedIfcModel['meshes'];`);

code = code.replace(/  setModelName: \(name: string\) => void;\n\}/, `  setModelName: (name: string) => void;
  setParsedMeshes: (meshes?: ParsedIfcModel['meshes']) => void;
}`);

code = code.replace(/        modelName: 'Exempelmodell \(Mock\)',/, `        modelName: 'Exempelmodell (Mock)',
        parsedMeshes: undefined,`);

code = code.replace(/        setModelName: \(name\) => set\(\{ modelName: name \}\),/, `        setModelName: (name) => set({ modelName: name }),
        setParsedMeshes: (meshes) => set({ parsedMeshes: meshes }),`);

fs.writeFileSync(file, code);
console.log('Patched useBIMStore.ts');
