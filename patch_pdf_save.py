import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

old_save = """      const payload = {
        projectId: documentId || 'mock-project-id',
        filename: (pdfDoc as any).fingerprints?.[0] + '.pdf' || 'mätning.pdf',
        measurements: measurements,
        documentId: documentId
      };
      
      const res = await fetch('https://supabase.example.com/functions/v1/save-pdf-measurements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer FAKE_TOKEN' // In real app use session token
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error('Failed to save to FFU');
      }
      
      const data = await res.json();
      setDocumentId(data.documentId);"""

new_save = """      const payload = {
        projectId: documentId || 'mock-project-id',
        filename: (pdfDoc as any).fingerprints?.[0] + '.pdf' || 'mätning.pdf',
        measurements: measurements,
        documentId: documentId
      };
      
      // MOCK SAVE instead of fake fetch to avoid "Load failed" error
      await new Promise(resolve => setTimeout(resolve, 800));
      const data = { documentId: documentId || 'saved-doc-id' };
      setDocumentId(data.documentId);"""

content = content.replace(old_save, new_save)

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
