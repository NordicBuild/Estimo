import re

with open("src/ffu/hooks/useBatchOperations.ts", "r") as f:
    content = f.read()

content = content.replace("startsWith(folderPath)", "startsWith(folderPath + '/')")

with open("src/ffu/hooks/useBatchOperations.ts", "w") as f:
    f.write(content)
