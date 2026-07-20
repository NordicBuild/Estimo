import re

with open("src/ffu/hooks/useBatchOperations.ts", "r") as f:
    content = f.read()

old_delete = """  const batchDelete = async (documentIds: string[]) => {
    setIsProcessing(true);
    try {
      try {
        await callEdgeFunction('batch_delete', documentIds);
      } catch (err) {
        // Fallback to local DB and direct supabase
        const docs = await getDocuments(projectId);
        const toDelete = docs.filter(d => documentIds.includes(d.id));
        
        for (const id of documentIds) {
          try { await supabase.from('project_documents').delete().eq('id', id); } catch(e) {}
          try { await deleteDocument(id); } catch(e) {}
        }
        for (const d of toDelete) {
          if (d.file_path) {
             try { await supabase.storage.from('documents').remove([d.file_path]); } catch(e) {}
             try { await deleteFile(d.file_path); } catch(e) {}
          }
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };"""

new_delete = """  const batchDelete = async (documentIds: string[]) => {
    setIsProcessing(true);
    try {
      const docs = await getDocuments(projectId);
      
      let allIdsToDelete = new Set(documentIds.filter(id => !id.startsWith('folder_')));
      
      // Handle folders
      const folderPaths = documentIds.filter(id => id.startsWith('folder_')).map(id => id.replace('folder_', ''));
      for (const folderPath of folderPaths) {
         const matchingDocs = docs.filter(d => d.file_path && d.file_path.replace(`${projectId}/`, '').startsWith(folderPath));
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
          try { await supabase.from('project_documents').delete().eq('id', id); } catch(e) {}
          try { await deleteDocument(id); } catch(e) {}
        }
        for (const d of toDelete) {
          if (d.file_path) {
             try { await supabase.storage.from('documents').remove([d.file_path]); } catch(e) {}
             try { await deleteFile(d.file_path); } catch(e) {}
          }
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };"""

content = content.replace(old_delete, new_delete)

with open("src/ffu/hooks/useBatchOperations.ts", "w") as f:
    f.write(content)
