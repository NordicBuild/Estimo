import re

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "| 'dokument_ffu' | 'admin_ffu' | 'dokument_modell'",
    "| 'dokument_ffu' | 'admin_ffu' | 'inspektioner' | 'dokument_modell'"
)

with open("src/App.tsx", "w") as f:
    f.write(content)
