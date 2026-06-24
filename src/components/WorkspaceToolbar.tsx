import React from 'react';

interface WorkspaceActionsProps {
  openModal: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExportExcel: () => void;
  downloadTemplate: () => void;
}

export function WorkspaceActions({
  openModal,
  fileInputRef,
  handleImportExcel,
  handleExportExcel,
  downloadTemplate,
}: WorkspaceActionsProps) {
  return (
    <div className="bg-surface border-b border-outline-variant px-4 md:px-8 py-3 flex flex-wrap gap-3 items-center text-sm z-40 shrink-0 print:hidden">
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
  );
}

interface WorkspaceNavProps {
  activeTab: string;
  setActiveTab: (val: any) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
}

export function WorkspaceNav({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }: WorkspaceNavProps) {
  const tabs = [
    { id: 'hemsida', label: 'Hem', icon: 'home' },
    { id: 'projekt', label: 'Projektinfo', icon: 'info' },
    { id: 'kalkyl', label: 'Kalkyl', icon: 'calculate' },
    { id: 'pdf', label: 'PDF-mätningar', icon: 'picture_as_pdf' },
    { id: 'bim', label: 'BIM 3D Mätning', icon: 'view_in_ar' },
    { id: 'analys', label: 'Analys & KPI', icon: 'monitoring' },
    { id: 'sammanstalln', label: 'Sammanställning', icon: 'table_chart' },
    { id: 'planering', label: 'Planering', icon: 'calendar_month' },
    { id: 'slutsida', label: 'Slutsida', icon: 'receipt_long' },
    { id: 'anbud', label: 'Kundanbud', icon: 'contract' },
    { id: 'ifc', label: 'IFC V1', icon: 'view_in_ar' },
    { id: 'material', label: 'Materialdatabas', icon: 'inventory_2' },
    { id: 'arbete', label: 'Arbetsmoment', icon: 'engineering' },
  ] as const;

  return (
    <nav className={`fixed inset-y-0 left-0 pt-16 lg:pt-0 lg:relative bg-surface-container-low border-r border-outline-variant w-64 lg:w-48 flex flex-col py-2 z-50 overflow-y-auto shrink-0 print:hidden h-full transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="flex items-center justify-between px-4 lg:hidden mb-4 mt-2">
        <span className="font-bold text-primary uppercase tracking-widest text-xs">Meny</span>
        <button onClick={() => setSidebarOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      {tabs.map(tab => (
        <button 
          key={tab.id}
          className={`h-11 px-4 text-[11px] font-bold tracking-widest uppercase flex items-center gap-3 text-left transition-colors border-l-4 ${
            activeTab === tab.id 
              ? 'text-primary border-primary bg-primary/5' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
          }`}
          onClick={() => { setActiveTab(tab.id as any); setSidebarOpen(false); }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span> 
          <span className="truncate">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
