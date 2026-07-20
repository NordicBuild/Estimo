import re

with open("src/components/HemsidaTab.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "{filteredProjects.filter(p => !p.folderId || !folders.find(f => f.id === p.folderId)).map(p => (",
    "{filteredProjects.filter(p => !p.folderId || !(folders || []).find(f => f.id === p.folderId)).map(p => ("
)

with open("src/components/HemsidaTab.tsx", "w") as f:
    f.write(content)
