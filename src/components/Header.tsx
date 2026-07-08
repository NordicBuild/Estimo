import React from 'react';
import { User } from '@supabase/supabase-js';

export function formatKr(val: number): string {
  return Math.round(val).toLocaleString('sv-SE') + ' kr';
}

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (val: any) => void;
  user: User | null;
  handleLogout: () => void;
  loginWithGoogle: () => void;
  calcResult: any;
}

export function Header({
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  user,
  handleLogout,
  loginWithGoogle,
  calcResult
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-surface flex justify-between items-center w-full px-4 md:px-10 h-16 border-b border-outline-variant print:hidden">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 hover:bg-surface-container-low rounded-lg transition-colors" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span className="material-symbols-outlined text-primary">menu</span>
        </button>
        <h1 className="text-[20px] md:text-headline-md font-headline-md font-bold text-primary">Estimo</h1>
        <div className="hidden md:flex ml-8 gap-6">
            <span className="text-on-surface-variant text-[11px] font-bold tracking-wider uppercase flex items-center">
              SYSTEM V2
            </span>
            <span className="text-status-success text-[11px] font-bold tracking-wider flex items-center gap-1 uppercase">
              <span className="w-2 h-2 rounded-full bg-status-success"></span> CLOUD SYNC ACTIVE
            </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
            <div className="flex items-center gap-4">
              <span className="text-xs text-on-surface-variant hidden lg:inline-block font-medium">{user.email}</span>
              <button className="hidden md:flex items-center gap-1 text-on-surface hover:text-primary transition-colors text-xs font-semibold px-2" onClick={handleLogout} title="Logga ut">
                <span className="material-symbols-outlined text-[18px]">logout</span> Logga ut
              </button>
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold overflow-hidden border border-outline-variant uppercase">
                {user.email?.substring(0,2) || 'US'}
              </div>
            </div>
        ) : (
            <button className="bg-primary text-on-primary py-1.5 rounded-lg hover:opacity-90 transition-opacity text-xs font-bold px-4 flex items-center gap-1" onClick={loginWithGoogle} title="Logga in för molnsynk">
              <span className="material-symbols-outlined text-[18px]">login</span> Logga in
            </button>
        )}
      </div>
    </header>
  );
}
