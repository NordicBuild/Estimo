import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

old_fetch = """  const fetchDocuments = async () => {
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

new_fetch = """  const fetchDocuments = async () => {
    if (!projectId) return;
    
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
        // Ignored
    }
    
    let localDocs: any[] = [];
    try {
        localDocs = await getDocuments(projectId);
    } catch(err) {}
    
    // Merge, avoiding duplicates by ID
    const mergedMap = new Map();
    [...localDocs, ...remoteDocs].forEach(d => mergedMap.set(d.id, d));
    setDocuments(Array.from(mergedMap.values()));
  };"""

content = content.replace(old_fetch, new_fetch)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)

