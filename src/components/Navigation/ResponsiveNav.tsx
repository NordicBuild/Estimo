import React, { useState, useEffect } from 'react';
import { ArrowLeft, Menu, Settings, HelpCircle, Calculator, Box, FileText, Smartphone, LayoutDashboard, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ResponsiveNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentPageTitle: string;
  goBack: () => void;
  children: React.ReactNode;
}

export function ResponsiveNav({ currentTab, onTabChange, currentPageTitle, goBack, children }: ResponsiveNavProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar state
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(true); // Tablet sidebar state

  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  const toggleMobileMenu = () => setSidebarOpen(!sidebarOpen);
  const toggleTabletMenu = () => setTabletSidebarOpen(!tabletSidebarOpen);

  const tabs = [
    { id: 'kalkyl', label: 'Kalkyl', icon: <Calculator className="w-5 h-5" /> },
    { id: 'material', label: 'Mat', icon: <Box className="w-5 h-5" /> },
    { id: 'pdf', label: 'PDF', icon: <FileText className="w-5 h-5" /> },
    { id: 'admin', label: 'Admin', icon: <Settings className="w-5 h-5" /> }
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden text-on-surface">
      {/* Header */}
      <header className="flex-none h-12 sm:h-14 md:h-16 lg:h-16 bg-surface border-b border-outline-variant flex items-center justify-between px-4 sm:px-6 relative z-30">
        
        {/* Mobile Header Elements */}
        {isMobile && (
          <>
            <button onClick={goBack} className="p-2 -ml-2 text-on-surface-variant hover:text-on-surface active:bg-surface-variant rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-base truncate flex-1 text-center px-2">{currentPageTitle}</h1>
            <button onClick={toggleMobileMenu} className="p-2 -mr-2 text-on-surface-variant hover:text-on-surface active:bg-surface-variant rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]">
              <Menu className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Tablet/Desktop Header Elements */}
        {!isMobile && (
          <>
            <div className="flex items-center gap-6 h-full">
              <div className="flex items-center gap-3">
                <button onClick={goBack} className="p-2 -ml-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-on-primary font-bold shadow-sm">E</div>
                  <span className="font-bold tracking-tight text-lg">ESTIMO</span>
                </div>
              </div>
              
              <nav className="flex gap-1 h-full items-center">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-4 h-9 rounded-full text-sm font-medium transition-colors ${currentTab === tab.id ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="flex gap-1 items-center">
              <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </button>
              <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </button>
              {isTablet && (
                <button onClick={toggleTabletMenu} className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <Menu className="w-5 h-5" />
                </button>
              )}
            </div>
          </>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside
          className={`
            absolute md:static inset-y-0 left-0 z-40 bg-surface border-r border-outline-variant flex flex-col
            transition-all duration-300 ease-in-out
            w-64 md:w-60 lg:w-72
            ${isMobile ? (sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full') : ''}
            ${isTablet ? (tabletSidebarOpen ? 'ml-0' : '-ml-60') : ''}
            ${isDesktop ? 'translate-x-0' : ''}
          `}
        >
           {/* Mobile sidebar header */}
           {isMobile && (
              <div className="h-14 border-b border-outline-variant flex items-center justify-between px-4">
                 <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-on-primary font-bold text-xs shadow-sm">E</div>
                  <span className="font-bold tracking-tight text-sm">ESTIMO</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 -mr-2 text-on-surface-variant hover:text-on-surface min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>
           )}

          <nav className="flex-1 overflow-y-auto p-4 md:p-6 text-sm">
            <div className="mb-6">
               <h3 className="font-semibold text-base mb-1 truncate">{currentPageTitle || 'Project Name'}</h3>
               <p className="text-xs text-on-surface-variant">Project Info</p>
            </div>

            <div className="h-px bg-outline-variant my-4" />

            <div className="font-semibold mb-2 px-2 text-xs uppercase tracking-wider text-on-surface-variant">Quick Actions</div>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-variant transition-colors flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4 text-on-surface-variant" /> Dashboard
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-variant transition-colors flex items-center gap-3">
              <Settings className="w-4 h-4 text-on-surface-variant" /> Config
            </button>
            
            <div className="h-px bg-outline-variant my-4" />
            
            <div className="font-semibold mb-2 px-2 text-xs uppercase tracking-wider text-on-surface-variant">Help & Support</div>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-variant transition-colors flex items-center gap-3">
              <HelpCircle className="w-4 h-4 text-on-surface-variant" /> Documentation
            </button>
          </nav>
        </aside>

        {/* Tablet Expand Button (when sidebar is hidden) */}
        {isTablet && !tabletSidebarOpen && (
           <button 
             onClick={toggleTabletMenu}
             className="absolute left-0 top-4 z-20 bg-surface border border-l-0 border-outline-variant rounded-r-md p-2 shadow-sm text-on-surface-variant hover:text-on-surface"
           >
              <ChevronRight className="w-5 h-5" />
           </button>
        )}

        {/* Overlay for mobile sidebar */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 relative overflow-y-auto bg-surface-container-lowest ${isMobile ? 'pb-14' : ''}`}>
          {children}
        </main>
      </div>

      {/* Bottom Tab Bar (mobile only) */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-surface border-t border-outline-variant flex items-center z-40 pb-safe">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors ${isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${isActive ? 'bg-secondary-container text-on-secondary-container' : ''}`}>
                  {tab.icon}
                </div>
                <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-on-surface' : ''}`}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
