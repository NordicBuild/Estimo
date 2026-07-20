import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

upload_handler = """  const { isOnline, setPendingUploads } = useOnlineStatus();
  
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
        const filePath = `${projectId}/${file.name}`;
        
        await supabase.storage.from('documents').upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

        await supabase.from('project_documents').insert({
          project_id: projectId,
          filename: file.name,
          document_type: 'General',
          file_path: filePath
        });
      }
      fetchDocuments();
    } catch (err) {
      console.error(err);
      alert("Något gick fel vid uppladdning");
    } finally {
      setPendingUploads(0);
    }
  };

  const fetchDocuments = async () => {"""

if "handleUpload" not in content:
    content = content.replace("  const fetchDocuments = async () => {", upload_handler)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
