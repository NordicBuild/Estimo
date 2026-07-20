import re

with open("src/ffu/hooks/useBatchOperations.ts", "r") as f:
    content = f.read()

new_zip = """  const downloadAsZip = async (documentIds: string[]) => {
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

content = re.sub(r'const downloadAsZip = async.*?};', new_zip, content, flags=re.DOTALL)

with open("src/ffu/hooks/useBatchOperations.ts", "w") as f:
    f.write(content)

