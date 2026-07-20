import re

with open("src/components/Ffu/AdminDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace("image:        { type: 'jpeg', quality: 0.98 }", "image:        { type: 'jpeg' as const, quality: 0.98 }")
content = content.replace('variant="secondary"', 'variant="ghost"')

with open("src/components/Ffu/AdminDashboard.tsx", "w") as f:
    f.write(content)

