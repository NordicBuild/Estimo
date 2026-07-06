const fs = require('fs');
const file = '/app/applet/src/components/BIMLeftPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/      setParsedMeshes\(parsedModel\.meshes\);\n      setModelName\(file\.name\);\n      \n      \/\/ Load active model from DB\n      await setActiveModel\(modelId\);/, `      setModelName(file.name);
      
      // Load active model from DB
      await setActiveModel(modelId);
      
      // Set parsed meshes after setActiveModel clears them
      setParsedMeshes(parsedModel.meshes);`);

fs.writeFileSync(file, code);
console.log('Patched BIMLeftPanel.tsx');
