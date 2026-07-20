import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

# To use documentId properly and not hardcode "mock-project-id"

content = content.replace("projectId: 'mock-project-id', // Replace with real context", "projectId: documentId || 'mock-project-id',")

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
