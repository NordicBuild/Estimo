import { OfflineIndicator } from './OfflineIndicator';
import { ApprovalPanel } from './ApprovalPanel';
import { BygdelLinkPanel } from './BygdelLinkPanel';
import { Modal } from '../../ui';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { saveDocument, getDocuments, saveFile, getFile } from '../../ffu/localDb';
import { usePdfStore } from '../../state/usePdfStore';
import { BatchActions } from './BatchActions';
import { ExportDialog } from './ExportDialog';
import { Button, Input } from '../../ui';
import { useMemo } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface Props {
  projectId: string;
  availableByggdelar?: any[];
  setActiveTab?: (tab: any) => void;
}

export function FfuTab({ projectId, availableByggdelar = [], setActiveTab }: Props) {
  const { setPdfToLoad } = usePdfStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [approvalDoc, setApprovalDoc] = useState<{id: string, name: string} | null>(null);
  const [linkDoc, setLinkDoc] = useState<{id: string, name: string} | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [viewDoc, setViewDoc] = useState<any>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const handleViewDoc = async (doc: any) => {
    setViewDoc(doc);
    const contentType = (doc.filename || '').toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
    
    try {
        const localFile = await getFile(doc.file_path);
        if (localFile) {
            const blob = new Blob([localFile], { type: contentType });
            setViewUrl(URL.createObjectURL(blob));
            return;
        }
    } catch (err) {}
    
    try {
        const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
        if (data) {
            const blob = new Blob([data], { type: contentType });
            setViewUrl(URL.createObjectURL(blob));
        } else {
            setViewUrl(supabase.storage.from("documents").getPublicUrl(doc.file_path).data.publicUrl);
        }
    } catch (err) {
        console.error("Download failed:", err);
        setViewUrl(supabase.storage.from("documents").getPublicUrl(doc.file_path).data.publicUrl);
    }
  };
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { isOnline, setPendingUploads } = useOnlineStatus();
  
  const itemsInCurrentPath = useMemo(() => {
   const items: any[] = [];
   const folderSet = new Set<string>();

   documents.forEach(doc => {
       if (!doc.file_path) return;
       const relPath = doc.file_path.replace(`${projectId}/`, '');
       
       if (searchTerm) {
           if (doc.filename !== '.keep' && (doc.filename || '').toLowerCase().includes(searchTerm.toLowerCase())) {
               items.push({ type: 'file', ...doc });
           }
           
           const parts = relPath.split('/');
           parts.pop(); // remove filename
           let currentFolderPath = '';
           for (const part of parts) {
               const folderName = part;
               currentFolderPath += folderName + '/';
               if (folderName.toLowerCase().includes(searchTerm.toLowerCase())) {
                   if (!folderSet.has(currentFolderPath)) {
                       folderSet.add(currentFolderPath);
                       items.push({ type: 'folder', name: folderName, path: currentFolderPath, id: `folder_${currentFolderPath}` });
                   }
               }
           }
       } else if (relPath.startsWith(currentPath)) {
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
  }, [documents, currentPath, projectId, searchTerm]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const path = `${projectId}/${currentPath}${newFolderName}/.keep`;
    const doc = {
        id: crypto.randomUUID(),
        project_id: projectId,
        filename: ".keep",
        document_type: "folder",
        file_path: path,
        uploaded_at: new Date().toISOString()
    };
    try {
        const { error } = await supabase.from("project_documents").insert(doc);
        if (error) throw error;
    } catch(err) {
        await saveDocument(doc);
    }
    setNewFolderName("");
    setIsNewFolderOpen(false);
    fetchDocuments();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!isOnline) {
      alert("Offline: Filer läggs i kö för uppladdning när du är online igen.");
      setPendingUploads(prev => prev + files.length);
      return;
    }

    setPendingUploads(prev => prev + files.length);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `${projectId}/${currentPath}${file.name}`;
        
        const docId = crypto.randomUUID();
        
        try {
            const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, {
              cacheControl: "3600",
              upsert: false
            });
            if (uploadError) throw uploadError;
            const { error: insertError } = await supabase.from("project_documents").insert({
              id: docId,
              project_id: projectId,
              filename: file.name,
              document_type: "General",
              file_path: filePath
            });
            if (insertError) throw insertError;
        } catch(err) {
            // Fallback to local DB
            await saveFile(filePath, file);
            await saveDocument({
              id: docId,
              project_id: projectId,
              filename: file.name,
              document_type: "General",
              file_path: filePath,
              uploaded_at: new Date().toISOString()
            });
        }
      }
      fetchDocuments();
    } catch (err) {
      console.error(err);
      alert("Något gick fel vid uppladdning");
    } finally {
      setPendingUploads(0);
    }
  };

  const fetchDocuments = async () => {
    if (!projectId) return;
    
    let remoteDocs: any[] = [];
    try {
        const { data } = await supabase
          .from('project_documents')
          .select('*')
          .eq('project_id', projectId)
          .is('deleted_at', null)

        if (data) {
          remoteDocs = data;
        }
    } catch(err) {
        // Ignored
    }
    
    let localDocs: any[] = [];
    try {
        localDocs = await getDocuments(projectId);
    } catch(err) {}
    
    // Merge, avoiding duplicates by ID
    const mergedMap = new Map();
    [...localDocs, ...remoteDocs].forEach(d => mergedMap.set(d.id, d));
    setDocuments(Array.from(mergedMap.values()));
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(documents.map(d => d.id));
    }
  };

  return (
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            FFU Dokument
            {currentPath && <span className="text-gray-400 font-normal text-lg">/ {currentPath}</span>}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative mr-2">
             <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
             <input 
               type="text" 
               placeholder="Sök dokument..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-48"
             />
          </div>
          <Button onClick={() => setIsNewFolderOpen(true)} variant="ghost" className="flex items-center gap-2">
            <i className="fa-solid fa-folder-plus"></i> Ny mapp
          </Button>
          <Button onClick={() => setIsExportOpen(true)} variant="ghost" className="flex items-center gap-2">
            <i className="fa-solid fa-download"></i> Exportera
          </Button>
          <label className="cursor-pointer">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium">
              <i className="fa-solid fa-cloud-arrow-up"></i>
              Ladda upp
            </div>
            <input type="file" multiple className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      <OfflineIndicator />
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex-1 flex flex-col overflow-x-auto">
        <table className="hidden md:table w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-3 w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={itemsInCurrentPath.length > 0 && itemsInCurrentPath.every(i => selectedIds.includes(i.id))}
                  onChange={selectAll}
                />
              </th>
              <th className="p-3 font-semibold text-gray-700">Filnamn</th>
              <th className="p-3 font-semibold text-gray-700 hidden md:table-cell">Typ</th>
              <th className="p-3 font-semibold text-gray-700 hidden md:table-cell">Taggar</th>
              <th className="p-3 font-semibold text-gray-700">Datum</th>
              <th className="p-3 font-semibold text-gray-700 w-16"></th>
            </tr>
          </thead>
          <tbody>
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
                    <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`} onClick={() => setCurrentPath(item.path)}>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
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
                  <tr key={doc.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedIds.includes(doc.id) ? 'bg-blue-50/50' : ''}`} onClick={() => handleViewDoc(doc)}>
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(doc.id)}
                        onChange={() => toggleSelect(doc.id)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <i className={`fa-solid ${(doc.filename || '').toLowerCase().endsWith('.pdf') ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'}`}></i>
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
          </tbody>
        </table>
        <div className="md:hidden flex flex-col divide-y divide-gray-100 bg-white">
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
                  <div key={item.id} className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`} onClick={() => setCurrentPath(item.path)}>
                    <div onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                    <i className="fa-solid fa-folder text-blue-500"></i>
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                );
              }
              const doc = item;
              return (
                <div key={doc.id} className={`p-4 flex flex-col gap-2 ${selectedIds.includes(doc.id) ? 'bg-blue-50/50' : ''}`} onClick={() => handleViewDoc(doc)}>
                  <div className="flex items-start gap-3">
                    <div className="mt-1" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggleSelect(doc.id)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 font-medium text-gray-900 truncate">
                        <i className={`fa-solid ${(doc.filename || '').toLowerCase().endsWith('.pdf') ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'}`}></i>
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
        </div>

      </div>

      <BatchActions 
        projectId={projectId}
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        onRefresh={fetchDocuments}
      />

      <ExportDialog 
        projectId={projectId}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        selectedIds={selectedIds}
      />
      {approvalDoc && (
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
      <Modal isOpen={isNewFolderOpen} onClose={() => setIsNewFolderOpen(false)} title="Skapa ny mapp">
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

      <Modal isOpen={!!viewDoc} onClose={() => { setViewDoc(null); setViewUrl(null); }} title={viewDoc?.filename} className="w-[95vw] h-[95vh] max-w-7xl !p-0">
        {viewDoc && (
          <div className="w-full h-full flex-1 min-h-[70vh] flex flex-col">
            {(viewDoc.filename || '').toLowerCase().endsWith('.pdf') && (
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
      </Modal>
    </div>
  );
}
