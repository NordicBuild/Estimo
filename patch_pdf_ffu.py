import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

# 1. Add import
content = content.replace("import { getFile } from '../ffu/localDb';", "import { getFile } from '../ffu/localDb';\nimport { DocumentPickerModal } from './DocumentPickerModal';\nimport { useAppStore } from '../state/useAppStore';")

# 2. Add state
old_state = """  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const { pdfToLoad, setPdfToLoad } = usePdfStore();"""

new_state = """  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const { pdfToLoad, setPdfToLoad } = usePdfStore();
  const [isFfuPickerOpen, setIsFfuPickerOpen] = useState(false);
  const { activeProjectId } = useAppStore();"""

content = content.replace(old_state, new_state)

# 3. Add button in toolbar
old_button = """          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 ml-1 bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-1.5 font-medium pr-2.5"
          >
            <span className="material-symbols-outlined text-[16px]">
              upload_file
            </span>{" "}
            Ladda upp
          </button>"""

new_button = """          <button
            onClick={() => setIsFfuPickerOpen(true)}
            className="p-1.5 ml-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors flex items-center gap-1.5 font-medium pr-2.5 border border-blue-200"
          >
            <span className="material-symbols-outlined text-[16px]">
              folder_open
            </span>{" "}
            FFU
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 ml-1 bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-1.5 font-medium pr-2.5"
          >
            <span className="material-symbols-outlined text-[16px]">
              upload_file
            </span>{" "}
            Ladda upp
          </button>"""

content = content.replace(old_button, new_button)

# 4. Add button in empty state
old_empty_btn = """              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined">description</span>{" "}
                Välj PDF-fil
              </button>"""

new_empty_btn = """              <div className="flex gap-4">
                <button
                  onClick={() => setIsFfuPickerOpen(true)}
                  className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg font-medium shadow-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">folder_open</span>{" "}
                  Hämta från FFU
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">upload_file</span>{" "}
                  Ladda upp lokal fil
                </button>
              </div>"""

content = content.replace(old_empty_btn, new_empty_btn)

# 5. Add Modal
old_return_end = """    </div>
  );
}"""

new_return_end = """      <DocumentPickerModal 
        isOpen={isFfuPickerOpen}
        onClose={() => setIsFfuPickerOpen(false)}
        projectId={activeProjectId || documentId || 'mock-project-id'}
      />
    </div>
  );
}"""

content = content.replace(old_return_end, new_return_end)

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(content)
