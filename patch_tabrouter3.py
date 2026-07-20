import re

with open("src/components/Workspace/TabRouter.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import { AdminDashboard } from '../Ffu/AdminDashboard';",
    "import { AdminDashboard } from '../Ffu/AdminDashboard';\nimport { InspectionTab } from '../Ffu/InspectionTab';"
)

content = content.replace(
    "{activeTab === 'admin_ffu' && (\n        <AdminDashboard projectId={rest.activeProjectId || ''} />\n      )}",
    "{activeTab === 'admin_ffu' && (\n        <AdminDashboard projectId={rest.activeProjectId || ''} />\n      )}\n      {activeTab === 'inspektioner' && (\n        <InspectionTab projectId={rest.activeProjectId || ''} />\n      )}"
)

with open("src/components/Workspace/TabRouter.tsx", "w") as f:
    f.write(content)
