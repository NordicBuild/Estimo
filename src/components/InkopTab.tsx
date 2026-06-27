import React, { useState } from 'react';
import { Byggdel } from '../data';
import { CalculationResult } from '../useCalculation';
import { Anbudsjamforelse } from '../anbud/components/Anbudsjamforelse';
import { ReferensPost, NyOffertModal } from '../anbud/components/NyOffertModal';
import { ImportOffertModal } from '../anbud/components/ImportOffertModal';
import { saveOffert, DbOffert } from '../anbud/api';

interface Props {
  projectId: string;
  byggdelar: Byggdel[];
  calcResult: CalculationResult;
  companyId: string;
  onApplyOffert?: (priserPerKey: Record<string, number>) => void;
}

export function InkopTab({ projectId, byggdelar, calcResult, companyId, onApplyOffert }: Props) {
  const [showNyModal, setShowNyModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const activeByggdelar = byggdelar.filter(b => b.active !== false);
  
  const referensLista: ReferensPost[] = activeByggdelar.map(b => {
    const partCalc = calcResult.parts.find(p => p.id === b.id);
    return {
      key: b.id.toString(),
      benamning: b.name,
      mangd: b.qty || 1,
      enhet: partCalc?.unit || 'st',
      kalkylAPris: partCalc ? (partCalc.costNetto / (b.qty || 1)) : 0
    };
  });

  const handleSaveOffert = async (offertData: Partial<DbOffert>) => {
    const fullOffert: DbOffert = {
      id: crypto.randomUUID(),
      company_id: companyId,
      project_id: projectId,
      anbud_id: null,
      leverantor: offertData.leverantor || '',
      typ: offertData.typ || 'leverantor',
      valuta: offertData.valuta || 'SEK',
      status: offertData.status || 'inkommen',
      poster: offertData.poster || {},
      fast_tillagg: offertData.fast_tillagg || 0,
      giltig_till: offertData.giltig_till || null,
      not: offertData.not || null,
    };
    await saveOffert(fullOffert);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Inköp & Anbudsjämförelse</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowImportModal(true)} className="btn btn-secondary bg-white">
            <i className="fa-solid fa-file-excel mr-2 text-green-600"></i> Importera offert (Excel)
          </button>
          <button onClick={() => setShowNyModal(true)} className="btn btn-primary">
            <i className="fa-solid fa-plus mr-2"></i> Ny offert manuellt
          </button>
        </div>
      </div>
      
      <Anbudsjamforelse key={refreshKey} projectId={projectId} referensLista={referensLista} onApplyOffert={onApplyOffert} />
      
      {showNyModal && (
        <NyOffertModal 
          isOpen={showNyModal} 
          onClose={() => setShowNyModal(false)} 
          onSave={handleSaveOffert} 
          referensLista={referensLista} 
        />
      )}
      
      {showImportModal && (
        <ImportOffertModal 
          isOpen={showImportModal} 
          onClose={() => setShowImportModal(false)} 
          onSave={handleSaveOffert} 
          referensLista={referensLista} 
        />
      )}
    </div>
  );
}
