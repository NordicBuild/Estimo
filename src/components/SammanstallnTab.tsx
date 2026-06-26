import React, { useState, useRef } from 'react';
import { CalculationResult } from '../useCalculation';
import { Material, ProjectInfo, CompanyInfo } from '../data';
import html2pdf from 'html2pdf.js';

interface Props {
  calcResult: CalculationResult;
  materials: Material[];
  updateMaterial: (index: number, updates: Partial<Material>) => void;
  projectInfo: ProjectInfo;
  setProjectInfo?: React.Dispatch<React.SetStateAction<ProjectInfo>>;
  companyInfo: CompanyInfo;
}

export function SammanstallnTab({ calcResult, materials, updateMaterial, projectInfo, setProjectInfo, companyInfo }: Props) {
  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';
  const formatN = (v: number) => v.toLocaleString('sv-SE', { maximumFractionDigits: 1 });
  const [editingPrice, setEditingPrice] = useState<{name: string, price: number} | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = () => {
    if (!pdfRef.current) return;
    const element = pdfRef.current;
    const opt = {
      margin:       10,
      filename:     `Sammanstallning_${projectInfo.nr || 'projekt'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handlePriceSave = (materialName: string) => {
    if (!editingPrice || editingPrice.name !== materialName) return;
    const mIndex = materials.findIndex(m => m.name === materialName);
    if (mIndex !== -1) {
      updateMaterial(mIndex, { price: editingPrice.price });
    }
    setEditingPrice(null);
  };


  return (
    <div className="container relative">
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExportPDF}
          className="bg-[var(--blue)] hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span> Exportera som PDF
        </button>
      </div>

      <div ref={pdfRef} className="bg-white p-6 rounded-lg">
        {/* PDF Header - Only visible when generating PDF or can be stylized directly */}
        <div className="mb-6 pb-4 border-b border-gray-200 hidden print:block" style={{ display: 'none' /* Will show properly in PDF if handled or we can just always show a clean header */ }}>
           {/* Let's just create a nice header that looks good on screen too */}
        </div>
        
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Sammanställning</h1>
            <p className="text-gray-500 font-medium">Projekt: {projectInfo.name || 'Namnlöst projekt'}</p>
            {projectInfo.nr && <p className="text-sm text-gray-500">Projektnr: {projectInfo.nr}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-700">{companyInfo.name || 'Företagsnamn saknas'}</h2>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('sv-SE')}</p>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5 mt-4">
        <div className="card p-5 border-l-4 border-l-[var(--blue)]">
          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Total Entreprenadkostnad</div>
          <div className="text-2xl font-mono font-bold text-[var(--text)]">{formatKr(calcResult.projNetto)}</div>
          <div className="text-xs text-[var(--text2)] mt-2 flex justify-between">
            <span>Material: {formatKr(calcResult.totMat)}</span>
            <span>Arbete: {formatKr(calcResult.totArb)}</span>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-[var(--purple)]">
          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Beräknad Vinst / Risk</div>
          <div className="text-2xl font-mono font-bold text-[var(--purple)]">{formatKr(calcResult.vTot)}</div>
          <div className="text-xs text-[var(--text2)] mt-2 flex justify-between">
            <span>TG1: {formatN(calcResult.tg1)}%</span>
            <span>TB1: {formatKr(calcResult.tb1)}</span>
          </div>
        </div>
        <div className="card p-5 bg-gradient-to-br from-[var(--blue)] to-[var(--blue-dk)] text-white shadow-[0_8px_16px_var(--blue-glow)] border-none">
          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-blue-200 mb-1">Offertsumma (Anbud)</div>
          <div className="text-2xl font-mono font-bold">{formatKr(calcResult.anbud)}</div>
          <div className="text-xs text-blue-100 mt-2 flex justify-between">
            <span>Exklusive moms</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="card flex flex-col">
          <div className="card-header border-b border-[var(--border)]">
            <div className="card-icon blue"><i className="fa-solid fa-chart-pie"></i></div>
            <span className="card-title text-sm font-bold uppercase tracking-wider text-[var(--text2)]">Kostnadsfördelning</span>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            {calcResult.projNetto > 0 ? (
              <>
                <div className="flex w-full h-8 rounded-lg overflow-hidden mb-8 shadow-sm">
                  <div style={{ width: `${(calcResult.totMat / calcResult.projNetto) * 100}%` }} className="bg-blue-500 hover:bg-blue-600 transition-colors" title={`Material: ${Math.round((calcResult.totMat / calcResult.projNetto) * 100)}%`}></div>
                  <div style={{ width: `${(calcResult.totArb / calcResult.projNetto) * 100}%` }} className="bg-indigo-500 hover:bg-indigo-600 transition-colors" title={`Arbete: ${Math.round((calcResult.totArb / calcResult.projNetto) * 100)}%`}></div>
                  <div style={{ width: `${(calcResult.omkTot / calcResult.projNetto) * 100}%` }} className="bg-amber-500 hover:bg-amber-600 transition-colors" title={`Omkostnader: ${Math.round((calcResult.omkTot / calcResult.projNetto) * 100)}%`}></div>
                </div>
                
                <div className="space-y-4 font-medium">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded bg-blue-500 shadow-sm"></div> <span className="text-[var(--text2)] font-semibold">Direkta Materialkostnader</span></div>
                    <div className="font-mono font-bold">{formatKr(calcResult.totMat)}</div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded bg-indigo-500 shadow-sm"></div> <span className="text-[var(--text2)] font-semibold">Direkta Arbetskostnader</span></div>
                    <div className="font-mono font-bold">{formatKr(calcResult.totArb)}</div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded bg-amber-500 shadow-sm"></div> <span className="text-[var(--text2)] font-semibold">Gemensamma Omkostnader</span></div>
                    <div className="font-mono font-bold">{formatKr(calcResult.omkTot)}</div>
                  </div>
                  <div className="pt-4 mt-4 border-t-2 border-[var(--border)] flex justify-between items-center bg-[var(--surface2)] px-4 py-3 rounded-lg shadow-sm">
                    <div className="font-bold text-[var(--text)] uppercase tracking-wider text-xs">Netto Produktionskostnad</div>
                    <div className="font-mono font-bold text-lg text-[var(--blue)]">{formatKr(calcResult.projNetto)}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-[var(--text3)] italic py-8 border border-dashed border-[var(--border)] rounded-lg">Kalkylen saknar kostnader för att visa fördelning.</div>
            )}
          </div>
        </div>

        <div className="card flex flex-col">
          <div className="card-header border-b border-[var(--border)]">
            <div className="card-icon amber"><i className="fa-solid fa-list-check"></i></div>
            <span className="card-title text-sm font-bold uppercase tracking-wider text-[var(--text2)]">Nyckeltal</span>
          </div>
          <div className="p-6 flex-1">
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="bg-white rounded-lg p-4 flex flex-col justify-center items-center text-center shadow-sm border border-[var(--border)] transition-transform hover:-translate-y-1">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-2 shadow-sm"><i className="fa-regular fa-clock"></i></div>
                <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Arbetstimmar</div>
                <div className="text-xl font-mono font-bold text-[var(--text)]">{formatN(calcResult.totTim)} h</div>
              </div>
              <div className="bg-white rounded-lg p-4 flex flex-col justify-center items-center text-center shadow-sm border border-[var(--border)] transition-transform hover:-translate-y-1">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-2 shadow-sm"><i className="fa-solid fa-cubes"></i></div>
                <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Total Volym</div>
                <div className="text-xl font-mono font-bold text-[var(--text)]">{formatN(calcResult.totVol)} m³</div>
              </div>
              <div className="bg-white rounded-lg p-4 flex flex-col justify-center items-center text-center shadow-sm border border-[var(--border)] transition-transform hover:-translate-y-1">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-2 shadow-sm"><i className="fa-solid fa-money-bill-trend-up"></i></div>
                <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Snittpris per m³</div>
                <div className="text-xl font-mono font-bold text-[var(--text)]">{calcResult.totVol > 0 ? formatKr(calcResult.anbud / calcResult.totVol) : '0 kr'}</div>
              </div>
              <div className="bg-white rounded-lg p-4 flex flex-col justify-center items-center text-center shadow-sm border border-[var(--border)] transition-transform hover:-translate-y-1">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-2 shadow-sm"><i className="fa-solid fa-scale-balanced"></i></div>
                <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Material / Arbete</div>
                <div className="text-xl font-mono font-bold text-[var(--text)]">
                   {calcResult.projNetto > 0 ? Math.round((calcResult.totMat / calcResult.projNetto) * 100) : 0}% / {calcResult.projNetto > 0 ? Math.round((calcResult.totArb / calcResult.projNetto) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="card flex flex-col">
          <div className="card-header border-b border-[var(--border)]">
            <div className="card-icon green"><i className="fa-solid fa-leaf"></i></div>
            <span className="card-title text-sm font-bold uppercase tracking-wider text-[var(--text2)]">Klimatpåverkan (A1-A5)</span>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            {calcResult.co2.total > 0 ? (
              <>
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Total CO2e</div>
                    <div className="text-2xl font-mono font-bold text-green-700">{formatN(calcResult.co2.total)} kg</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">per m² BTA</div>
                    <div className="flex items-center gap-2 justify-end">
                      {projectInfo.bta && projectInfo.bta > 0 ? (
                        <div className="text-xl font-mono font-bold text-green-600">{formatN(calcResult.co2.total / projectInfo.bta)} kg</div>
                      ) : (
                        <div className="text-sm italic text-gray-500">Ange BTA</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4" data-html2canvas-ignore>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs font-semibold text-[var(--text2)]">BTA (m²):</label>
                    <input 
                      type="number" 
                      className="border border-[var(--border)] rounded px-2 py-1 text-sm w-24 focus:border-[var(--blue)] outline-none" 
                      value={projectInfo.bta || ''}
                      onChange={(e) => {
                        if (setProjectInfo) {
                          setProjectInfo(prev => ({ ...prev, bta: parseFloat(e.target.value) || undefined }));
                        }
                      }}
                      placeholder="t.ex. 150"
                    />
                  </div>
                </div>

                {calcResult.co2Missing.length > 0 && (
                  <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded mb-4 text-sm">
                    <div className="flex items-start gap-2">
                      <i className="fa-solid fa-triangle-exclamation text-orange-500 mt-0.5"></i>
                      <div>
                        <span className="font-semibold text-orange-800">{calcResult.co2Missing.length} material saknar klimatdata</span>
                        <p className="text-orange-700 text-xs mt-1">
                          Totalen kan vara underskattad. Saknas för: {calcResult.co2Missing.slice(0, 3).join(', ')}
                          {calcResult.co2Missing.length > 3 ? ` och ${calcResult.co2Missing.length - 3} till.` : '.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-[var(--text3)] italic py-8 border border-dashed border-[var(--border)] rounded-lg">
                Ingen klimatdata beräknad. Fyll i CO2-faktorer på materialen.
              </div>
            )}
          </div>
        </div>

        <div className="card flex flex-col">
          <div className="card-header border-b border-[var(--border)]">
            <div className="card-icon green"><i className="fa-solid fa-chart-bar"></i></div>
            <span className="card-title text-sm font-bold uppercase tracking-wider text-[var(--text2)]">Största utsläppskällor</span>
          </div>
          <div className="p-6 flex-1 overflow-auto">
            {calcResult.co2.total > 0 ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-3">Topp 5 Material</h4>
                  <div className="space-y-3">
                    {Object.entries(calcResult.co2.byMaterial)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([name, val], idx) => {
                        const pct = (val / calcResult.co2.total) * 100;
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-[var(--text)] truncate mr-2">{name}</span>
                              <span className="font-mono text-[var(--text2)]">{formatN(val)} kg ({Math.round(pct)}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <h4 className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-3">Per Kategori</h4>
                  <div className="space-y-3">
                    {Object.entries(calcResult.co2.byCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, val], idx) => {
                        const pct = (val / calcResult.co2.total) * 100;
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-[var(--text)] truncate mr-2">{name}</span>
                              <span className="font-mono text-[var(--text2)]">{formatN(val)} kg ({Math.round(pct)}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-[var(--text3)] italic py-8 border border-dashed border-[var(--border)] rounded-lg">
                Ingen data.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card mb-5">
        <div className="card-header">
          <div className="card-icon indigo"><i className="fa-solid fa-boxes-stacked"></i></div>
          <span className="card-title">Använt Material</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--surface2)] text-[var(--text2)] border-y border-[var(--border)]">
              <tr>
                <th className="p-3 font-semibold uppercase tracking-wider text-[0.7rem]">Material</th>
                <th className="p-3 font-semibold uppercase tracking-wider text-[0.7rem]">Kategori</th>
                <th className="p-3 font-semibold uppercase tracking-wider text-[0.7rem] num">Mängd</th>
                <th className="p-3 font-semibold uppercase tracking-wider text-[0.7rem] num">Netto Pris/enh</th>
                <th className="p-3 font-semibold uppercase tracking-wider text-[0.7rem] num">Total Kostnad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {calcResult.materialsSummary && calcResult.materialsSummary.filter(m => m.qty > 0).length > 0 ? (
                calcResult.materialsSummary.filter(m => m.qty > 0).map((m, idx) => {
                  const globalMat = materials.find(gm => gm.name === m.name);
                  const currentPrice = globalMat ? globalMat.price : 0;
                  const isEditing = editingPrice?.name === m.name;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 text-[var(--text)] font-semibold">{m.name}</td>
                      <td className="p-3 text-[var(--text2)] text-xs">{m.cat}</td>
                      <td className="p-3 num text-[var(--text2)] font-medium">
                        {formatN(m.qty)} <span className="text-[0.65rem] uppercase text-[var(--text3)]">{m.unit}</span>
                      </td>
                      <td className="p-3 num">
                        {isEditing ? (
                          <div className="flex justify-end items-center gap-1">
                            <input 
                              type="number" 
                              step="any"
                              min="0"
                              className="w-20 border border-[var(--border)] rounded px-2 py-1 num text-xs focus:border-[var(--blue)] outline-none"
                              value={editingPrice.price}
                              onChange={e => setEditingPrice({ ...editingPrice, price: parseFloat(e.target.value) || 0 })}
                              onKeyDown={e => e.key === 'Enter' && handlePriceSave(m.name)}
                              autoFocus
                            />
                            <button className="text-green-600 hover:text-green-700 mx-1" onClick={() => handlePriceSave(m.name)}>
                              <i className="fa-solid fa-check"></i>
                            </button>
                            <button className="text-gray-400 hover:text-gray-600" onClick={() => setEditingPrice(null)}>
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end items-center gap-2 group">
                            <div className="text-[var(--text)]">
                              {formatKr(currentPrice)}
                            </div>
                            <button 
                              className="text-gray-300 hover:text-[var(--blue)] opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Ändra pris"
                              onClick={() => setEditingPrice({ name: m.name, price: currentPrice })}
                            >
                              <i className="fa-solid fa-pen text-[10px]"></i>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3 num font-bold text-[var(--text)]">{formatKr(m.costNetto)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[var(--text3)] text-sm">
                    Inga material har använts i aktiva byggdelar ännu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
