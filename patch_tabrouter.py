import re

with open("src/components/Workspace/TabRouter.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import { FfuTab } from '../Ffu/FfuTab';",
    "import { FfuTab } from '../Ffu/FfuTab';\nimport { AdminDashboard } from '../Ffu/AdminDashboard';"
)

content = content.replace(
    "{activeTab === 'dokument_ffu' && (\n        <FfuTab projectId={rest.activeProjectId || ''} />\n      )}",
    "{activeTab === 'dokument_ffu' && (\n        <FfuTab projectId={rest.activeProjectId || ''} />\n      )}\n      {activeTab === 'admin_ffu' && (\n        <AdminDashboard projectId={rest.activeProjectId || ''} />\n      )}"
)

with open("src/components/Workspace/TabRouter.tsx", "w") as f:
    f.write(content)
