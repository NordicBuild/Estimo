import re
with open("src/ffu/hooks/useAdminDashboard.ts", "r") as f:
    text = f.read()
print(re.findall(r"from\('project_documents'\)\.select\('([^']+)'\)", text))
