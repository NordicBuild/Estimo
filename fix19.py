import re
with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

matches = list(re.finditer(r'\{dialogConfig && dialogConfig\.isOpen && \(', content))
print("Found dialogConfig", len(matches), "times.")
idx_dialog = matches[0].start()

bottom_part = content[idx_dialog:]
print("bottom_part length:", len(bottom_part))
