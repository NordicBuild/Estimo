import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

content = content.replace("onClick={() => setViewDoc(doc)}", "onClick={() => handleViewDoc(doc)}")

wrapper = """  const handleViewDoc = async (doc: any) => {
    setViewDoc(doc);
    try {
        const localFile = await getFile(doc.file_path);
        if (localFile) {
            setViewUrl(URL.createObjectURL(localFile));
            return;
        }
    } catch (err) {}
    setViewUrl(supabase.storage.from("documents").getPublicUrl(doc.file_path).data.publicUrl);
  };"""

content = content.replace("const [viewUrl, setViewUrl] = useState<string | null>(null);", "const [viewUrl, setViewUrl] = useState<string | null>(null);\n\n" + wrapper)

# We also need to fix the iframe and setPdfToLoad logic since viewUrl will now always be set correctly.
content = content.replace(
    'url: viewUrl || supabase.storage.from("documents").getPublicUrl(viewDoc.file_path).data.publicUrl,',
    'url: viewUrl || supabase.storage.from("documents").getPublicUrl(viewDoc.file_path).data.publicUrl,'
)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
