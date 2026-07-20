import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

# Add pdfFilePath state
content = content.replace(
    'const [pdfFileName, setPdfFileName] = useState<string | null>(null);',
    'const [pdfFileName, setPdfFileName] = useState<string | null>(null);\n  const [pdfFilePath, setPdfFilePath] = useState<string | null>(null);'
)

# Update useEffect
old_effect = """  useEffect(() => {
    if (pdfFileName) {
      localStorage.setItem(`pdf_measurements_${pdfFileName}`, JSON.stringify(measurements));
    }
  }, [measurements, pdfFileName]);"""

new_effect = """  useEffect(() => {
    if (pdfFilePath) {
      localStorage.setItem(`pdf_measurements_${pdfFilePath}`, JSON.stringify(measurements));
    } else if (pdfFileName) {
      localStorage.setItem(`pdf_measurements_${pdfFileName}`, JSON.stringify(measurements));
    }
  }, [measurements, pdfFileName, pdfFilePath]);"""

content = content.replace(old_effect, new_effect)

# Update loadPdfFromUrl
old_load = """          const savedScales = localStorage.getItem(`pdf_scales_${pdfToLoad.filename}`);
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
          setMeasurements(initialMeasurements);
          setPdfFileName(pdfToLoad.filename);"""

new_load = """          const savedScales = localStorage.getItem(`pdf_scales_${pdfToLoad.filename}`);
          if (savedScales) {
            setPageScales(deserializePageScales(savedScales));
          } else {
            setPageScales(emptyPageScales());
          }
          const savedMeasurements = localStorage.getItem(`pdf_measurements_${pdfToLoad.file_path || pdfToLoad.filename}`);
          const initialMeasurements = savedMeasurements ? JSON.parse(savedMeasurements) : [];
          
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const doc = await loadingTask.promise;
          setPdfDoc(doc);
          setPageNum(1);
          setMeasurements(initialMeasurements);
          setPdfFileName(pdfToLoad.filename);
          setPdfFilePath(pdfToLoad.file_path || null);"""

content = content.replace(old_load, new_load)

# Update handleFileUpload
old_upload = """    const savedScales = localStorage.getItem(`pdf_scales_${file.name}`);
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
      setMeasurements(initialMeasurements);
      setPdfFileName(file.name);"""

new_upload = """    const savedScales = localStorage.getItem(`pdf_scales_${file.name}`);
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
      setMeasurements(initialMeasurements);
      setPdfFileName(file.name);
      setPdfFilePath(null);"""

content = content.replace(old_upload, new_upload)

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
