import React, { useState, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Search, Settings, HelpCircle, User, Menu } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  path?: string;
}

interface ResponsiveHeaderProps {
  currentPageTitle: string;
  goBack: () => void;
  navItems?: NavItem[];
  currentTab?: string;
  onTabChange?: (tabId: string) => void;
}

export function ResponsiveHeader({ 
  currentPageTitle, 
  goBack, 
  navItems = [],
  currentTab,
  onTabChange
}: ResponsiveHeaderProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

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

  return (
    <header className="h-12 sm:h-14 lg:h-16 bg-surface border-b border-outline-variant sticky top-0 z-40 text-on-surface">
      <div className="h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Back button (mobile) or Logo (tablet+) */}
        <div className="flex items-center gap-3 w-1/4">
          {isMobile && (
            <button 
              onClick={goBack} 
              className="p-2 -ml-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant active:bg-surface-variant rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {!isMobile && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-on-primary font-bold shadow-sm">E</div>
              <span className="font-bold tracking-tight text-lg hidden sm:block">ESTIMO</span>
            </div>
          )}
        </div>

        {/* Center: Title (mobile) or Navigation (tablet+) */}
        <div className="flex-1 text-center flex justify-center items-center">
          {isMobile && (
            <h1 className="text-base font-bold truncate px-2">{currentPageTitle}</h1>
          )}
          {isTablet && (
            <h1 className="text-sm sm:text-base font-bold truncate px-4">{currentPageTitle}</h1>
          )}
          {isDesktop && navItems.length > 0 && (
            <nav className="flex gap-1 justify-center w-full">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`px-4 h-9 rounded-full text-sm font-medium transition-colors ${currentTab === item.id ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Right: Action buttons (adaptive) */}
        <div className="flex items-center justify-end gap-1 sm:gap-2 w-1/4">
          {/* Mobile: Search + Menu */}
          {isMobile && (
            <>
              <button className="p-2 text-on-surface-variant hover:text-on-surface active:bg-surface-variant rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]" aria-label="Search">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 -mr-2 text-on-surface-variant hover:text-on-surface active:bg-surface-variant rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]" aria-label="More options">
                <MoreVertical className="w-5 h-5" />
              </button>
            </>
          )}
          
          {/* Tablet: Search + Settings + Help */}
          {isTablet && (
            <>
              <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]" aria-label="Search">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]" aria-label="Settings">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 -mr-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]" aria-label="Help">
                <HelpCircle className="w-5 h-5" />
              </button>
            </>
          )}
          
          {/* Desktop: Full action bar */}
          {isDesktop && (
            <>
              <div className="relative hidden xl:block mr-2 w-48 lg:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-on-surface-variant" />
                </div>
                <input
                  type="text"
                  placeholder="Sök..."
                  className="block w-full pl-10 pr-3 py-1.5 border border-outline-variant rounded-full leading-5 bg-surface-container-highest placeholder-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors text-on-surface"
                />
              </div>
              <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]" aria-label="Help">
                <HelpCircle className="w-5 h-5" />
              </button>
              <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]" aria-label="Settings">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]" aria-label="User Menu">
                <User className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
