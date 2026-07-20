import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import { supabase } from '../../supabase';",
    "import { supabase } from '../../supabase';\nimport { saveDocument, getDocuments, saveFile, getFile } from '../../ffu/localDb';"
)

old_fetch = """  const fetchDocuments = async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null);
    if (data) {
      setDocuments(data);
    }
  };"""

new_fetch = """  const fetchDocuments = async () => {
    if (!projectId) return;
    try {
        const { data } = await supabase
          .from('project_documents')
          .select('*')
          .eq('project_id', projectId)
          .is('deleted_at', null);
        if (data) {
          setDocuments(data);
          return;
        }
    } catch(err) {
        // Fallback to local DB
    }
    const localDocs = await getDocuments(projectId);
    setDocuments(localDocs);
  };"""
content = content.replace(old_fetch, new_fetch)

old_create_folder = """  const handleCreateFolder = async () => {
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
  };"""

new_create_folder = """  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const path = `${projectId}/${currentPath}${newFolderName}/.keep`;
    const doc = {
        id: `local_${Date.now()}_${Math.random()}`,
        project_id: projectId,
        filename: ".keep",
        document_type: "folder",
        file_path: path,
        uploaded_at: new Date().toISOString()
    };
    try {
        await supabase.from("project_documents").insert(doc);
    } catch(err) {
        await saveDocument(doc);
    }
    setNewFolderName("");
    setIsNewFolderOpen(false);
    fetchDocuments();
  };"""
content = content.replace(old_create_folder, new_create_folder)

old_upload = """  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        
        await supabase.storage.from("documents").upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

        await supabase.from("project_documents").insert({
          project_id: projectId,
          filename: file.name,
          document_type: "General",
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
  };"""

new_upload = """  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        
        const docId = `local_${Date.now()}_${Math.random()}`;
        
        try {
            await supabase.storage.from("documents").upload(filePath, file, {
              cacheControl: "3600",
              upsert: false
            });
            await supabase.from("project_documents").insert({
              id: docId,
              project_id: projectId,
              filename: file.name,
              document_type: "General",
              file_path: filePath
            });
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
  };"""

content = content.replace(old_upload, new_upload)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
