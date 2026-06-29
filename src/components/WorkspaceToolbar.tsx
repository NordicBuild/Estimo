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
  isAdmin?: boolean;
}

export function WorkspaceNav({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, isAdmin }: WorkspaceNavProps) {
  const kalkylTabs = ['kalkyl', 'material', 'arbete', 'analys', 'sammanstalln', 'slutsida', 'planering', 'anbud', 'inkop', 'prognos'];
  const isKalkylActive = kalkylTabs.includes(activeTab);
  
  const resursTabs = ['arbetare', 'fastigheter', 'maskiner', 'bilar', 'ovrigt', 'receptbibliotek'];
  const isResursActive = resursTabs.includes(activeTab);

  const projektunderlagTabs = ['dokument_ffu', 'dokument_modell', 'dokument_kommunikation', 'pdf', 'bim'];
  const isProjektunderlagActive = projektunderlagTabs.includes(activeTab);

  const mainTabs = [
    { id: 'hemsida', label: 'Hem', icon: 'home' },
    { id: 'projekt', label: 'Projektinfo', icon: 'info' },
    { id: 'dokument_ffu', label: 'Projektunderlag', icon: 'topic' },
    { id: 'kalkyl', label: 'Anbud', icon: 'calculate' },
    { id: 'arbetare', label: 'Resurser', icon: 'inventory_2' },
    { id: 'mina_uppgifter', label: 'Mina uppgifter', icon: 'person' },
  ] as const;

  return (
    <nav className={`fixed inset-y-0 left-0 pt-16 lg:pt-0 lg:relative bg-surface-container-low border-r border-outline-variant w-64 lg:w-56 flex flex-col py-2 z-50 overflow-y-auto shrink-0 print:hidden h-full transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
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
              { id: 'dokument_modell', label: 'Modell', icon: 'architecture' },
              { id: 'dokument_kommunikation', label: 'Kommunikation', icon: 'forum' },
              { id: 'pdf', label: 'PDF-Mätningar', icon: 'picture_as_pdf' },
              { id: 'bim', label: 'BIM-Mätning', icon: 'view_in_ar' },
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
      
      {isAdmin && (
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
