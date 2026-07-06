const fs = require('fs');
const file = 'supabase/functions/bim-process/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("const MAX_SIZE = 40 * 1024 * 1024;", "const MAX_SIZE = 15 * 1024 * 1024;");
code = code.replace("File > 40MB", "File > 15MB");
code = code.replace('geometryError = "File too large (>40MB). Skipped geometry.";', 'geometryError = "Filen överstiger 15 MB, 3D-geometri inaktiverad.";');

fs.writeFileSync(file, code);
console.log('Patched bim-process3 max size');
