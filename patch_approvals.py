import re

with open("src/ffu/hooks/useAdminDashboard.ts", "r") as f:
    content = f.read()

content = content.replace(
    "const { data: approvals } = await supabase.from('document_approvals').select('*').eq('status', 'approved');",
    "const { data: complianceApprovals } = await supabase.from('document_approvals').select('*').eq('status', 'approved');"
)
content = content.replace(
    "const approvedDocIds = new Set(approvals?.map(a => a.document_id));",
    "const approvedDocIds = new Set(complianceApprovals?.map(a => a.document_id));"
)

with open("src/ffu/hooks/useAdminDashboard.ts", "w") as f:
    f.write(content)
