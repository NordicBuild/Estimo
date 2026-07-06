const fs = require('fs');
const file = '/app/applet/src/components/BIMLeftPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

const bgTask = `      // Start background task to export and upload GLB
      (async () => {
        try {
          const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
          const THREE = await import('three');
          
          const exportGroup = new THREE.Group();
          for (const meshData of parsedModel.meshes) {
            const { expressID, geometry, color } = meshData;
            const material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(color[0], color[1], color[2]),
              transparent: color[3] < 1,
              opacity: color[3],
              side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData = { expressID }; // Important: expressID goes into userData so GLTFExporter puts it in extras
            exportGroup.add(mesh);
          }

          const exporter = new GLTFExporter();
          exporter.parse(
            exportGroup,
            async (gltf) => {
              try {
                const glbBuffer = gltf;
                const glbPath = \`projects/\${projectId}/bim/\${modelId}.glb\`;
                const { error: uploadGlbError } = await supabase.storage
                  .from('bim-uploads')
                  .upload(glbPath, glbBuffer, { 
                    upsert: true,
                    contentType: 'model/gltf-binary'
                  });
                  
                if (uploadGlbError) {
                  console.error('[BIM] Failed to upload GLB:', uploadGlbError);
                  return;
                }

                // Update bim_models
                await supabase.from('bim_models')
                  .update({
                    has_geometry: true,
                    geometry_url: glbPath
                  })
                  .eq('id', modelId);
                  
                console.log('[BIM] Successfully exported and uploaded GLB in background.');
              } catch (e) {
                console.error('[BIM] Background GLB upload error:', e);
              }
            },
            (error) => {
              console.error('[BIM] Failed to export GLB:', error);
            },
            { binary: true }
          );
        } catch (e) {
          console.error('[BIM] Background GLB export setup error:', e);
        }
      })();`;

code = code.replace(/\$\{bgTask\}/, bgTask);

fs.writeFileSync(file, code);
console.log('Patched BIMLeftPanel.tsx bg task properly');
