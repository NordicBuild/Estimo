const fs = require('fs');
let code = fs.readFileSync('src/components/PdfMeasurementTab.tsx', 'utf8');

code = code.replace(
  `filename: pdfDoc.fingerprint + '.pdf', // Best effort filename`,
  `filename: (pdfDoc as any).fingerprints?.[0] + '.pdf' || 'mätning.pdf',`
);

fs.writeFileSync('src/components/PdfMeasurementTab.tsx', code);
console.log('Fixed fingerprint issue');
