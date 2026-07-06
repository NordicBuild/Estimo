const fs = require('fs');
const file = '/app/applet/src/stores/useBIMStore.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/  setParsedMeshes: \(meshes\?\: ParsedIfcModel\['meshes'\]\) => void;/, `  setParsedMeshes: (meshes?: ParsedIfcModel['meshes']) => void;
  setActiveModelLocal: (modelId: string, elements: BIMElement[], meshes: ParsedIfcModel['meshes']) => void;`);

code = code.replace(/        setParsedMeshes: \(meshes\) => set\(\{ parsedMeshes: meshes \}\),/, `        setParsedMeshes: (meshes) => set({ parsedMeshes: meshes }),
        setActiveModelLocal: (modelId, elements, meshes) => set({
          activeModelId: modelId,
          elements: elements,
          parsedMeshes: meshes,
          modelUrl: null,
          loading: false,
          error: null
        }),`);

fs.writeFileSync(file, code);
console.log('Patched useBIMStore.ts activeModelLocal');
