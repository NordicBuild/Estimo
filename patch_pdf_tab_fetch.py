import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

old = """          const response = await fetch(pdfToLoad.url);
          const arrayBuffer = await response.arrayBuffer();"""

new = """          const response = await fetch(pdfToLoad.url);
          if (!response.ok) {
              const text = await response.text();
              throw new Error(`Kunde inte ladda PDF (status: ${response.status}): ${text.substring(0, 50)}`);
          }
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
              const text = await response.text();
              throw new Error(`Fick JSON istället för PDF: ${text.substring(0, 50)}`);
          }
          const arrayBuffer = await response.arrayBuffer();"""

content = content.replace(old, new)

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
