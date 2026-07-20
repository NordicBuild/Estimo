import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

content = content.replace('import { useFfuStore } from "../ffu/store/useFfuStore";',
'import { useFfuStore } from "../ffu/store/useFfuStore";\nimport { usePdfStore } from "../state/usePdfStore";')


effect_code = """  const { pdfToLoad, setPdfToLoad } = usePdfStore();
  
  useEffect(() => {
    if (pdfToLoad) {
      const loadPdfFromUrl = async () => {
        try {
          const response = await fetch(pdfToLoad.url);
          const arrayBuffer = await response.arrayBuffer();
          setPdfFileName(pdfToLoad.filename);
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
          setMeasurements([]);
          setCurrentPoints([]);
        } catch (err) {
          console.error("Failed to load PDF from store", err);
          alert("Kunde inte ladda PDF från FFU");
        }
        setPdfToLoad(null);
      };
      loadPdfFromUrl();
    }
  }, [pdfToLoad, setPdfToLoad]);"""

content = content.replace("const [measurements, setMeasurements] = useState<Measurement[]>([]);",
"const [measurements, setMeasurements] = useState<Measurement[]>([]);\n" + effect_code)

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)

