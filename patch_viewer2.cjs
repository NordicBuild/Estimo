const fs = require('fs');
const file = '/app/applet/src/components/BIM3DViewer.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/      elements\.forEach\(el => \{\n        const isVisible = visibleIds\.has\(el\.id\);\n        if \(el\.properties\?\.ExpressID\) \{\n          sceneRef\.current\?\.setElementVisibility\(\`Element_\$\{el\.properties\.ExpressID\}\`, isVisible\);\n          \/\/ also try node format if mesh was selected\n          sceneRef\.current\?\.setElementVisibility\(\`Mesh_\$\{el\.properties\.ExpressID\}\`, isVisible\);\n        \} else \{\n          sceneRef\.current\?\.setElementVisibility\(el\.id, isVisible\);\n        \}\n      \}\);/, `      elements.forEach(el => {
        const isVisible = visibleIds.has(el.id);
        if (el.properties?.ExpressID !== undefined) {
          sceneRef.current?.setElementVisibility(String(el.properties.ExpressID), isVisible);
          // fallbacks
          sceneRef.current?.setElementVisibility(\`Element_\${el.properties.ExpressID}\`, isVisible);
          sceneRef.current?.setElementVisibility(\`Mesh_\${el.properties.ExpressID}\`, isVisible);
        } else {
          sceneRef.current?.setElementVisibility(el.id, isVisible);
        }
      });`);

fs.writeFileSync(file, code);
console.log('Patched BIM3DViewer.tsx visibility');
