const fs = require('fs');
const file = '/app/applet/src/components/BIM3DViewer.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/          const url = modelUrl \|\| \(modelId \? \`\/models\/\$\{modelId\}\.glb\` : undefined\);\n          if \(\!url\) \{\n            setLoading\(false\);\n            if \(elements\.length > 0\) \{\n              setError\("Geometri saknas\/degraderad – properties tillgängliga i sidopanelen\."\);\n            \}\n            return;\n          \}/, `          const url = modelUrl;
          if (!url) {
            setLoading(false);
            if (!parsedMeshes && elements.length > 0) {
              setError("Geometri saknas/degraderad – properties tillgängliga i sidopanelen.");
            }
            return;
          }`);

fs.writeFileSync(file, code);
console.log('Patched BIM3DViewer.tsx url load');
