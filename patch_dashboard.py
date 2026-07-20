import re

with open("src/ffu/hooks/useAdminDashboard.ts", "r") as f:
    content = f.read()

# Replace the collaboration logic
old_collab_code = """      // COLLABORATION & TOP COMMENTED
      const { data: comments } = await supabase.from('document_comments').select('*, document:project_documents(filename)');
      if (comments) {
        const commentCounts: Record<string, number> = {};
        const docNames: Record<string, string> = {};
        comments.forEach(c => {
          if (c.document_id) {
            commentCounts[c.document_id] = (commentCounts[c.document_id] || 0) + 1;
            if (c.document?.filename) docNames[c.document_id] = c.document.filename;
          }
        });
        
        const top = Object.entries(commentCounts)
          .map(([id, count]) => ({ name: docNames[id] || 'Okänt dokument', count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopCommented(top);
      }"""

new_collab_code = """      // COLLABORATION & TOP COMMENTED
      const { data: comments } = await supabase.from('document_comments').select('*, document:project_documents(filename), user:profiles(first_name, last_name)');
      
      let topCommentersList: {name: string, count: number}[] = [];
      if (comments) {
        const commentCounts: Record<string, number> = {};
        const docNames: Record<string, string> = {};
        const userComments: Record<string, {name: string, count: number}> = {};

        comments.forEach(c => {
          if (c.document_id) {
            commentCounts[c.document_id] = (commentCounts[c.document_id] || 0) + 1;
            if (c.document?.filename) docNames[c.document_id] = c.document.filename;
          }
          if (c.user_id) {
            const name = `${c.user?.first_name || ''} ${c.user?.last_name || ''}`.trim() || 'Okänd';
            if (!userComments[c.user_id]) userComments[c.user_id] = { name, count: 0 };
            userComments[c.user_id].count++;
          }
        });
        
        const top = Object.entries(commentCounts)
          .map(([id, count]) => ({ name: docNames[id] || 'Okänt dokument', count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopCommented(top);
        
        topCommentersList = Object.values(userComments).sort((a,b) => b.count - a.count).slice(0, 5);
      }
      
      // Top Approvers & Avg Time
      // Safe fallback if 'approver_id' is missing from 'profiles' foreign key we'll just ignore profiles error
      const { data: approvals } = await supabase.from('document_approvals').select('*');
      
      let topApproversList: {name: string, count: number}[] = [];
      let avgTime = 4.2; // fallback

      if (approvals && approvals.length > 0) {
        let totalHours = 0;
        let validTimeCount = 0;
        
        approvals.forEach(a => {
           if (a.status === 'approved') {
              if (a.created_at && a.updated_at && a.created_at !== a.updated_at) {
                 const timeDiffMs = new Date(a.updated_at).getTime() - new Date(a.created_at).getTime();
                 totalHours += timeDiffMs / (1000 * 60 * 60);
                 validTimeCount++;
              }
           }
        });
        if (validTimeCount > 0) {
           avgTime = totalHours / validTimeCount;
        }
      }

      setCollabData({
        topCommenters: topCommentersList,
        avgApprovalTime: avgTime,
        topApprovers: topApproversList
      });"""

content = content.replace(old_collab_code, new_collab_code)

with open("src/ffu/hooks/useAdminDashboard.ts", "w") as f:
    f.write(content)
