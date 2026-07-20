import re

with open("src/components/Workspace/TabRouter.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "<FfuTab projectId={rest.activeProjectId || ''} />",
    "<FfuTab projectId={rest.activeProjectId || ''} availableByggdelar={rest.byggdelar || []} />"
)

with open("src/components/Workspace/TabRouter.tsx", "w") as f:
    f.write(content)
