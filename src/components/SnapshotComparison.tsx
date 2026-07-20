import React, { useMemo } from 'react';
import { ProjectVersion, Byggdel, Material, Tidsfaktor } from '../data';
import { computeCalculation } from '../useCalculation';

interface SnapshotComparisonProps {
  snapA: ProjectVersion;
  snapB: ProjectVersion;
  materials: Material[];
  settings: any;
  companyTidsfaktorer: Record<string, number>;
  onClose: () => void;
}

export function SnapshotComparison({ snapA, snapB, materials, settings, companyTidsfaktorer, onClose }: SnapshotComparisonProps) {
  const calcA = useMemo(() => computeCalculation(
    snapA.byggdelar, materials, settings.fOrg, settings.fForbr, settings.tRate, settings.mRate, settings.trRate, settings.vMatP, settings.vArbP, settings.timeFactor, companyTidsfaktorer
  ), [snapA, materials, settings, companyTidsfaktorer]);

  const calcB = useMemo(() => computeCalculation(
    snapB.byggdelar, materials, settings.fOrg, settings.fForbr, settings.tRate, settings.mRate, settings.trRate, settings.vMatP, settings.vArbP, settings.timeFactor, companyTidsfaktorer
  ), [snapB, materials, settings, companyTidsfaktorer]);

  const diffMat = calcB.totMat - calcA.totMat;
  const diffArb = calcB.totArb - calcA.totArb;
  const diffTot = calcB.projNetto - calcA.projNetto;

  const formatDiff = (diff: number) => {
    const sign = diff > 0 ? '+' : '';
    const colorClass = diff > 0 ? 'text-error' : diff < 0 ? 'text-green-600' : 'text-on-surface-variant';
    return <span className={`font-bold ${colorClass}`}>{sign}{Math.round(diff).toLocaleString('sv-SE')} kr</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <h3 className="font-bold text-lg text-on-surface">Jämförelse: {snapA.name} vs {snapB.name}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border border-outline-variant rounded-lg bg-surface-container-lowest shadow-sm">
              <h4 className="text-sm font-bold text-on-surface-variant mb-4 border-b border-outline-variant pb-2">Materialkostnad</h4>
              <div className="flex justify-between text-sm mb-1">
                <span>{snapA.name}:</span>
                <span className="font-semibold">{Math.round(calcA.totMat).toLocaleString('sv-SE')} kr</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>{snapB.name}:</span>
                <span className="font-semibold">{Math.round(calcB.totMat).toLocaleString('sv-SE')} kr</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-outline-variant/50">
                <span>Skillnad:</span>
                {formatDiff(diffMat)}
              </div>
            </div>
            
            <div className="p-4 border border-outline-variant rounded-lg bg-surface-container-lowest shadow-sm">
              <h4 className="text-sm font-bold text-on-surface-variant mb-4 border-b border-outline-variant pb-2">Arbetskostnad</h4>
              <div className="flex justify-between text-sm mb-1">
                <span>{snapA.name}:</span>
                <span className="font-semibold">{Math.round(calcA.totArb).toLocaleString('sv-SE')} kr</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>{snapB.name}:</span>
                <span className="font-semibold">{Math.round(calcB.totArb).toLocaleString('sv-SE')} kr</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-outline-variant/50">
                <span>Skillnad:</span>
                {formatDiff(diffArb)}
              </div>
            </div>

            <div className="p-4 border border-primary/30 rounded-lg bg-primary/5 shadow-sm">
              <h4 className="text-sm font-bold text-primary mb-4 border-b border-primary/20 pb-2">Totalt (Netto)</h4>
              <div className="flex justify-between text-sm mb-1 text-on-surface">
                <span>{snapA.name}:</span>
                <span className="font-semibold">{Math.round(calcA.projNetto).toLocaleString('sv-SE')} kr</span>
              </div>
              <div className="flex justify-between text-sm mb-2 text-on-surface">
                <span>{snapB.name}:</span>
                <span className="font-semibold">{Math.round(calcB.projNetto).toLocaleString('sv-SE')} kr</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-primary/20">
                <span className="font-bold">Skillnad:</span>
                {formatDiff(diffTot)}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="text-md font-bold text-on-surface mb-3">Detaljerad Förändring</h4>
            <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-lowest border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-2 font-bold text-on-surface-variant">Metrik</th>
                    <th className="px-4 py-2 font-bold text-on-surface-variant">{snapA.name}</th>
                    <th className="px-4 py-2 font-bold text-on-surface-variant">{snapB.name}</th>
                    <th className="px-4 py-2 font-bold text-on-surface-variant">Skillnad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  <tr>
                    <td className="px-4 py-2">Antal Byggdelar</td>
                    <td className="px-4 py-2">{snapA.byggdelar.length}</td>
                    <td className="px-4 py-2">{snapB.byggdelar.length}</td>
                    <td className="px-4 py-2 font-bold">{snapB.byggdelar.length - snapA.byggdelar.length > 0 ? '+' : ''}{snapB.byggdelar.length - snapA.byggdelar.length}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Total Arbetstid (tim)</td>
                    <td className="px-4 py-2">{Math.round(calcA.totTim)} h</td>
                    <td className="px-4 py-2">{Math.round(calcB.totTim)} h</td>
                    <td className="px-4 py-2 font-bold">{snapB.byggdelar.length > 0 ? Math.round(calcB.totTim - calcA.totTim) + ' h' : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-bold text-on-primary bg-primary hover:opacity-90 transition-colors shadow-sm"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
