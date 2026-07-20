import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

imports = """import { usePdfStore } from "../state/usePdfStore";
import { supabase } from '../supabase';
import { getFile } from '../ffu/localDb';"""

content = content.replace('import { usePdfStore } from "../state/usePdfStore";', imports)

old_load = """      const loadPdfFromUrl = async () => {
        try {
          const response = await fetch(pdfToLoad.url);
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

new_load = """      const loadPdfFromUrl = async () => {
        try {
          let arrayBuffer;
          if (pdfToLoad.url.startsWith('blob:')) {
              const response = await fetch(pdfToLoad.url);
              arrayBuffer = await response.arrayBuffer();
          } else {
              try {
                  const localFile = await getFile(pdfToLoad.file_path);
                  if (localFile) {
                      arrayBuffer = await localFile.arrayBuffer();
                  } else {
                      const { data, error } = await supabase.storage.from("documents").download(pdfToLoad.file_path);
                      if (error || !data) {
                          throw new Error("Failed to download PDF: " + (error?.message || "No data"));
                      }
                      arrayBuffer = await data.arrayBuffer();
                  }
              } catch (e) {
                  // Fallback to fetch if localDb/supabase fails (e.g. if file_path is somehow a full URL)
                  const response = await fetch(pdfToLoad.url);
                  arrayBuffer = await response.arrayBuffer();
              }
          }"""

content = content.replace(old_load, new_load)

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
