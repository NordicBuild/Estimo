const fs = require('fs');
const file = 'supabase/functions/bim-process/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const MAX_SIZE = 40 \* 1024 \* 1024;\n    if \(fileUint8Array\.length > MAX_SIZE\) \{\n      console\.log\(\`\\[BIM\\] File > 40MB \\(\$\{fileUint8Array\.length\} bytes\\)\. Skipping geometry extraction\.\`\);\n      skipGeometry = true;\n      geometryError = "File too large \(>40MB\)\. Skipped geometry\.";\n    \}/, `const MAX_SIZE = 15 * 1024 * 1024;
    if (fileUint8Array.length > MAX_SIZE) {
      console.log(\`[BIM] File > 15MB (\${fileUint8Array.length} bytes). Skipping geometry extraction.\`);
      skipGeometry = true;
      geometryError = "Filen överstiger 15 MB, 3D-geometri inaktiverad.";
    }`);

code = code.replace(/const node = doc\.createNode\(\`Element_\$\{expressID\}\`\);\n          scene\.addChild\(node\);/, `const node = doc.createNode(\`Element_\${expressID}\`);
          node.setExtras({ expressID });
          scene.addChild(node);`);

code = code.replace(/const positions = new Float32Array\(vertexCount \* 3\);\n            \n            for \(let v = 0; v < vertexCount; v\+\+\) \{[\s\S]*?const positionAccessor = doc\.createAccessor\(\)\n              \.setType\('VEC3'\)\n              \.setArray\(positions\)\n              \.setBuffer\(buffer\);\n              \n            const indexAccessor = doc\.createAccessor\(\)/, `const positions = new Float32Array(vertexCount * 3);
            const normals = new Float32Array(vertexCount * 3);
            
            for (let v = 0; v < vertexCount; v++) {
              const x = vertices[v * 6];
              const y = vertices[v * 6 + 1];
              const z = vertices[v * 6 + 2];
              
              const tx = x * transform[0] + y * transform[4] + z * transform[8] + transform[12];
              const ty = x * transform[1] + y * transform[5] + z * transform[9] + transform[13];
              const tz = x * transform[2] + y * transform[6] + z * transform[10] + transform[14];
              
              positions[v * 3] = tx;
              positions[v * 3 + 1] = ty;
              positions[v * 3 + 2] = tz;

              const nx = vertices[v * 6 + 3];
              const ny = vertices[v * 6 + 4];
              const nz = vertices[v * 6 + 5];

              const tnx = nx * transform[0] + ny * transform[4] + nz * transform[8];
              const tny = nx * transform[1] + ny * transform[5] + nz * transform[9];
              const tnz = nx * transform[2] + ny * transform[6] + nz * transform[10];

              const len = Math.sqrt(tnx * tnx + tny * tny + tnz * tnz);
              const invLen = len > 0 ? 1.0 / len : 0;
              
              normals[v * 3] = tnx * invLen;
              normals[v * 3 + 1] = tny * invLen;
              normals[v * 3 + 2] = tnz * invLen;
            }
            
            const positionAccessor = doc.createAccessor()
              .setType('VEC3')
              .setArray(positions)
              .setBuffer(buffer);

            const normalAccessor = doc.createAccessor()
              .setType('VEC3')
              .setArray(normals)
              .setBuffer(buffer);
              
            const indexAccessor = doc.createAccessor()`);

code = code.replace(/const prim = doc\.createPrimitive\(\)\n              \.setIndices\(indexAccessor\)\n              \.setAttribute\('POSITION', positionAccessor\)\n              \.setMaterial\(material\);/, `const prim = doc.createPrimitive()
              .setIndices(indexAccessor)
              .setAttribute('POSITION', positionAccessor)
              .setAttribute('NORMAL', normalAccessor)
              .setMaterial(material);`);

fs.writeFileSync(file, code);
console.log('Patched bim-process');
