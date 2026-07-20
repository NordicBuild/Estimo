import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

old_block = """  const handleViewDoc = async (doc: any) => {
    setViewDoc(doc);
    try {
        const localFile = await getFile(doc.file_path);
        if (localFile) {
            setViewUrl(URL.createObjectURL(localFile));
            return;
        }
    } catch (err) {}
    
    const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
    if (data) {
        setViewUrl(URL.createObjectURL(data));
    } else {
        setViewUrl(supabase.storage.from("documents").getPublicUrl(doc.file_path).data.publicUrl);
    }
  };"""

new_block = """  const handleViewDoc = async (doc: any) => {
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

content = content.replace(old_block, new_block)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
