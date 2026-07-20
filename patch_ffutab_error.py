import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

content = content.replace(
"""    try {
        await supabase.from("project_documents").insert(doc);
    } catch(err) {
        await saveDocument(doc);
    }""",
"""    try {
        const { error } = await supabase.from("project_documents").insert(doc);
        if (error) throw error;
    } catch(err) {
        await saveDocument(doc);
    }""")

content = content.replace(
"""        try {
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
        } catch(err) {""",
"""        try {
            const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, {
              cacheControl: "3600",
              upsert: false
            });
            if (uploadError) throw uploadError;
            const { error: insertError } = await supabase.from("project_documents").insert({
              id: docId,
              project_id: projectId,
              filename: file.name,
              document_type: "General",
              file_path: filePath
            });
            if (insertError) throw insertError;
        } catch(err) {""")

content = content.replace(
"""      try {
        const { data } = await supabase.from('project_documents').select('file_path, filename').in('id', documentIds);
        docs = data;
      } catch(err) {""",
"""      try {
        const { data, error } = await supabase.from('project_documents').select('file_path, filename').in('id', documentIds);
        if (error) throw error;
        docs = data;
      } catch(err) {""")

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)

with open("src/ffu/hooks/useBatchOperations.ts", "r") as f:
    batch = f.read()

batch = batch.replace(
"""      try {
        const { data } = await supabase.from('project_documents').select('file_path, filename').in('id', documentIds);
        docs = data;
      } catch(err) {""",
"""      try {
        const { data, error } = await supabase.from('project_documents').select('file_path, filename').in('id', documentIds);
        if (error) throw error;
        docs = data;
      } catch(err) {""")

with open("src/ffu/hooks/useBatchOperations.ts", "w") as f:
    f.write(batch)

