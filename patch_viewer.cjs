const fs = require('fs');
const file = '/app/applet/src/components/BIM3DViewer.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/    const selectedElementIds = useBIMStore\(\(state\) => state\.selectedElementIds\);/, `    const parsedMeshes = useBIMStore((state) => state.parsedMeshes);
    const selectedElementIds = useBIMStore((state) => state.selectedElementIds);`);

code = code.replace(/      loadModel\(\);\n\n      return \(\) => \{\n        isCancelled = true;\n      \};\n    \}, \[modelId, modelUrl, elements\.length\]\);/, `      loadModel();

      return () => {
        isCancelled = true;
      };
    }, [modelId, modelUrl, elements.length]);

    // Handle parsed meshes from local parsing
    useEffect(() => {
      if (!sceneRef.current || !parsedMeshes || parsedMeshes.length === 0) return;
      sceneRef.current.loadParsedModel(parsedMeshes);
      sceneRef.current.frameAll();
    }, [parsedMeshes]);`);

code = code.replace(/    \/\/ Initialize Scene\n    useEffect\(\(\) => \{\n      if \(!canvasRef\.current\) return;/, `    // Initialize Scene
    useEffect(() => {
      if (!canvasRef.current) return;`);

code = code.replace(/          if \(elementId\) \{\n            \/\/ Try to find by ExpressID first \(assuming Element_XXX format\)\n            const expMatch = elementId\.match\(\/Element_\(\\d\+\)\/\);\n            const expressId = expMatch \? Number\(expMatch\[1\]\) : null;\n            \n            let foundEl = null;\n            if \(expressId \!== null\) \{\n               foundEl = elements\.find\(e => e\.properties\?\.ExpressID === expressId\);\n            \}\n            \n            if \(!foundEl\) \{\n               foundEl = elements\.find\(e => e\.id === elementId \|\| e\.guid === elementId \|\| e\.name === elementId\);\n            \}\n\n            if \(foundEl\) \{\n              selectElement\(foundEl\.id, false\);\n            \} else \{\n              \/\/ fallback\n              selectElement\(elementId, false\);\n            \}\n          \} else \{\n            deselectAll\(\);\n          \}/, `          if (elementId) {
            let foundEl = elements.find(e => String(e.properties?.ExpressID) === elementId);
            
            if (!foundEl) {
               // Fallbacks for older GLBs
               const expMatch = elementId.match(/Element_(\\d+)/);
               const expressId = expMatch ? Number(expMatch[1]) : null;
               if (expressId !== null) {
                 foundEl = elements.find(e => e.properties?.ExpressID === expressId);
               }
            }
            if (!foundEl) {
               foundEl = elements.find(e => e.id === elementId || e.guid === elementId || e.name === elementId);
            }

            if (foundEl) {
              selectElement(foundEl.id, false);
            } else {
              selectElement(elementId, false);
            }
          } else {
            deselectAll();
          }`);

code = code.replace(/    \/\/ Sync Selection\n    useEffect\(\(\) => \{\n      if \(\!sceneRef\.current\) return;\n      \n      sceneRef\.current\.deselectAll\(\);\n      selectedElementIds\.forEach\(id => \{\n        \/\/ Find the database element to get its ExpressID\n        const dbEl = elements\.find\(e => e\.id === id\);\n        if \(dbEl && dbEl\.properties\?\.ExpressID\) \{\n           sceneRef\.current\?\.selectElement\(\`Element_\$\{dbEl\.properties\.ExpressID\}\`\);\n        \} else \{\n           sceneRef\.current\?\.selectElement\(id\);\n        \}\n      \}\);\n    \}, \[selectedElementIds, elements\]\);/, `    // Sync Selection
    useEffect(() => {
      if (!sceneRef.current) return;
      
      sceneRef.current.deselectAll();
      selectedElementIds.forEach(id => {
        const dbEl = elements.find(e => e.id === id);
        if (dbEl && dbEl.properties?.ExpressID !== undefined) {
           sceneRef.current?.selectElement(String(dbEl.properties.ExpressID));
           // fallback for older GLBs
           sceneRef.current?.selectElement(\`Element_\${dbEl.properties.ExpressID}\`);
        } else {
           sceneRef.current?.selectElement(id);
        }
      });
    }, [selectedElementIds, elements]);`);

fs.writeFileSync(file, code);
console.log('Patched BIM3DViewer.tsx');
