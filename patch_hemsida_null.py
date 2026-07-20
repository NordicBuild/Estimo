import re

with open("src/components/HemsidaTab.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "const completedProjects = projects.filter(p => p.projectInfo?.status === 'Klar' || p.projectInfo?.status === 'Avslutat');",
    "const completedProjects = (projects || []).filter(p => p?.projectInfo?.status === 'Klar' || p?.projectInfo?.status === 'Avslutat');"
)
content = content.replace(
    "const ongoingProjects = projects.filter(p => p.projectInfo?.status === 'Pågående' || !p.projectInfo?.status);",
    "const ongoingProjects = (projects || []).filter(p => p?.projectInfo?.status === 'Pågående' || !p?.projectInfo?.status);"
)
content = content.replace(
    "const filteredProjects = projects.filter(p => {",
    "const filteredProjects = (projects || []).filter(p => {\n    if (!p) return false;"
)
content = content.replace(
    "const status = p.projectInfo?.status || 'Pågående';",
    "const status = p?.projectInfo?.status || 'Pågående';"
)

with open("src/components/HemsidaTab.tsx", "w") as f:
    f.write(content)
