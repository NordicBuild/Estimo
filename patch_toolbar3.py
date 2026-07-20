import re

with open("src/components/WorkspaceToolbar.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "lg:translate-x-0'}>\n      <div className=\"flex items-center justify-between",
    "lg:translate-x-0'}>\n      <div className=\"px-3 pb-2\"><ApprovalNotification /></div>\n      <div className=\"flex items-center justify-between"
)

with open("src/components/WorkspaceToolbar.tsx", "w") as f:
    f.write(content)
