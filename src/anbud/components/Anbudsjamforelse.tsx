import React, { useState, useEffect, useMemo } from 'react';
import { ReferensPost } from './NyOffertModal';
import { DbOffert, listOfferter, setStatus, deleteOffert } from '../api';
import { byggJamforelse, geRekommendation, kopVsEgenRegi, Offert, ReferensRad, kalkylTotal, offertPriserPerKey } from '../anbudJamforelse';

interface Props {
  projectId: string;
  referensLista: ReferensPost[];
  onApplyOffert?: (priserPerKey: Record<string, number>) => void;
}

export function Anbudsjamforelse({ projectId, referensLista, onApplyOffert }: Props) {
  const [offerter, setOfferter] = useState<DbOffert[]>([]);
  const [loading, setLoading] = useState(true);
  const [troskel, setTroskel] = useState(0.15);

  const fetchOfferter = async () => {
    setLoading(true);
    try {
      const data = await listOfferter(projectId);
      setOfferter(data);
    } catch (err) {
      // warning removed
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferter();
  }, [projectId]);

  const handleDelete = async (id: string) => {
    if (confirm('Vill du verkligen ta bort denna offert?')) {
      await deleteOffert(id);
      fetchOfferter();
    }
  };

  const formatKr = (val: number) => Math.round(val).toLocaleString('sv-SE') + ' kr';

  const referensRader: ReferensRad[] = referensLista.map(r => ({
    id: r.key,
    mangd: r.mangd,
    kalkylAPris: r.kalkylAPris,
  }));

  const calcKalkylTotal = kalkylTotal(referensRader);

  // Filter out 'förkastad'
  const aktivaOfferter = offerter.filter(o => o.status !== 'förkastad');
  
  const mappedOfferter: Offert[] = aktivaOfferter.map(o => ({
    id: o.id,
    namn: o.leverantor,
    rader: Object.entries(o.poster || {}).map(([key, aPris]) => ({ id: key, aPris: Number(aPris) })),
  }));

  const jamforelse = useMemo(() => {
    return byggJamforelse(referensRader, mappedOfferter, troskel);
  }, [referensRader, mappedOfferter, troskel]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === 'antagen') {
      const jmf = jamforelse.find(j => j.id === id);
      if (jmf && onApplyOffert) {
        const priser = offertPriserPerKey(jmf);
        const count = Object.keys(priser).length;
        const diff = jmf.utjamnadTotal - calcKalkylTotal;
        const confirmMsg = `Du håller på att anta denna offert.\n${count} byggdelar kommer att uppdateras med leverantörens priser.\nSkillnad mot kalkyl: ${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString('sv-SE')} kr.\n\nVill du fortsätta?`;
        
        if (!confirm(confirmMsg)) return;

        // Auto-reject other active offers?
        const dbOffert = offerter.find(o => o.id === id);
        if (dbOffert) {
          const others = offerter.filter(o => o.id !== id && o.status !== 'förkastad' && o.status !== 'antagen' && o.typ === dbOffert.typ);
          for (const o of others) {
            await setStatus(o.id, 'förkastad');
          }
        }
        
        onApplyOffert(priser);
      }
    }
    
    await setStatus(id, newStatus);
    fetchOfferter();
  };

  const rekommendation = useMemo(() => {
    return geRekommendation(jamforelse);
  }, [jamforelse]);

  const kopDecision = jamforelse.length > 0 && rekommendation.rekommenderadOffertId
    ? kopVsEgenRegi(
        jamforelse.find(j => j.id === rekommendation.rekommenderadOffertId)!.utjamnadTotal,
        calcKalkylTotal,
        0
      )
    : 'egen_regi';

  const vinnare = jamforelse.find(j => j.id === rekommendation.rekommenderadOffertId);
  const tvaa = [...jamforelse].sort((a, b) => a.utjamnadTotal - b.utjamnadTotal)[1];
  const vinnarDiffKalkyl = vinnare ? calcKalkylTotal - vinnare.utjamnadTotal : 0;
  
  if (loading) {
    return <div className="p-4 text-center text-gray-500">Laddar offerter...</div>;
  }

  if (offerter.length === 0) {
    return <div className="p-4 text-center text-gray-500 italic">Inga offerter inlagda för jämförelse.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 bg-white p-4 rounded shadow-sm border">
        <label className="text-sm font-semibold whitespace-nowrap">Tröskelvärde cellflaggning: {(troskel * 100).toFixed(0)}%</label>
        <input 
          type="range" 
          min="0.05" max="0.50" step="0.05" 
          value={troskel} 
          onChange={e => setTroskel(parseFloat(e.target.value))} 
          className="flex-1 max-w-[200px]"
        />
        <div className="text-xs text-gray-500">Styr när avvikelser från medianen flaggas som högt (rött) eller lågt (grönt).</div>
      </div>

      {vinnare && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded shadow-sm border ${rekommendation.anledning === 'misstankt_lagt' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <i className="fa-solid fa-trophy"></i> Rekommendation: {vinnare.namn}
            </h3>
            <p className="text-sm mb-2">
              Utjämnad total: <strong className="font-mono">{formatKr(vinnare.utjamnadTotal)}</strong>
            </p>
            {rekommendation.anledning === 'misstankt_lagt' ? (
              <p className="text-xs text-orange-700 font-semibold bg-orange-100 p-2 rounded">
                <i className="fa-solid fa-triangle-exclamation mr-1"></i> Ovanligt lågt, granska omfattningen innan tilldelning.
              </p>
            ) : (
              <p className="text-xs text-green-700 font-semibold bg-green-100 p-2 rounded">
                <i className="fa-solid fa-check mr-1"></i> Bästa pris med hög konfidens.
              </p>
            )}
            {tvaa && (
              <p className="text-xs text-gray-600 mt-2">
                Näst bäst: {tvaa.namn} ({formatKr(tvaa.utjamnadTotal)}) — Gap: {formatKr(tvaa.utjamnadTotal - vinnare.utjamnadTotal)}
              </p>
            )}
          </div>
          
          <div className="p-4 rounded shadow-sm border bg-blue-50 border-blue-200">
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <i className="fa-solid fa-scale-balanced"></i> Köp vs Egen regi
            </h3>
            <p className="text-sm mb-2">
              Kalkyl total (egen regi): <strong className="font-mono">{formatKr(calcKalkylTotal)}</strong>
            </p>
            <div className="mt-2 text-sm font-semibold">
              {kopDecision === 'kop' ? (
                <span className="text-green-700">Köp rekommenderas (Sparar {formatKr(vinnarDiffKalkyl)})</span>
              ) : vinnarDiffKalkyl === 0 ? (
                <span className="text-gray-700">Jämnt skägg (Ingen ekonomisk fördel)</span>
              ) : (
                <span className="text-red-700">Egen regi rekommenderas (Köp är {formatKr(Math.abs(vinnarDiffKalkyl))} dyrare)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {jamforelse.length > 0 ? (
        <div className="bg-white rounded shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 font-semibold border-b border-gray-200 sticky left-0 bg-gray-100 z-20">Benämning</th>
                  <th className="p-3 font-semibold border-b border-gray-200 text-right">Mängd</th>
                  <th className="p-3 font-semibold border-b border-gray-200 text-right text-blue-800 bg-blue-50">Kalkyl</th>
                  <th className="p-3 font-semibold border-b border-gray-200 text-right bg-gray-50 border-r border-gray-200">Median</th>
                  {jamforelse.map(jmf => {
                    const dbOffert = offerter.find(o => o.id === jmf.id);
                    return (
                      <th key={jmf.id} className="p-3 font-semibold border-b border-gray-200 text-right min-w-[120px]">
                        <div className="flex flex-col items-end gap-1">
                          <span>{jmf.namn}</span>
                          <select 
                            value={dbOffert?.status || 'inkommen'}
                            onChange={e => handleStatusChange(jmf.id, e.target.value)}
                            className="text-xs p-1 border rounded font-normal bg-white"
                          >
                            <option value="inkommen">Inkommen</option>
                            <option value="antagen">Antagen</option>
                            <option value="förkastad">Förkastad</option>
                          </select>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referensLista.map(ref => {
                  let radMedian = 0;
                  if (jamforelse.length > 0) {
                    const cell = jamforelse[0].celler[ref.key];
                    if (cell?.imputerad) {
                      radMedian = cell.effektivtAPris;
                    } else {
                      // Median is stored implicitly or we recalculate.
                      // Let's just find median from celler in jamforelse that are NOT imputed.
                      const prices = jamforelse.map(j => j.celler[ref.key]).filter(c => !c.imputerad).map(c => c.aPris);
                      const sorted = [...prices].sort((a,b) => a-b);
                      if (sorted.length > 0) {
                        const mid = Math.floor(sorted.length / 2);
                        radMedian = sorted.length % 2 === 0 ? (sorted[mid-1] + sorted[mid])/2 : sorted[mid];
                      }
                    }
                  }

                  return (
                    <tr key={ref.key} className="hover:bg-gray-50 group">
                      <td className="p-3 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-gray-50 truncate max-w-[200px]" title={ref.benamning}>
                        {ref.benamning}
                      </td>
                      <td className="p-3 num text-gray-600">{ref.mangd} {ref.enhet}</td>
                      <td className="p-3 num text-blue-700 bg-blue-50/30">{ref.kalkylAPris.toFixed(2)}</td>
                      <td className="p-3 num text-gray-500 border-r border-gray-100 bg-gray-50/50">{radMedian.toFixed(2)}</td>
                      
                      {jamforelse.map(jmf => {
                        const cell = jmf.celler[ref.key];
                        let bgClass = '';
                        let textClass = 'text-gray-900';
                        if (cell.klassificering === 'hog') {
                          bgClass = 'bg-red-50';
                          textClass = 'text-red-700 font-medium';
                        } else if (cell.klassificering === 'lag') {
                          bgClass = 'bg-green-50';
                          textClass = 'text-green-700 font-medium';
                        }
                        
                        if (cell.imputerad) {
                          bgClass = 'bg-gray-50 opacity-60';
                          textClass = 'text-gray-500 italic';
                        }

                        return (
                          <td key={jmf.id} className={`p-3 num text-right relative ${bgClass} ${textClass}`} title={`À-pris: ${cell.aPris}, Totalt: ${cell.total}`}>
                            {cell.effektivtAPris.toFixed(2)}
                            {cell.imputerad && <span className="absolute top-1 left-1 text-[8px] uppercase font-bold text-gray-400">Imp</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 sticky bottom-0 shadow-[0_-2px_4px_rgba(0,0,0,0.05)] z-10 font-medium">
                <tr>
                  <td className="p-3 sticky left-0 bg-gray-100 z-20 font-bold border-t border-gray-300">SUMMERA (exkl. moms)</td>
                  <td className="p-3 border-t border-gray-300"></td>
                  <td className="p-3 num text-blue-800 border-t border-gray-300">{formatKr(calcKalkylTotal)}</td>
                  <td className="p-3 border-t border-gray-300 border-r border-gray-200"></td>
                  {jamforelse.map(jmf => {
                    const countPriced = Object.values(jmf.celler).filter(c => !c.imputerad).length;
                    const diffPct = calcKalkylTotal > 0 ? ((jmf.utjamnadTotal - calcKalkylTotal) / calcKalkylTotal * 100) : 0;
                    const diffColor = diffPct > 0 ? 'text-red-600' : 'text-green-600';
                    return (
                      <td key={jmf.id} className="p-3 border-t border-gray-300 text-right align-top">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs text-gray-500" title="Rå total">Rå: {formatKr(jmf.raTotal)}</div>
                          <div className="font-bold font-mono text-[var(--blue-dk)] bg-yellow-100 rounded px-1" title="Utjämnad total (jämförelsetal)">
                            {formatKr(jmf.utjamnadTotal)}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">{countPriced} / {referensLista.length} prissatta</div>
                          <div className={`text-[10px] font-bold ${diffColor}`}>
                            {diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}% mot kalkyl
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500 italic bg-gray-50 rounded border">
          De inlagda offerterna är markerade som förkastade.
        </div>
      )}

      {offerter.filter(o => o.status === 'förkastad').length > 0 && (
        <div className="mt-4 border-t pt-4">
          <h4 className="font-bold text-gray-600 mb-2">Förkastade offerter</h4>
          <ul className="text-sm text-gray-500 space-y-2">
            {offerter.filter(o => o.status === 'förkastad').map(o => (
              <li key={o.id} className="flex items-center gap-4">
                <span className="line-through">{o.leverantor}</span>
                <select 
                  value={o.status}
                  onChange={e => handleStatusChange(o.id, e.target.value)}
                  className="text-xs p-1 border rounded"
                >
                  <option value="inkommen">Återställ till inkommen</option>
                  <option value="förkastad">Förkastad</option>
                </select>
                <button onClick={() => handleDelete(o.id)} className="text-red-500 hover:text-red-700 text-xs">
                  <i className="fa-solid fa-trash"></i> Ta bort
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
