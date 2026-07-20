import re

with open("src/ffu/hooks/useBatchOperations.ts", "r") as f:
    content = f.read()

old_delete = """  const batchDelete = async (documentIds: string[]) => {
    setIsProcessing(true);
    try {
      const docs = await getDocuments(projectId);"""

new_delete = """  const batchDelete = async (documentIds: string[]) => {
    setIsProcessing(true);
    try {
      let remoteDocs: any[] = [];
      try {
          const { data } = await supabase
            .from('project_documents')
            .select('*')
            .eq('project_id', projectId);
          if (data) remoteDocs = data;
      } catch(e) {}
      const localDocs = await getDocuments(projectId);
      const docs = [...remoteDocs, ...localDocs];"""

content = content.replace(old_delete, new_delete)

with open("src/ffu/hooks/useBatchOperations.ts", "w") as f:
    f.write(content)
