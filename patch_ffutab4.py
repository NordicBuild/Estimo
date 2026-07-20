import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

table_desktop = """<table className="hidden md:table w-full text-left text-sm whitespace-nowrap md:whitespace-normal">"""
content = content.replace('<table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">', table_desktop)

mobile_view = """
        <div className="md:hidden flex flex-col divide-y divide-gray-100 bg-white">
          {documents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Inga dokument hittades</div>
          ) : (
            documents.map(doc => (
              <div key={doc.id} className={`p-4 flex flex-col gap-2 ${selectedIds.includes(doc.id) ? 'bg-blue-50/50' : ''}`} onClick={() => toggleSelect(doc.id)}>
                <div className="flex items-start gap-3">
                  <div className="mt-1" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggleSelect(doc.id)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-medium text-gray-900 truncate">
                      <i className="fa-solid fa-file-pdf text-red-500"></i>
                      <span className="truncate">{doc.filename}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{doc.document_type}</span>
                      <span>&bull;</span>
                      <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setApprovalDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-3 py-1.5 h-auto text-blue-600 border border-blue-200">
                    Godkännande...
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
"""

content = content.replace('</table>', '</table>' + mobile_view)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
