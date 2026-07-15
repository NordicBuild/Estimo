const fs = require('fs');
let code = fs.readFileSync('src/components/PdfMeasurementTab.tsx', 'utf8');

// Add useFfuStore import
if (!code.includes("import { useFfuStore }")) {
  code = code.replace(
    `import { Measurement, MeasurementGroup, Point } from "../measurementTypes";`,
    `import { Measurement, MeasurementGroup, Point } from "../measurementTypes";\nimport { useFfuStore } from "../ffu/store/useFfuStore";`
  );
}

// Add state update after save
code = code.replace(
  `setDocumentId(data.documentId);`,
  `setDocumentId(data.documentId);
      const { activeFolderId, fetchDocumentsInFolder } = useFfuStore.getState();
      if (activeFolderId) {
        fetchDocumentsInFolder(activeFolderId);
      }`
);

fs.writeFileSync('src/components/PdfMeasurementTab.tsx', code);
console.log('Patched PdfMeasurementTab with FfuStore');
