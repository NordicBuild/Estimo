import { useState } from 'react';
import { supabase } from '../../supabase';
import { saveDocument, getDocuments, getFile, deleteDocument, deleteFile } from '../localDb';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAuth } from '../../state/AuthContext';

export function useBatchOperations(projectId: string) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const callEdgeFunction = async (action: string, documentIds: string[], payload?: any) => {
    const { data, error } = await supabase.functions.invoke('batch-operations', {
      body: { action, documentIds, payload }
    });
    if (error) throw error;
    return data;
  };

    const downloadAsZip = async (documentIds: string[]) => {
    setIsProcessing(true);
    setProgress(0);
    try {
      let docs;
      try {
        const { data, error } = await supabase.from('project_documents').select('file_path, filename').in('id', documentIds);
        if (error) throw error;
        docs = data;
      } catch(err) {
        const localDocs = await getDocuments(projectId);
        docs = localDocs.filter(d => documentIds.includes(d.id));
      }
      if (!docs || docs.length === 0) throw new Error('Inga filer hittades');

      const zip = new JSZip();
      let completed = 0;

      for (const doc of docs) {
        if (!doc.file_path) continue;
        let fileData;
        try {
            const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
            if (!error && data) fileData = data;
        } catch(err) {}
        
        if (!fileData) {
            fileData = await getFile(doc.file_path);
        }
        
        if (!fileData) continue;
        
        zip.file(doc.filename, fileData);
        completed++;
        setProgress(Math.round((completed / docs.length) * 50));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
          setProgress(50 + Math.round(metadata.percent / 2));
      });
      
      saveAs(zipBlob, `export-${new Date().toISOString().split('T')[0]}.zip`);
    } catch (err) {
      console.error('ZIP Error:', err);
      throw err;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const batchTag = async (documentIds: string[], tags: string[]) => {
    setIsProcessing(true);
    try {
      await callEdgeFunction('batch_tag', documentIds, { tags });
    } catch (err) {
      console.log('Falling back to local tag update');
      try {
          const localDocs = await getDocuments(projectId);
          const docsToUpdate = localDocs.filter(d => documentIds.includes(d.id));
          for (const doc of docsToUpdate) {
              const currentTags = Array.isArray(doc.tags) ? doc.tags : [];
              const newTags = Array.from(new Set([...currentTags, ...tags]));
              await saveDocument({ ...doc, tags: newTags });
          }
          
          // Also try direct Supabase update
          for (const id of documentIds) {
              try {
                  const { data } = await supabase.from('project_documents').select('tags').eq('id', id).single();
                  if (data) {
                      const currentTags = Array.isArray(data.tags) ? data.tags : [];
                      const newTags = Array.from(new Set([...currentTags, ...tags]));
                      await supabase.from('project_documents').update({ tags: newTags }).eq('id', id);
                  }
              } catch (e) {}
          }
      } catch (fallbackErr) {
          console.error("Local tag update failed", fallbackErr);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const batchMove = async (documentIds: string[], folderId: string) => {
    setIsProcessing(true);
    try {
      await callEdgeFunction('batch_move', documentIds, { folderId });
    } finally {
      setIsProcessing(false);
    }
  };

  const batchDelete = async (documentIds: string[]) => {
    setIsProcessing(true);
    try {
      let remoteDocs: any[] = [];
      try {
          const { data } = await supabase
            .from('project_documents')
            .select('*')
            .eq('project_id', projectId);
          if (data) remoteDocs = data;
      } catch(e) {}
      const localDocs = await getDocuments(projectId);
      const docs = [...remoteDocs, ...localDocs];
      
      let allIdsToDelete = new Set(documentIds.filter(id => !id.startsWith('folder_')));
      
      // Handle folders
      const folderPaths = documentIds.filter(id => id.startsWith('folder_')).map(id => id.replace('folder_', ''));
      for (const folderPath of folderPaths) {
         const matchingDocs = docs.filter(d => d.file_path && d.file_path.replace(`${projectId}/`, '').startsWith(folderPath + '/'));
         matchingDocs.forEach(d => allIdsToDelete.add(d.id));
      }
      
      const idsToDeleteArr = Array.from(allIdsToDelete);
      if (idsToDeleteArr.length === 0) return;

      try {
        await callEdgeFunction('batch_delete', idsToDeleteArr);
      } catch (err) {
        // Fallback to local DB and direct supabase
        const toDelete = docs.filter(d => allIdsToDelete.has(d.id));
        
        for (const id of idsToDeleteArr) {
          console.log("DELETING ID:", id);
          try { 
            const { error } = await supabase.from('project_documents').delete().eq('id', id);
            if (error) console.error("Supabase delete document error", error);
            // Fallback to soft delete
            await supabase.from('project_documents').update({ deleted_at: new Date().toISOString() }).eq('id', id);
          } catch(e) { console.error("Supabase delete document exception", e); }
          try { 
            await deleteDocument(id); 
            console.log("Deleted from local DB:", id);
          } catch(e) { console.error("LocalDB delete document error", e); }
        }
        for (const d of toDelete) {
          if (d.file_path) {
             try { 
                 const { error } = await supabase.storage.from('documents').remove([d.file_path]); 
                 if (error) console.error("Supabase storage delete error", error);
             } catch(e) { console.error("Supabase storage delete exception", e); }
             try { await deleteFile(d.file_path); } catch(e) { console.error("LocalDB delete file error", e); }
          }
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const batchShare = async (documentIds: string[], userId: string, role: string) => {
    setIsProcessing(true);
    try {
      await callEdgeFunction('batch_share', documentIds, { userId, role });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateProjectManifest = async () => {
    setIsProcessing(true);
    try {
      const { data: docs, error: docError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        ;

      if (docError) throw docError;

      const manifest = {
        project_id: projectId,
        export_date: new Date().toISOString(),
        documents: docs || [],
        statistics: {
          total_docs: docs?.length || 0,
        }
      };

      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      saveAs(blob, `manifest-${new Date().toISOString().split('T')[0]}.json`);
      
    } catch (err) {
      console.error('Manifest Error:', err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    progress,
    downloadAsZip,
    batchTag,
    batchMove,
    batchDelete,
    batchShare,
    generateProjectManifest
  };
}
