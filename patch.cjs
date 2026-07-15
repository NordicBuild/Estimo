const fs = require('fs');
let code = fs.readFileSync('src/components/PdfMeasurementTab.tsx', 'utf8');

// Update signature
code = code.replace(
`export function PdfMeasurementTab({
  addParts,
}: {
  addParts?: (parts: Omit<Byggdel, "id">[]) => void;
}) {`,
`export function PdfMeasurementTab({
  addParts,
  initialDocumentId,
}: {
  addParts?: (parts: Omit<Byggdel, "id">[]) => void;
  initialDocumentId?: string | null;
}) {`);

// Add FFU save state
code = code.replace(
`  const [currentTool, setCurrentTool] = useState<`,
`  const [documentId, setDocumentId] = useState<string | null>(initialDocumentId || null);
  const [isSavingFfu, setIsSavingFfu] = useState(false);
  const [currentTool, setCurrentTool] = useState<`);

// Add save logic
code = code.replace(
`  const handleZoomReset = () => {`,
`  const handleSaveToFFU = async () => {
    if (!pdfDoc || measurements.length === 0) {
      setDialogConfig({
        isOpen: true,
        isAlert: true,
        title: "Kunde inte spara",
        message: "Du måste ladda upp en PDF och skapa minst en mätning först.",
        onConfirm: () => setDialogConfig(null)
      });
      return;
    }
    
    setIsSavingFfu(true);
    try {
      // In a real app, you'd get the actual PDF file base64 or blob.
      // Here we assume a mock/simplification or the Edge function handles it
      
      const payload = {
        projectId: 'mock-project-id', // Replace with real context
        filename: pdfDoc.fingerprint + '.pdf', // Best effort filename
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
      setDocumentId(data.documentId);
      
      setDialogConfig({
        isOpen: true,
        isAlert: true,
        title: "Sparat!",
        message: "Mätningarna har sparats till FFU.",
        onConfirm: () => setDialogConfig(null)
      });
    } catch (err: any) {
      console.error(err);
      setDialogConfig({
        isOpen: true,
        isAlert: true,
        title: "Fel vid sparning",
        message: "Kunde inte spara till FFU: " + err.message,
        onConfirm: () => setDialogConfig(null)
      });
    } finally {
      setIsSavingFfu(false);
    }
  };

  const handleZoomReset = () => {`);

// Add button to top toolbar
code = code.replace(
`            Ladda upp
          </button>
        </div>`,
`            Ladda upp
          </button>
          
          <div className="w-px h-5 bg-gray-300 mx-1 hidden sm:block"></div>
          
          <button
            onClick={handleSaveToFFU}
            disabled={isSavingFfu || !pdfDoc}
            className={\`p-1.5 ml-1 flex items-center gap-1.5 font-medium pr-2.5 rounded transition-colors \${isSavingFfu ? 'bg-gray-200 text-gray-500' : 'bg-[#e5f6fd] text-[#0288d1] border-[#b3e5fc] hover:bg-[#b3e5fc]'}\`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isSavingFfu ? 'sync' : 'cloud_upload'}
            </span>{" "}
            {isSavingFfu ? 'Sparar...' : 'Spara i FFU'}
          </button>
        </div>`);

fs.writeFileSync('src/components/PdfMeasurementTab.tsx', code);
console.log('Patched PdfMeasurementTab');
