import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

old_hooks = """  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const { pdfToLoad, setPdfToLoad } = usePdfStore();"""

new_hooks = """  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const { pdfToLoad, setPdfToLoad } = usePdfStore();

  useEffect(() => {
    if (pdfFileName) {
      localStorage.setItem(`pdf_measurements_${pdfFileName}`, JSON.stringify(measurements));
    }
  }, [measurements, pdfFileName]);"""

content = content.replace(old_hooks, new_hooks)

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
