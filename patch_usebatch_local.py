import re

with open("src/ffu/hooks/useBatchOperations.ts", "r") as f:
    content = f.read()

content = content.replace(
    "import { supabase } from '../../supabase';",
    "import { supabase } from '../../supabase';\nimport { getDocuments, getFile } from './localDb';"
)

old_zip = """  const downloadAsZip = async (documentIds: string[]) => {
    setIsProcessing(true);
    setProgress(0);
    try {
      const { data: docs } = await supabase.from('project_documents').select('file_path, filename').in('id', documentIds);
      if (!docs || docs.length === 0) throw new Error('Inga filer hittades');

      const zip = new JSZip();
      let completed = 0;

      for (const doc of docs) {
        if (!doc.file_path) continue;
        const { data: fileData, error } = await supabase.storage.from("documents").download(doc.file_path);
        if (error || !fileData) continue;
        
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
  };"""

new_zip = """  const downloadAsZip = async (documentIds: string[]) => {
    setIsProcessing(true);
    setProgress(0);
    try {
      let docs;
      try {
        const { data } = await supabase.from('project_documents').select('file_path, filename').in('id', documentIds);
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
  };"""

content = content.replace(old_zip, new_zip)


old_manifest = """  const generateProjectManifest = async () => {
    setIsProcessing(true);
    try {
      const { data: docs, error: docError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null);

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
  };"""

new_manifest = """  const generateProjectManifest = async () => {
    setIsProcessing(true);
    try {
      let docs;
      try {
          const { data, error: docError } = await supabase
            .from('project_documents')
            .select('*')
            .eq('project_id', projectId)
            .is('deleted_at', null);
    
          if (!docError) docs = data;
      } catch(err) {}
      
      if (!docs) {
          docs = await getDocuments(projectId);
      }

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
  };"""

content = content.replace(old_manifest, new_manifest)

with open("src/ffu/hooks/useBatchOperations.ts", "w") as f:
    f.write(content)

