const fs = require('fs');
const file = '/app/applet/supabase/functions/bim-process/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/          if \(uploadError\) \{\n            console\.error\("\[BIM\] GLB upload error:", uploadError\);\n            geometryError = uploadError\.message;\n          \} else \{\n            const \{ data: publicUrlData \} = supabaseClient\.storage\n              \.from\('bim-uploads'\)\n              \.getPublicUrl\(glbPath\);\n            geometryUrl = publicUrlData\.publicUrl;\n          \}/, `          if (uploadError) {
            console.error("[BIM] GLB upload error:", uploadError);
            geometryError = uploadError.message;
          } else {
            geometryUrl = glbPath;
          }`);

fs.writeFileSync(file, code);
console.log('Patched bim-process/index.ts');
