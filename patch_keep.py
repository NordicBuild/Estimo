import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

old_block = """           if (slashIndex === -1) {
               items.push({ type: 'file', ...doc });
           } else {"""

new_block = """           if (slashIndex === -1) {
               if (doc.filename !== ".keep") {
                   items.push({ type: 'file', ...doc });
               }
           } else {"""

content = content.replace(old_block, new_block)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
