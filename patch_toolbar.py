import re

with open("src/components/WorkspaceToolbar.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "const projektunderlagTabs = ['dokument_ffu', 'dokument_modell', 'dokument_kommunikation', 'pdf'];",
    "const projektunderlagTabs = ['dokument_ffu', 'admin_ffu', 'dokument_modell', 'dokument_kommunikation', 'pdf'];"
)

content = content.replace(
    "{ id: 'dokument_ffu', label: 'FFU', icon: 'description' },",
    "{ id: 'dokument_ffu', label: 'FFU', icon: 'description' },\n              { id: 'admin_ffu', label: 'Admin (FFU)', icon: 'admin_panel_settings' },"
)

with open("src/components/WorkspaceToolbar.tsx", "w") as f:
    f.write(content)
