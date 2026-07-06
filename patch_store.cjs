const fs = require('fs');
const file = '/app/applet/src/stores/useBIMStore.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/            const \{ data: modelData, error: modelError \} = await supabase\n              \.from\('bim_models'\)\n              \.select\('geometry_url, has_geometry'\)\n              \.eq\('id', modelId\)\n              \.single\(\);[\s\S]*?            if \(modelError\) throw modelError;\n\n            \/\/ Fetch elements\n            const \{ data: elements, error: elementsError \} = await supabase\n              \.from\('bim_elements'\)\n              \.select\('\*'\)\n              \.eq\('model_id', modelId\);\n\n            if \(elementsError\) throw elementsError;\n\n            set\(\{\n              modelUrl: modelData\.geometry_url \|\| null,\n              elements: \(elements as BIMElement\[\]\) \|\| \[\],\n              loading: false\n            \}\);/, `            const { data: modelData, error: modelError } = await supabase
              .from('bim_models')
              .select('geometry_url, has_geometry, file_url, project_id')
              .eq('id', modelId)
              .single();

            if (modelError) throw modelError;

            let signedUrl = null;
            let urlErrorMsg: string | null = null;
            if (modelData.has_geometry && modelData.project_id) {
              const glbPath = \`projects/\${modelData.project_id}/bim/\${modelId}.glb\`;
              const { data: urlData, error: urlError } = await supabase.storage
                .from('bim-uploads')
                .createSignedUrl(glbPath, 3600);
              
              if (urlError) {
                urlErrorMsg = urlError.message;
              } else if (urlData) {
                signedUrl = urlData.signedUrl;
              }
            }

            // Fetch elements
            const { data: elements, error: elementsError } = await supabase
              .from('bim_elements')
              .select('*')
              .eq('model_id', modelId);

            if (elementsError) throw elementsError;

            set({
              modelUrl: signedUrl,
              elements: (elements as BIMElement[]) || [],
              loading: false,
              ...(urlErrorMsg ? { error: urlErrorMsg } : {})
            });`);

fs.writeFileSync(file, code);
console.log('Patched useBIMStore.ts');
