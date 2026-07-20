import re

with open("src/components/DocumentPickerModal.tsx", "r") as f:
    content = f.read()

old_fetch = """        const fetchDocs = async () => {
            let docs = [];
            try {
                const { data, error } = await supabase.from('project_documents').select('*').eq('project_id', projectId);
                if (data) docs = data;
                else throw new Error("No data");
            } catch(e) {
                docs = await getDocuments(projectId);
            }
            setDocuments(docs.filter(d => d.filename.toLowerCase().endsWith('.pdf')));
        };"""

new_fetch = """        const fetchDocs = async () => {
            let remoteDocs: any[] = [];
            try {
                const { data } = await supabase
                  .from('project_documents')
                  .select('*')
                  .eq('project_id', projectId)
                  .is('deleted_at', null);
                if (data) {
                  remoteDocs = data;
                }
            } catch(err) {
            }
            const localDocs = await getDocuments(projectId);
            const combined = [...remoteDocs];
            for (const localDoc of localDocs) {
              if (!combined.find(d => d.id === localDoc.id)) {
                 combined.push(localDoc);
              }
            }
            setDocuments(combined.filter(d => d.filename.toLowerCase().endsWith('.pdf')));
        };"""

content = content.replace(old_fetch, new_fetch)

with open("src/components/DocumentPickerModal.tsx", "w") as f:
    f.write(content)
