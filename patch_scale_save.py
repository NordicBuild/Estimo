import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

old_scale_save = """  const handleSetScale = (scaleObj: Scale) => {
    const updatedScales = setPageScale(pageScales, pageNum, scaleObj);
    setPageScales(updatedScales);
    setShowScaleWarning(false);
    if (pdfFileName) {
      localStorage.setItem(`pdf_scales_${pdfFileName}`, serializePageScales(updatedScales));
    }"""

new_scale_save = """  const handleSetScale = (scaleObj: Scale) => {
    const updatedScales = setPageScale(pageScales, pageNum, scaleObj);
    setPageScales(updatedScales);
    setShowScaleWarning(false);
    if (pdfFilePath) {
      localStorage.setItem(`pdf_scales_${pdfFilePath}`, serializePageScales(updatedScales));
    } else if (pdfFileName) {
      localStorage.setItem(`pdf_scales_${pdfFileName}`, serializePageScales(updatedScales));
    }"""

content = content.replace(old_scale_save, new_scale_save)

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
