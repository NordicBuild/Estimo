import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

old_load_scale = """          const savedScales = localStorage.getItem(`pdf_scales_${pdfToLoad.filename}`);
          if (savedScales) {
            setPageScales(deserializePageScales(savedScales));
          } else {
            setPageScales(emptyPageScales());
          }"""

new_load_scale = """          const savedScales = localStorage.getItem(`pdf_scales_${pdfToLoad.file_path || pdfToLoad.filename}`);
          if (savedScales) {
            setPageScales(deserializePageScales(savedScales));
          } else {
            setPageScales(emptyPageScales());
          }"""

content = content.replace(old_load_scale, new_load_scale)

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
