import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../ui';
import { supabase } from '../supabase';
import { getDocuments } from '../ffu/localDb';
import { usePdfStore } from '../state/usePdfStore';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

export function DocumentPickerModal({ isOpen, onClose, projectId }: Props) {
    const [documents, setDocuments] = useState<any[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const { setPdfToLoad } = usePdfStore();

    useEffect(() => {
        if (!isOpen) return;
        const fetchDocs = async () => {
            let remoteDocs: any[] = [];
            try {
                const { data } = await supabase
                  .from('project_documents')
                  .select('*')
                  .eq('project_id', projectId)
        
                if (data) {
                  remoteDocs = data;
                }
            } catch(err) {
            }
            const localDocs = await getDocuments(projectId);
            const combined = [...remoteDocs];
            for (const localDoc of localDocs) {
              if (!combined.find(d => d.id === localDoc.id)) {
                 combined.push(localDoc);
              }
            }
            setDocuments(combined.filter(d => (d.filename || '').toLowerCase().endsWith('.pdf')));
        };
        fetchDocs();
    }, [isOpen, projectId]);

    const items = React.useMemo(() => {
        const itemsList: any[] = [];
        const folderSet = new Set<string>();

        documents.forEach(doc => {
            if (!doc.file_path) return;
            const relPath = doc.file_path.replace(`${projectId}/`, '');
            
            if (searchTerm) {
                if (doc.filename !== '.keep' && (doc.filename || '').toLowerCase().includes(searchTerm.toLowerCase())) {
                    itemsList.push({ type: 'file', ...doc });
                }
            } else if (relPath.startsWith(currentPath)) {
                const remainder = relPath.substring(currentPath.length);
                const slashIndex = remainder.indexOf('/');
                if (slashIndex === -1) {
                    if (remainder !== '.keep') {
                        itemsList.push({ type: 'file', ...doc });
                    }
                } else {
                    const folderName = remainder.substring(0, slashIndex);
                    if (!folderSet.has(folderName)) {
                        folderSet.add(folderName);
                        itemsList.push({ type: 'folder', name: folderName, path: currentPath + folderName + '/', id: `folder_${folderName}` });
                    }
                }
            }
        });

        itemsList.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            const nameA = a.type === 'folder' ? a.name : a.filename;
            const nameB = b.type === 'folder' ? b.name : b.filename;
            return nameA.localeCompare(nameB);
        });

        return itemsList;
    }, [documents, currentPath, projectId, searchTerm]);

    const handleSelectFile = async (doc: any) => {
        let publicUrl = '';
        try {
           publicUrl = supabase.storage.from("documents").getPublicUrl(doc.file_path).data.publicUrl;
        } catch(e) {}
        
        setPdfToLoad({
            url: publicUrl || '',
            filename: doc.filename,
            file_path: doc.file_path
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Öppna från FFU">
            <div className="p-4 flex flex-col h-[60vh]">
                <div className="mb-4 relative">
                     <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                     <Input 
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                       placeholder="Sök PDF-ritningar..."
                       className="pl-9"
                     />
                </div>
                
                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
                    {currentPath !== "" && !searchTerm && (
                        <div className="p-3 border-b border-gray-100 flex items-center gap-3 cursor-pointer hover:bg-gray-50" onClick={() => {
                            const parts = currentPath.split('/');
                            parts.pop();
                            parts.pop();
                            setCurrentPath(parts.length > 0 ? parts.join('/') + '/' : '');
                        }}>
                            <i className="fa-solid fa-folder-open text-blue-400"></i>
                            <span className="font-medium text-gray-900">.. (Upp en nivå)</span>
                        </div>
                    )}
                    
                    {items.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Inga PDF-filer hittades i denna mapp</div>
                    ) : (
                        items.map(item => {
                            if (item.type === 'folder') {
                                return (
                                    <div key={item.id} className="p-3 border-b border-gray-100 flex items-center gap-3 cursor-pointer hover:bg-gray-50" onClick={() => setCurrentPath(item.path)}>
                                        <i className="fa-solid fa-folder text-blue-500"></i>
                                        <span className="font-medium text-gray-900">{item.name}</span>
                                    </div>
                                );
                            }
                            
                            return (
                                <div key={item.id} className="p-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <i className="fa-solid fa-file-pdf text-red-500"></i>
                                        <span className="text-gray-900 truncate max-w-[200px] sm:max-w-[300px]">{item.filename}</span>
                                    </div>
                                    <Button variant="ghost" className="text-blue-600 text-xs px-2 py-1 h-auto" onClick={() => handleSelectFile(item)}>
                                        Öppna
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Modal>
    );
}
