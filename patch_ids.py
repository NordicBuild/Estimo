import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

content = content.replace("`local_${Date.now()}_${Math.random()}`", "crypto.randomUUID()")

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)

