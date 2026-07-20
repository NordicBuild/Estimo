import re

with open("src/components/Workspace/TabRouter.tsx", "r") as f:
    content = f.read()

content = content.replace("<PdfMeasurementTab addParts={rest.addMeasurementParts} />", "<PdfMeasurementTab addParts={rest.addMeasurementParts} activeProjectId={rest.activeProjectId} />")

with open("src/components/Workspace/TabRouter.tsx", "w") as f:
    f.write(content)
