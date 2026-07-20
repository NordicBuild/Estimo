import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import { ApprovalPanel } from './ApprovalPanel';",
    "import { ApprovalPanel } from './ApprovalPanel';\nimport { BygdelLinkPanel } from './BygdelLinkPanel';\nimport { Modal } from '../../ui';"
)

content = content.replace(
    "interface Props {\n  projectId: string;\n}",
    "interface Props {\n  projectId: string;\n  availableByggdelar?: any[];\n}"
)

content = content.replace(
    "export function FfuTab({ projectId",
    "export function FfuTab({ projectId, availableByggdelar = []"
)

content = content.replace(
    "const [approvalDoc, setApprovalDoc] = useState<{id: string, name: string} | null>(null);",
    "const [approvalDoc, setApprovalDoc] = useState<{id: string, name: string} | null>(null);\n  const [linkDoc, setLinkDoc] = useState<{id: string, name: string} | null>(null);"
)

# Add Länka button in desktop view
content = content.replace(
    """<Button variant="ghost" onClick={(e) => { e.stopPropagation(); setApprovalDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-2 py-1 h-auto text-blue-600">
                      Godkännande...
                    </Button>""",
    """<div className="flex gap-1"><Button variant="ghost" onClick={(e) => { e.stopPropagation(); setApprovalDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-2 py-1 h-auto text-blue-600">
                      Godkännande...
                    </Button>
                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setLinkDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-2 py-1 h-auto text-gray-600">
                      Länka Byggdel
                    </Button></div>"""
)

# Add Länka button in mobile view
content = content.replace(
    """<Button variant="ghost" onClick={(e) => { e.stopPropagation(); setApprovalDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-3 py-1.5 h-auto text-blue-600 border border-blue-200">
                    Godkännande...
                  </Button>""",
    """<div className="flex gap-2"><Button variant="ghost" onClick={(e) => { e.stopPropagation(); setApprovalDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-3 py-1.5 h-auto text-blue-600 border border-blue-200">
                    Godkännande...
                  </Button>
                  <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setLinkDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-3 py-1.5 h-auto text-gray-600 border border-gray-200">
                    Länka Byggdel
                  </Button></div>"""
)

# Add Modal
content = content.replace(
    """      {approvalDoc && (
        <ApprovalPanel
          isOpen={true}
          onClose={() => setApprovalDoc(null)}
          documentId={approvalDoc.id}
          documentName={approvalDoc.name}
        />
      )}
    </div>""",
    """      {approvalDoc && (
        <ApprovalPanel
          isOpen={true}
          onClose={() => setApprovalDoc(null)}
          documentId={approvalDoc.id}
          documentName={approvalDoc.name}
        />
      )}
      <Modal isOpen={!!linkDoc} onClose={() => setLinkDoc(null)} title={`Länka Dokument: ${linkDoc?.name}`}>
         {linkDoc && (
            <div className="p-4 max-h-[80vh] overflow-y-auto">
                <BygdelLinkPanel 
                  documentId={linkDoc.id} 
                  projectId={projectId} 
                  availableByggdelar={availableByggdelar} 
                />
            </div>
         )}
      </Modal>
    </div>"""
)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
