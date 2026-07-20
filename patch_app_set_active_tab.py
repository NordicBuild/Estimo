import re

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace(
    '<TabRouter \n          activeTab={activeTab}',
    '<TabRouter \n          activeTab={activeTab}\n          setActiveTab={setActiveTab}'
)

with open("src/App.tsx", "w") as f:
    f.write(content)

