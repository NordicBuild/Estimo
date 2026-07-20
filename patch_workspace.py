with open("src/components/WorkspaceToolbar.tsx", "r") as f:
    lines = f.readlines()

new_code = """
interface PdfConfig {
  orientation: 'portrait' | 'landscape';
  margin: number;
  includeSummary: boolean;
}

export function WorkspaceActions({
  openModal,
  fileInputRef,
  handleImportExcel,
  handleExportExcel,
  downloadTemplate,
}: WorkspaceActionsProps) {
  const [isPdfModalOpen, setIsPdfModalOpen] = React.useState(false);
  const [pdfConfig, setPdfConfig] = React.useState<PdfConfig>({
    orientation: 'portrait',
    margin: 10,
    includeSummary: true
  });

  const generatePdf = () => {
    let element = document.getElementById('pdf-anbud-content');
    if (!element) {
      element = document.querySelector('main');
    }
    if (!element) {
      alert('Kunde inte hitta anbudet att generera PDF från.');
      return;
    }

    const originalDisplays = new Map();
    if (!pdfConfig.includeSummary) {
      const summarySection = document.getElementById('pdf-summary-section');
      if (summarySection) {
        originalDisplays.set(summarySection, summarySection.style.display);
        summarySection.style.display = 'none';
      }
    }

    const opt = {
      margin:       pdfConfig.margin,
      filename:     'Anbud_Förhandsgranskning.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: pdfConfig.orientation }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
      if (!pdfConfig.includeSummary) {
         originalDisplays.forEach((display, el) => {
           el.style.display = display;
         });
      }
      setIsPdfModalOpen(false);
    });
  };

  return (
    <>
      <div className="bg-surface border-b border-outline-variant px-4 md:px-8 py-3 flex flex-wrap gap-3 items-center justify-between text-sm z-40 shrink-0 print:hidden">
        <div className="flex flex-wrap gap-3 items-center">
          <button className="px-4 py-2 rounded-lg text-xs font-bold text-on-primary bg-primary hover:opacity-90 transition-opacity self-start md:self-auto shrink-0 flex items-center shadow-sm" onClick={() => openModal()}>
            <span className="material-symbols-outlined text-[18px] mr-1">add</span> Ny Byggdel
          </button>
          <button 
            className="px-4 py-2 rounded-lg text-xs font-bold border border-outline-variant text-on-surface bg-surface hover:bg-surface-container-low transition-colors self-start md:self-auto shrink-0 flex items-center" 
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="material-symbols-outlined text-[18px] mr-1 text-on-surface-variant">upload_file</span> Importera från Excel
          </button>
          <button 
            className="px-4 py-2 rounded-lg text-xs font-bold border border-outline-variant text-on-surface bg-surface hover:bg-surface-container-low transition-colors self-start md:self-auto shrink-0 flex items-center" 
            onClick={handleExportExcel}
          >
            <span className="material-symbols-outlined text-[18px] mr-1 text-on-surface-variant">file_download</span> Exportera Total
          </button>
          <button 
            className="px-4 py-2 rounded-lg text-xs font-bold border border-outline-variant text-on-surface bg-surface hover:bg-surface-container-low transition-colors self-start md:self-auto shrink-0 flex items-center" 
            onClick={() => setIsPdfModalOpen(true)}
          >
            <span className="material-symbols-outlined text-[18px] mr-1 text-on-surface-variant">picture_as_pdf</span> Förhandsgranska PDF
          </button>
          <button 
            className="px-4 py-2 rounded-lg text-xs font-bold border border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-container-low transition-colors self-start md:self-auto shrink-0 flex items-center" 
            onClick={downloadTemplate}
          >
            <span className="material-symbols-outlined text-[18px] mr-1">download</span> Ladda ner mall
          </button>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
          />
        </div>
      </div>

      {isPdfModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-bold text-on-surface">PDF Konfiguration</h3>
              <button onClick={() => setIsPdfModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Orientering</label>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={pdfConfig.orientation === 'portrait'} 
                      onChange={() => setPdfConfig(prev => ({ ...prev, orientation: 'portrait' }))} 
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Porträtt</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer ml-4">
                    <input 
                      type="radio" 
                      checked={pdfConfig.orientation === 'landscape'} 
                      onChange={() => setPdfConfig(prev => ({ ...prev, orientation: 'landscape' }))} 
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Landskap</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Marginaler (mm)</label>
                <input 
                  type="number" 
                  value={pdfConfig.margin} 
                  onChange={(e) => setPdfConfig(prev => ({ ...prev, margin: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  min="0"
                  max="50"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input 
                    type="checkbox" 
                    checked={pdfConfig.includeSummary} 
                    onChange={(e) => setPdfConfig(prev => ({ ...prev, includeSummary: e.target.checked }))}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Inkludera sammanfattningssida</span>
                </label>
                <p className="text-xs text-on-surface-variant mt-1 ml-6">
                  Välj om anbudets totala sammanställning ska synas i PDF:en.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-outline-variant flex justify-end gap-2 bg-surface-container-low">
              <button 
                onClick={() => setIsPdfModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              >
                Avbryt
              </button>
              <button 
                onClick={generatePdf}
                className="px-4 py-2 rounded-lg text-sm font-bold text-on-primary bg-primary hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                Generera
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
"""

lines = lines[:13] + [new_code] + lines[81:]

content = "".join(lines)
if "import { useState }" not in content:
    content = content.replace("import React from 'react';", "import React, { useState } from 'react';")

with open("src/components/WorkspaceToolbar.tsx", "w") as f:
    f.write(content)

