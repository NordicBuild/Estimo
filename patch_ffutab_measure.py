import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'interface Props {\n  projectId: string;\n  availableByggdelar?: any[];\n}',
    'interface Props {\n  projectId: string;\n  availableByggdelar?: any[];\n  setActiveTab?: (tab: any) => void;\n}'
)

content = content.replace(
    'export function FfuTab({ projectId, availableByggdelar = [] }: Props) {',
    'export function FfuTab({ projectId, availableByggdelar = [], setActiveTab }: Props) {\n  const { setPdfToLoad } = usePdfStore();'
)

if "import { usePdfStore }" not in content:
    content = content.replace(
        "import { saveDocument, getDocuments, saveFile, getFile } from '../../ffu/localDb';",
        "import { saveDocument, getDocuments, saveFile, getFile } from '../../ffu/localDb';\nimport { usePdfStore } from '../../state/usePdfStore';"
    )

old_view = """      <Modal isOpen={!!viewDoc} onClose={() => { setViewDoc(null); setViewUrl(null); }} title={viewDoc?.filename} className="w-[95vw] h-[95vh] max-w-7xl !p-0">
        {viewDoc && (
          <div className="w-full h-full flex-1 min-h-[70vh]">
            <iframe 
              src={viewUrl || supabase.storage.from("documents").getPublicUrl(viewDoc.file_path).data.publicUrl}
              className="w-full h-full border-0 rounded-b-xl"
              title="Document Viewer"
            />
          </div>
        )}
      </Modal>"""

new_view = """      <Modal isOpen={!!viewDoc} onClose={() => { setViewDoc(null); setViewUrl(null); }} title={viewDoc?.filename} className="w-[95vw] h-[95vh] max-w-7xl !p-0">
        {viewDoc && (
          <div className="w-full h-full flex-1 min-h-[70vh] flex flex-col">
            {viewDoc.filename.toLowerCase().endsWith('.pdf') && (
               <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-end">
                  <Button variant="primary" onClick={() => {
                      setPdfToLoad({
                          url: viewUrl || supabase.storage.from("documents").getPublicUrl(viewDoc.file_path).data.publicUrl,
                          filename: viewDoc.filename,
                          file_path: viewDoc.file_path
                      });
                      setViewDoc(null);
                      setViewUrl(null);
                      if (setActiveTab) setActiveTab('pdf');
                  }}>
                    Mät i PDF
                  </Button>
               </div>
            )}
            <iframe 
              src={viewUrl || supabase.storage.from("documents").getPublicUrl(viewDoc.file_path).data.publicUrl}
              className="w-full flex-1 border-0 rounded-b-xl min-h-[70vh]"
              title="Document Viewer"
            />
          </div>
        )}
      </Modal>"""

content = content.replace(old_view, new_view)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)

