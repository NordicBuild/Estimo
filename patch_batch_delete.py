import re

with open("src/ffu/hooks/useBatchOperations.ts", "r") as f:
    content = f.read()

old_delete = """        for (const id of idsToDeleteArr) {
          try { await supabase.from('project_documents').delete().eq('id', id); } catch(e) {}
          try { await deleteDocument(id); } catch(e) {}
        }
        for (const d of toDelete) {
          if (d.file_path) {
             try { await supabase.storage.from('documents').remove([d.file_path]); } catch(e) {}
             try { await deleteFile(d.file_path); } catch(e) {}
          }
        }"""

new_delete = """        for (const id of idsToDeleteArr) {
          try { 
            const { error } = await supabase.from('project_documents').delete().eq('id', id);
            if (error) console.error("Supabase delete document error", error);
          } catch(e) { console.error("Supabase delete document exception", e); }
          try { await deleteDocument(id); } catch(e) { console.error("LocalDB delete document error", e); }
        }
        for (const d of toDelete) {
          if (d.file_path) {
             try { 
                 const { error } = await supabase.storage.from('documents').remove([d.file_path]); 
                 if (error) console.error("Supabase storage delete error", error);
             } catch(e) { console.error("Supabase storage delete exception", e); }
             try { await deleteFile(d.file_path); } catch(e) { console.error("LocalDB delete file error", e); }
          }
        }"""

content = content.replace(old_delete, new_delete)

with open("src/ffu/hooks/useBatchOperations.ts", "w") as f:
    f.write(content)
