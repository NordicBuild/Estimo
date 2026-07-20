import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

# Replace setMeasurements([]) in loadPdfFromUrl
old_load = """          setPdfFileName(pdfToLoad.filename);
          const savedScales = localStorage.getItem(`pdf_scales_${pdfToLoad.filename}`);
          if (savedScales) {
            setPageScales(deserializePageScales(savedScales));
          } else {
            setPageScales(emptyPageScales());
          }
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const doc = await loadingTask.promise;
          setPdfDoc(doc);
          setPageNum(1);
          setMeasurements([]);"""

new_load = """          setPdfFileName(pdfToLoad.filename);
          const savedScales = localStorage.getItem(`pdf_scales_${pdfToLoad.filename}`);
          if (savedScales) {
            setPageScales(deserializePageScales(savedScales));
          } else {
            setPageScales(emptyPageScales());
          }
          const savedMeasurements = localStorage.getItem(`pdf_measurements_${pdfToLoad.filename}`);
          const initialMeasurements = savedMeasurements ? JSON.parse(savedMeasurements) : [];
          
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const doc = await loadingTask.promise;
          setPdfDoc(doc);
          setPageNum(1);
          setMeasurements(initialMeasurements);"""

content = content.replace(old_load, new_load)

# Replace setMeasurements([]) in handleFileUpload
old_upload = """    setPdfFileName(file.name);
    const savedScales = localStorage.getItem(`pdf_scales_${file.name}`);
    if (savedScales) {
      setPageScales(deserializePageScales(savedScales));
    } else {
      setPageScales(emptyPageScales());
    }

    const arrayBuffer = await file.arrayBuffer();
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setPageNum(1);
      setMeasurements([]);"""

new_upload = """    setPdfFileName(file.name);
    const savedScales = localStorage.getItem(`pdf_scales_${file.name}`);
    if (savedScales) {
      setPageScales(deserializePageScales(savedScales));
    } else {
      setPageScales(emptyPageScales());
    }
    const savedMeasurements = localStorage.getItem(`pdf_measurements_${file.name}`);
    const initialMeasurements = savedMeasurements ? JSON.parse(savedMeasurements) : [];

    const arrayBuffer = await file.arrayBuffer();
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setPageNum(1);
      setMeasurements(initialMeasurements);"""

content = content.replace(old_upload, new_upload)

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
