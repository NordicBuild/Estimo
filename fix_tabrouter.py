with open("src/components/Workspace/TabRouter.tsx", "r") as f:
    content = f.read()

content = content.replace("projectId={projectId || ''}", "projectId={rest.activeProjectId || ''}")

with open("src/components/Workspace/TabRouter.tsx", "w") as f:
    f.write(content)
