import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

# Update props interface
old_props = """export function PdfMeasurementTab({
  addParts,
  initialDocumentId,
}: {
  addParts?: (parts: Omit<Byggdel, "id">[]) => void;
  initialDocumentId?: string | null;
}) {"""

new_props = """export function PdfMeasurementTab({
  addParts,
  initialDocumentId,
  activeProjectId,
}: {
  addParts?: (parts: Omit<Byggdel, "id">[]) => void;
  initialDocumentId?: string | null;
  activeProjectId?: string | null;
}) {"""
content = content.replace(old_props, new_props)

content = content.replace("const activeProjectId = useFfuStore(s => s.activeProjectId);", "")

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
