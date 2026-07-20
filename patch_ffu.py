import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

# Add new imports
content = content.replace(
    "import { Button } from '../../ui';",
    "import { Button, Input } from '../../ui';\nimport { useMemo } from 'react';"
)

# Add state variables
content = content.replace(
    "const [linkDoc, setLinkDoc] = useState<{id: string, name: string} | null>(null);",
    """const [linkDoc, setLinkDoc] = useState<{id: string, name: string} | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [viewDoc, setViewDoc] = useState<any>(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");"""
)

# Modify handleUpload
content = content.replace(
    "const filePath = `${projectId}/${file.name}`;",
    "const filePath = `${projectId}/${currentPath}${file.name}`;"
)

# Insert the itemsInCurrentPath useMemo before handleUpload
content = content.replace(
    "const handleUpload",
    """const itemsInCurrentPath = useMemo(() => {
   const items: any[] = [];
   const folderSet = new Set<string>();

   documents.forEach(doc => {
       const relPath = doc.file_path.replace(`${projectId}/`, '');
       if (relPath.startsWith(currentPath)) {
           const remainder = relPath.substring(currentPath.length);
           const slashIndex = remainder.indexOf('/');
           if (slashIndex === -1) {
               if (remainder !== '.keep') {
                  items.push({ type: 'file', ...doc });
               }
           } else {
               const folderName = remainder.substring(0, slashIndex);
               if (!folderSet.has(folderName)) {
                   folderSet.add(folderName);
                   items.push({ type: 'folder', name: folderName, path: currentPath + folderName + '/', id: `folder_${folderName}` });
               }
           }
       }
   });
   
   items.sort((a, b) => {
       if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
       const nameA = a.type === 'folder' ? a.name : a.filename;
       const nameB = b.type === 'folder' ? b.name : b.filename;
       return nameA.localeCompare(nameB);
   });
   
   return items;
  }, [documents, currentPath, projectId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const path = `${projectId}/${currentPath}${newFolderName}/.keep`;
    await supabase.from("project_documents").insert({
        project_id: projectId,
        filename: ".keep",
        document_type: "folder",
        file_path: path
    });
    setNewFolderName("");
    setIsNewFolderOpen(false);
    fetchDocuments();
  };

  const handleUpload"""
)

# Change documents.length === 0 in table header selectAll logic to use itemsInCurrentPath
content = content.replace(
    "documents.length > 0 && selectedIds.length === documents.length",
    "itemsInCurrentPath.filter(i => i.type === 'file').length > 0 && selectedIds.length === itemsInCurrentPath.filter(i => i.type === 'file').length"
)
content = content.replace(
    "selectedIds(documents.map(d => d.id))",
    "selectedIds(itemsInCurrentPath.filter(i => i.type === 'file').map(d => d.id))"
)

# Replace the table rendering
old_table_body = """          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Inga dokument hittades
                </td>
              </tr>
            ) : (
              documents.map(doc => (
                <tr key={doc.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedIds.includes(doc.id) ? 'bg-blue-50/50' : ''}`} onClick={() => toggleSelect(doc.id)}>
                  <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-file-pdf text-red-500"></i>
                      {doc.filename}
                    </div>
                  </td>
                  <td className="p-3 text-gray-600 hidden md:table-cell">{doc.document_type}</td>
                  <td className="p-3 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {doc.tags?.map((t: string) => (
                        <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-gray-500">
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1"><Button variant="ghost" onClick={(e) => { e.stopPropagation(); setApprovalDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-2 py-1 h-auto text-blue-600">
                      Godkännande...
                    </Button>
                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setLinkDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-2 py-1 h-auto text-gray-600">
                      Länka Byggdel
                    </Button></div>
                  </td>
                </tr>
              ))
            )}
          </tbody>"""

new_table_body = """          <tbody>
            {currentPath !== "" && (
              <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => {
                  const parts = currentPath.split('/');
                  parts.pop(); // remove trailing empty string
                  parts.pop(); // remove current folder
                  setCurrentPath(parts.length > 0 ? parts.join('/') + '/' : '');
              }}>
                <td className="p-3 text-center"></td>
                <td className="p-3" colSpan={5}>
                  <div className="flex items-center gap-2 font-medium">
                    <i className="fa-solid fa-folder-open text-blue-400"></i>
                    .. (Upp en nivå)
                  </div>
                </td>
              </tr>
            )}
            {itemsInCurrentPath.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Denna mapp är tom
                </td>
              </tr>
            ) : (
              itemsInCurrentPath.map(item => {
                if (item.type === 'folder') {
                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setCurrentPath(item.path)}>
                      <td className="p-3 text-center"></td>
                      <td className="p-3" colSpan={5}>
                        <div className="flex items-center gap-2 font-medium">
                          <i className="fa-solid fa-folder text-blue-500"></i>
                          {item.name}
                        </div>
                      </td>
                    </tr>
                  );
                }
                
                const doc = item;
                return (
                  <tr key={doc.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedIds.includes(doc.id) ? 'bg-blue-50/50' : ''}`} onClick={() => setViewDoc(doc)}>
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(doc.id)}
                        onChange={() => toggleSelect(doc.id)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <i className={`fa-solid ${doc.filename.toLowerCase().endsWith('.pdf') ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'}`}></i>
                        {doc.filename}
                      </div>
                    </td>
                    <td className="p-3 text-gray-600 hidden md:table-cell">{doc.document_type}</td>
                    <td className="p-3 hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {doc.tags?.map((t: string) => (
                          <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1"><Button variant="ghost" onClick={(e) => { e.stopPropagation(); setApprovalDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-2 py-1 h-auto text-blue-600">
                        Godkännande...
                      </Button>
                      <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setLinkDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-2 py-1 h-auto text-gray-600">
                        Länka Byggdel
                      </Button></div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>"""

content = content.replace(old_table_body, new_table_body)

# Replace Mobile View rendering
old_mobile_view = """        <div className="md:hidden flex flex-col divide-y divide-gray-100 bg-white">
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
                  <div className="flex gap-2"><Button variant="ghost" onClick={(e) => { e.stopPropagation(); setApprovalDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-3 py-1.5 h-auto text-blue-600 border border-blue-200">
                    Godkännande...
                  </Button>
                  <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setLinkDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-3 py-1.5 h-auto text-gray-600 border border-gray-200">
                    Länka Byggdel
                  </Button></div>
                </div>
              </div>
            ))
          )}
        </div>"""

new_mobile_view = """        <div className="md:hidden flex flex-col divide-y divide-gray-100 bg-white">
          {currentPath !== "" && (
            <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50" onClick={() => {
                const parts = currentPath.split('/');
                parts.pop();
                parts.pop();
                setCurrentPath(parts.length > 0 ? parts.join('/') + '/' : '');
            }}>
              <i className="fa-solid fa-folder-open text-blue-400"></i>
              <span className="font-medium text-gray-900">.. (Upp en nivå)</span>
            </div>
          )}
          {itemsInCurrentPath.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Denna mapp är tom</div>
          ) : (
            itemsInCurrentPath.map(item => {
              if (item.type === 'folder') {
                return (
                  <div key={item.id} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50" onClick={() => setCurrentPath(item.path)}>
                    <i className="fa-solid fa-folder text-blue-500"></i>
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                );
              }
              const doc = item;
              return (
                <div key={doc.id} className={`p-4 flex flex-col gap-2 ${selectedIds.includes(doc.id) ? 'bg-blue-50/50' : ''}`} onClick={() => setViewDoc(doc)}>
                  <div className="flex items-start gap-3">
                    <div className="mt-1" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggleSelect(doc.id)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 font-medium text-gray-900 truncate">
                        <i className={`fa-solid ${doc.filename.toLowerCase().endsWith('.pdf') ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'}`}></i>
                        <span className="truncate">{doc.filename}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{doc.document_type}</span>
                        <span>&bull;</span>
                        <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2"><Button variant="ghost" onClick={(e) => { e.stopPropagation(); setApprovalDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-3 py-1.5 h-auto text-blue-600 border border-blue-200">
                      Godkännande...
                    </Button>
                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setLinkDoc({ id: doc.id, name: doc.filename }); }} className="text-xs px-3 py-1.5 h-auto text-gray-600 border border-gray-200">
                      Länka Byggdel
                    </Button></div>
                  </div>
                </div>
              );
            })
          )}
        </div>"""

content = content.replace(old_mobile_view, new_mobile_view)

# Add "Ny mapp" button and path display
header_old = """      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">FFU Dokument</h2>
        <div className="flex flex-wrap gap-2">"""
header_new = """      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            FFU Dokument
            {currentPath && <span className="text-gray-400 font-normal text-lg">/ {currentPath}</span>}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsNewFolderOpen(true)} variant="ghost" className="flex items-center gap-2">
            <i className="fa-solid fa-folder-plus"></i> Ny mapp
          </Button>"""

content = content.replace(header_old, header_new)

# Add Modals to the end
modals_append = """      <Modal isOpen={isNewFolderOpen} onClose={() => setIsNewFolderOpen(false)} title="Skapa ny mapp">
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mappnamn</label>
            <Input 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="t.ex. Ritningar"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsNewFolderOpen(false)}>Avbryt</Button>
            <Button variant="primary" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Skapa</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!viewDoc} onClose={() => setViewDoc(null)} title={viewDoc?.filename} className="w-[95vw] h-[95vh] max-w-7xl !p-0">
        {viewDoc && (
          <div className="w-full h-full flex-1 min-h-[70vh]">
            <iframe 
              src={supabase.storage.from("documents").getPublicUrl(viewDoc.file_path).data.publicUrl}
              className="w-full h-full border-0 rounded-b-xl"
              title="Document Viewer"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}"""

content = content.replace("    </div>\n  );\n}", modals_append)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)

