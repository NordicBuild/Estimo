import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

# We want to replace the flex-1 flex min-h-0 relative part and below.
idx1 = content.find('<div className="flex flex-1 min-h-0 relative">')
if idx1 != -1:
    print(f"Found at {idx1}")
else:
    print("Not found")

