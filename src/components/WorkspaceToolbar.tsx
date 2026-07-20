import { ApprovalNotification } from './Ffu/ApprovalNotification';
import React, { useState } from 'react';



interface WorkspaceActionsProps {
  openModal: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExportExcel: () => void;
  downloadTemplate: () => void;
  saveSnapshot: () => void;
  openSnapshotModal: () => void;
}


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
  saveSnapshot,
  openSnapshotModal,
}: WorkspaceActionsProps) {
  const [isPdfModalOpen, setIsPdfModalOpen] = React.useState(false);
  const [pdfConfig, setPdfConfig] = React.useState<PdfConfig>({
    orientation: 'portrait',
    margin: 10,
    includeSummary: true
  });

  const generatePdf = async () => {
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
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: pdfConfig.orientation }
    };
    
    
    const module = await import('html2pdf.js');
    const html2pdf = (module as any).default || module;
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
interface KalkylSubNavProps {
  activeTab: string;
  setActiveTab: (val: any) => void;
}

interface WorkspaceNavProps {
  activeTab: string;
  setActiveTab: (val: any) => void;
  sidebarOpen?: boolean;
  setSidebarOpen?: (val: boolean) => void;
  isPlatformAdmin?: boolean;
}

export function WorkspaceNav({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, isPlatformAdmin }: WorkspaceNavProps) {
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default w-64 is 256px
  
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const doDrag = (dragEvent: MouseEvent) => {
      const newWidth = Math.max(160, Math.min(600, startWidth + (dragEvent.clientX - startX)));
      setSidebarWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const kalkylTabs = ['kalkyl', 'material', 'arbete', 'analys', 'sammanstalln', 'slutsida', 'planering', 'anbud', 'inkop', 'prognos'];
  const isKalkylActive = kalkylTabs.includes(activeTab);
  
  const resursTabs = ['arbetare', 'fastigheter', 'maskiner', 'bilar', 'ovrigt', 'receptbibliotek'];
  const isResursActive = resursTabs.includes(activeTab);

  const projektunderlagTabs = ['dokument_ffu', 'admin_ffu', 'inspektioner', 'dokument_modell', 'dokument_kommunikation', 'pdf'];
  const isProjektunderlagActive = projektunderlagTabs.includes(activeTab);

  const mainTabs = [
    { id: 'hemsida', label: 'Hem', icon: 'home' },
    { id: 'projekt', label: 'Projektinfo', icon: 'info' },
    { id: 'dokument_ffu', label: 'Projektunderlag', icon: 'topic' },
    { id: 'kalkyl', label: 'Anbud', icon: 'calculate' },
    { id: 'arbetare', label: 'Resurser', icon: 'inventory_2' },
    { id: 'mina_uppgifter', label: 'Mina uppgifter', icon: 'person' },
    { id: 'aktivitetslogg', label: 'Aktivitetslogg', icon: 'history' },
    { id: 'portfolio', label: 'Portfolio', icon: 'cases' },
  ] as const;

  return (
    <nav 
      className={`fixed inset-y-0 left-0 pt-16 lg:pt-0 lg:relative bg-surface-container-low border-r border-outline-variant flex flex-col py-2 z-50 shrink-0 print:hidden h-full transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      style={{ width: sidebarOpen ? sidebarWidth : (window.innerWidth >= 1024 ? sidebarWidth : 256) }}
    >
      {/* Resizer Handle */}
      <div 
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary z-50 hidden lg:block"
        onMouseDown={startResizing}
      />
      <div className="overflow-y-auto flex-1 flex flex-col">
      <div className="flex items-center justify-between px-4 lg:hidden mb-4 mt-2">
        <span className="font-bold text-primary uppercase tracking-widest text-xs">Meny</span>
        <button onClick={() => setSidebarOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      <div className="flex flex-col gap-1 px-2">
        {mainTabs.map(tab => {
          let isActive = activeTab === tab.id;
          let subTabs: {id: string, label: string, icon: string}[] | null = null;

          if (tab.id === 'kalkyl') {
            isActive = isKalkylActive;
            subTabs = [
              { id: 'kalkyl', label: 'Kalkyl', icon: 'calculate' },
              { id: 'analys', label: 'Analys & KPI', icon: 'monitoring' },
              { id: 'sammanstalln', label: 'Sammanställning', icon: 'table_chart' },
              { id: 'slutsida', label: 'Slutsida', icon: 'receipt_long' },
              { id: 'planering', label: 'Planering', icon: 'calendar_month' },
              { id: 'anbud', label: 'Kundanbud', icon: 'contract' },
              { id: 'inkop', label: 'Inköp', icon: 'shopping_cart' },
              { id: 'prognos', label: 'Prognos / EAC', icon: 'trending_up' },
              { id: 'material', label: 'Material', icon: 'inventory_2' },
              { id: 'arbete', label: 'Arbetsmoment', icon: 'engineering' },
            ];
          } else if (tab.id === 'arbetare') {
            isActive = isResursActive;
            subTabs = [
              { id: 'arbetare', label: 'Arbetare', icon: 'engineering' },
              { id: 'fastigheter', label: 'Fastigheter', icon: 'home_work' },
              { id: 'maskiner', label: 'Maskiner', icon: 'precision_manufacturing' },
              { id: 'bilar', label: 'Bilar', icon: 'directions_car' },
              { id: 'ovrigt', label: 'Övrigt', icon: 'category' },
              { id: 'receptbibliotek', label: 'Receptbibliotek', icon: 'menu_book' },
            ];
          } else if (tab.id === 'dokument_ffu') {
            isActive = isProjektunderlagActive;
            subTabs = [
              { id: 'dokument_ffu', label: 'FFU', icon: 'description' },
              { id: 'admin_ffu', label: 'Admin (FFU)', icon: 'admin_panel_settings' },
              { id: 'inspektioner', label: 'Inspektioner', icon: 'checklist' },
              { id: 'dokument_modell', label: 'Modell', icon: 'architecture' },
              { id: 'dokument_kommunikation', label: 'Kommunikation', icon: 'forum' },
              { id: 'pdf', label: 'PDF-Mätningar', icon: 'picture_as_pdf' },
            ];
          }
          
          return (
            <div key={tab.id} className="flex flex-col">
              <button 
                className={`h-10 px-3 text-xs font-bold tracking-widest uppercase flex items-center gap-3 text-left transition-colors rounded-lg shrink-0 ${
                  isActive 
                    ? 'text-primary bg-primary/10' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                }`}
                onClick={() => { setActiveTab(tab.id as any); if (!subTabs) setSidebarOpen(false); }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span> 
                <span className="truncate">{tab.label}</span>
                {subTabs && (
                  <span className="material-symbols-outlined ml-auto text-[16px]">
                    {isActive ? 'expand_more' : 'chevron_right'}
                  </span>
                )}
              </button>
              
              {isActive && subTabs && (
                <div className="flex flex-col mt-1 mb-2 ml-4 border-l-2 border-outline-variant/50 pl-2 gap-1">
                  {subTabs.map(subTab => (
                    <button
                      key={subTab.id}
                      className={`h-9 px-3 text-xs font-semibold flex items-center gap-3 text-left transition-colors rounded-md ${
                        activeTab === subTab.id
                          ? 'text-primary bg-primary/10'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                      }`}
                      onClick={() => { setActiveTab(subTab.id as any); setSidebarOpen(false); }}
                    >
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: activeTab === subTab.id ? "'FILL' 1" : "'FILL' 0" }}>{subTab.icon}</span>
                      <span className="truncate">{subTab.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      </div>
      {isPlatformAdmin && (
        <div className="mt-auto px-4 pb-4">
          <button 
            className="w-full h-10 px-3 text-xs font-bold tracking-widest uppercase flex items-center gap-3 text-left transition-colors rounded-lg shrink-0 text-on-surface-variant hover:text-primary hover:bg-primary/10"
            onClick={() => {
              localStorage.setItem('betong_app_mode', 'admin');
              window.location.reload();
            }}
          >
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span> 
            <span className="truncate">Admin Portal</span>
          </button>
        </div>
      )}
    </nav>
  );
}
