const fs = require('fs');
const file = '/app/applet/src/components/BIMLeftPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/  const setActiveModel = useBIMStore\(\(state\) => state\.setActiveModel\);/, `  const setActiveModel = useBIMStore((state) => state.setActiveModel);
  const setActiveModelLocal = useBIMStore((state) => state.setActiveModelLocal);`);

code = code.replace(/      setModelName\(file\.name\);\n      \n      \/\/ Load active model from DB\n      await setActiveModel\(modelId\);\n      \n      \/\/ Set parsed meshes after setActiveModel clears them\n      setParsedMeshes\(parsedModel\.meshes\);/, `      setModelName(file.name);
      
      // Load active model locally to avoid roundtrip
      setActiveModelLocal(modelId, newElements as any, parsedModel.meshes);`);

fs.writeFileSync(file, code);
console.log('Patched BIMLeftPanel.tsx use setActiveModelLocal');
