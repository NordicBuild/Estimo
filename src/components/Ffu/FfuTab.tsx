import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { BatchActions } from './BatchActions';
import { ExportDialog } from './ExportDialog';
import { Button } from '../../ui';

interface Props {
  projectId: string;
}

export function FfuTab({ projectId }: Props) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const fetchDocuments = async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null);
    if (data) {
      setDocuments(data);
    }
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">FFU Dokument</h2>
        <Button onClick={() => setIsExportOpen(true)} variant="ghost" className="flex items-center gap-2">
          <i className="fa-solid fa-download"></i> Exportera
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex-1 flex flex-col">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-3 w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={documents.length > 0 && selectedIds.length === documents.length}
                  onChange={selectAll}
                />
              </th>
              <th className="p-3 font-semibold text-gray-700">Filnamn</th>
              <th className="p-3 font-semibold text-gray-700">Typ</th>
              <th className="p-3 font-semibold text-gray-700">Taggar</th>
              <th className="p-3 font-semibold text-gray-700">Datum</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
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
                  <td className="p-3 text-gray-600">{doc.document_type}</td>
                  <td className="p-3">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
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
    </div>
  );
}
