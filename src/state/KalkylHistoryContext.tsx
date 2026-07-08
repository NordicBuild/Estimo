import React, { createContext, useContext, ReactNode } from 'react';
import { Byggdel, Material, ProjectInfo, CompanyInfo, ArbetsMoment } from '../data';
import { CalculationResult } from '../useCalculation';

export interface Settings {
  fTim: number; fOrg: number; fForbr: number; fMaskin: number; fTrakt: number;
  vMatP: number; vArbP: number; trRate: number; trHours: number;
}

export interface KalkylHistoryContextType {
  byggdelHistory: Byggdel[][];
  historyIndex: number;
  undoByggdelar: () => void;
  redoByggdelar: () => void;
  // Kalkyl state (from App.tsx)
  calcResult?: CalculationResult;
  addParts?: (parts: Byggdel[]) => void;
  addPartFromTemplate?: (template: Byggdel) => void;
  toggleByggdel?: (id: number) => void;
  toggleAllByggdelar?: (collapse: boolean) => void;
  reorderByggdelar?: (startIndex: number, endIndex: number) => void;
  removePart?: (id: number) => void;
  removeMultipleParts?: (ids: number[]) => void;
  updateMultipleParts?: (ids: number[], updates: Partial<Byggdel>) => void;
  clonePart?: (id: number) => void;
  togglePartActive?: (id: number) => void;
  toggleTypeActive?: (type: string, active: boolean) => void;
  cloneType?: (type: string) => void;
  openModal?: (id: number) => void;
  updateMoment?: (partId: number, momentIndex: number, updates: Partial<ArbetsMoment>) => void;
  duplicateMoment?: (partId: number, momentIndex: number) => void;
  updateMaterialPrice?: (matId: string, newPrice: number) => void;
  addMoment?: (byggdelId: number) => void;
  removeMoment?: (partId: number, momentIndex: number) => void;
  updatePartQty?: (partId: number, newQty: number) => void;
  updatePartAntal?: (partId: number, newAntal: number) => void;
}

const KalkylHistoryContext = createContext<KalkylHistoryContextType | undefined>(undefined);

export function KalkylHistoryProvider({ children, value }: { children: ReactNode, value: KalkylHistoryContextType }) {
  return (
    <KalkylHistoryContext.Provider value={value}>
      {children}
    </KalkylHistoryContext.Provider>
  );
}

export function useKalkylHistory() {
  const context = useContext(KalkylHistoryContext);
  if (context === undefined) {
    throw new Error('useKalkylHistory must be used within a KalkylHistoryProvider');
  }
  return context;
}

