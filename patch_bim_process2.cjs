const fs = require('fs');
const file = 'supabase/functions/bim-process/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/        ifcApi\.StreamAllMeshes\(model, \(mesh: any\) => \{\n          if \(Date\.now\(\) - startTime > TIMEOUT_MS\) \{\n            isTimedOut = true;\n            return;\n          \}\n          \n          const expressID = mesh\.expressID;\n          const node = doc\.createNode\(\`Element_\$\{expressID\}\`\);\n          node\.setExtras\(\{ expressID \}\);\n          scene\.addChild\(node\);\n          \n          const gltfMesh = doc\.createMesh\(\`Mesh_\$\{expressID\}\`\);\n          node\.setMesh\(gltfMesh\);/, `        ifcApi.StreamAllMeshes(model, (mesh: any) => {
          if (Date.now() - startTime > TIMEOUT_MS) {
            isTimedOut = true;
            return;
          }
          
          try {
            const expressID = mesh.expressID;
            const node = doc.createNode(\`Element_\${expressID}\`);
            node.setExtras({ expressID });
            scene.addChild(node);
            
            const gltfMesh = doc.createMesh(\`Mesh_\${expressID}\`);
            node.setMesh(gltfMesh);`);

code = code.replace(/            gltfMesh\.addPrimitive\(prim\);\n          \}\n        \}\);/, `            gltfMesh.addPrimitive(prim);
          }
          } catch (meshErr) {
            console.warn(\`[BIM] Failed to process mesh \${mesh.expressID}:\`, meshErr);
          }
        });`);

fs.writeFileSync(file, code);
console.log('Patched bim-process2');
