import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

old_handle = """  const handleViewDoc = async (doc: any) => {
    setViewDoc(doc);
    try {
        const localFile = await getFile(doc.file_path);
        if (localFile) {
            setViewUrl(URL.createObjectURL(localFile));
            return;
        }
    } catch (err) {}
    
    try {
        const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
        if (data) {
            setViewUrl(URL.createObjectURL(data));
        } else {
            setViewUrl(supabase.storage.from("documents").getPublicUrl(doc.file_path).data.publicUrl);
        }
    } catch (err) {
        console.error("Download failed:", err);
        setViewUrl(supabase.storage.from("documents").getPublicUrl(doc.file_path).data.publicUrl);
    }
  };"""

new_handle = """  const handleViewDoc = async (doc: any) => {
    setViewDoc(doc);
    const contentType = doc.filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
    
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
  };"""

content = content.replace(old_handle, new_handle)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
