import re

with open("src/components/WorkspaceToolbar.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "const projektunderlagTabs = ['dokument_ffu', 'admin_ffu', 'dokument_modell', 'dokument_kommunikation', 'pdf'];",
    "const projektunderlagTabs = ['dokument_ffu', 'admin_ffu', 'inspektioner', 'dokument_modell', 'dokument_kommunikation', 'pdf'];"
)

content = content.replace(
    "{ id: 'admin_ffu', label: 'Admin (FFU)', icon: 'admin_panel_settings' },",
    "{ id: 'admin_ffu', label: 'Admin (FFU)', icon: 'admin_panel_settings' },\n              { id: 'inspektioner', label: 'Inspektioner', icon: 'checklist' },"
)

# Insert ApprovalNotification in the toolbar if possible. Where is a good spot?
# Let's put it next to the notification bell if there is one, or just in the WorkspaceToolbar component return
content = content.replace(
    "<div className=\"flex flex-col flex-1 overflow-y-auto py-4 gap-1 px-3\">",
    "<div className=\"px-3 pb-2\"><ApprovalNotification /></div>\n        <div className=\"flex flex-col flex-1 overflow-y-auto py-4 gap-1 px-3\">"
)

with open("src/components/WorkspaceToolbar.tsx", "w") as f:
    f.write(content)
