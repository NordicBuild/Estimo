const fs = require('fs');
const file = '/app/applet/src/components/BIMLeftPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/    setLoading\(true\);\n    setError\(null\);\n    try \{/, `    setLoading(true);
    setError(null);
    setPollingMsg(null);
    try {`);

code = code.replace(/    \} catch \(err: any\) \{\n      \/\/ warning removed\n      setError\(err\.message \|\| "Failed to process IFC file\."\);\n    \} finally \{/, `    } catch (err: any) {
      // warning removed
      setError(err.message || "Failed to process IFC file.");
      setPollingMsg(null);
    } finally {`);

fs.writeFileSync(file, code);
console.log('Patched BIMLeftPanel.tsx again');
