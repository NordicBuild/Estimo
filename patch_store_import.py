import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

content = content.replace("import { useAppStore } from '../state/useAppStore';", "")
content = content.replace("const { activeProjectId } = useAppStore();", "const activeProjectId = useFfuStore(s => s.activeProjectId);")

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
