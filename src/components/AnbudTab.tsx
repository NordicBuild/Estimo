import React from 'react';
import { CalculationResult } from '../useCalculation';
import { Byggdel, ProjectInfo, CompanyInfo, INITIAL_TIDSFAKTORER } from '../data';
import { exportPdf, exportExcel } from '../exportUtils';

interface Props {
  calcResult: CalculationResult;
  byggdelar: Byggdel[];
  projectInfo: ProjectInfo;
  companyInfo: CompanyInfo;
  updateByggdelOfferPrice?: (id: number, show: boolean) => void;
}

export function AnbudTab({ calcResult, byggdelar, projectInfo, companyInfo, updateByggdelOfferPrice }: Props) {
  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';

  const activeByggdelar = byggdelar.filter(b => b.active !== false);

  const handleExportPdf = () => {
    exportPdf('pdf-anbud-content', `Anbud_${projectInfo.name || 'Projekt'}.pdf`);
  };

  const handleExportExcel = () => {
    exportExcel(byggdelar, calcResult, projectInfo, companyInfo);
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 my-8">
      <div className="mb-4 flex gap-2 justify-end print:hidden">
        <button className="btn btn-secondary border border-gray-300 bg-white shadow-sm hover:bg-gray-50 text-sm px-4 py-2 font-medium" onClick={handleExportExcel}>
          <i className="fa-solid fa-file-excel text-green-600 mr-2"></i> Exportera Excel
        </button>
        <button className="btn btn-primary bg-[var(--blue)] text-white shadow-sm hover:bg-[var(--blue-dk)] text-sm px-4 py-2 font-medium" onClick={handleExportPdf}>
          <i className="fa-solid fa-file-pdf mr-2"></i> Exportera PDF
        </button>
      </div>

      <div id="pdf-anbud-content" className="card bg-white p-8 border border-[var(--border)] shadow-lg">
        <div className="flex justify-between border-b border-[var(--border)] pb-5 mb-6">
          <div>
            <h2 className="m-0 text-2xl font-extrabold tracking-tight">Anbudsunderlag</h2>
            <div className="mt-4 text-sm">
              <h4 className="font-bold text-[var(--text1)] mb-1">Leverantör</h4>
              <p className="text-[var(--text2)] leading-relaxed">
                {companyInfo.name || 'Estimo'}<br/>
                {companyInfo.orgNr && <span>Org.nr: {companyInfo.orgNr}<br/></span>}
                {companyInfo.ort && <span>{companyInfo.ort}, {companyInfo.land}<br/></span>}
                {companyInfo.contactPerson && <span>Kontakt: {companyInfo.contactPerson}<br/></span>}
                {companyInfo.email && <span>Email: {companyInfo.email}<br/></span>}
                {companyInfo.phone && <span>Tel: {companyInfo.phone}</span>}
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col justify-between">
            <div>
              <h3 className="m-0 text-lg font-bold">Offerterbjudande</h3>
              <p className="text-[var(--text3)] mt-1">Datum: {new Date().toLocaleDateString('sv-SE')}</p>
            </div>
            
            <div className="mt-4 text-sm text-right">
              <h4 className="font-bold text-[var(--text1)] mb-1">Mottagare / Projekt</h4>
              <p className="text-[var(--text2)] leading-relaxed">
                {projectInfo.client ? <span className="font-semibold">{projectInfo.client}<br/></span> : <span className="text-[var(--text3)] italic">Ingen beställare angiven<br/></span>}
                {projectInfo.clientOrgNr && <span>Org.nr: {projectInfo.clientOrgNr}<br/></span>}
                {projectInfo.clientContact && <span>Att: {projectInfo.clientContact}<br/></span>}
                {projectInfo.name && <span>Projekt: {projectInfo.name}<br/></span>}
                {projectInfo.nr && <span>Projektnr: {projectInfo.nr}</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 bg-[var(--surface2)] p-5 rounded-lg border border-[var(--border)] text-sm text-[var(--text2)] leading-relaxed shadow-sm">
          <h3 className="font-bold text-[var(--text)] mb-2 flex items-center gap-2">
            <i className="fa-solid fa-file-contract text-[var(--blue)]"></i> 
            Anbudsbeskrivning {projectInfo.contractType ? `enligt ${projectInfo.contractType}` : ''}
          </h3>
          <p>
            Vi erbjuder oss härmed att utföra projektet enligt nedanstående specifikation och mängder.
            Anbudet omfattar allt erforderligt material och arbete för en totalsumma om <strong>{formatKr(calcResult.anbud)}</strong> exklusive moms.
            {projectInfo.contractType ? (
              <span className="block mt-2">
                Entreprenaden är avsedd att utföras i enlighet med Allmänna Bestämmelser för {projectInfo.contractType === 'ABT06' ? 'totalentreprenader, ABT 06' : 'byggnads-, anläggnings- och installationsentreprenader, AB 04'}.
              </span>
            ) : (
              <span className="block mt-2 text-[var(--text3)] italic">
                (Ingen specifik entreprenadform (AB04/ABT06) är angiven i Projektinformationen.)
              </span>
            )}
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold border-b-2 border-[var(--border)] pb-2 mb-4">Ingående delar i entreprenaden</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--surface3)] text-xs uppercase tracking-wide text-[var(--text2)]">
                <th className="p-3 border-b border-[var(--border)]">Byggdel</th>
                <th className="p-3 border-b border-[var(--border)] num">Antal</th>
                <th className="p-3 border-b border-[var(--border)] num">Mängd</th>
                <th className="p-3 border-b border-[var(--border)] text-center">Enhet</th>
                <th className="p-3 border-b border-[var(--border)] num relative group">
                  Totalt Pris (inkl. påslag)
                  <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-black text-white text-[10px] p-1 rounded shadow-lg whitespace-nowrap z-10 print:hidden">
                    Klicka på ikonen på en rad för att dölja/visa pris.
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {activeByggdelar.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-[var(--text3)] italic">Inga aktiva byggdelar i kalkylen.</td>
                </tr>
              ) : (
                Object.entries(
                  activeByggdelar.reduce((acc, b) => {
                    const groupKey = b.type + (b.revision ? '__REV__' + b.revision : '');
                    if (!acc[groupKey]) acc[groupKey] = [];
                    acc[groupKey].push(b);
                    return acc;
                  }, {} as Record<string, typeof activeByggdelar>)
                ).map(([groupKey, groupParts]) => {
                  const baseType = groupKey.split('__REV__')[0];
                  const revision = groupKey.split('__REV__')[1];
                  const rawLabel = INITIAL_TIDSFAKTORER.find(t => t.type === baseType)?.label || baseType;
                  const typeLabel = revision ? `${rawLabel} - ${revision}` : rawLabel;
                  return (
                    <React.Fragment key={groupKey}>
                      <tr className="bg-[var(--surface2)] border-y border-[var(--border)]">
                        <td colSpan={4} className="p-3 font-bold text-xs text-[var(--text2)] uppercase tracking-wider">
                          {typeLabel}
                        </td>
                      </tr>
                      {groupParts.map(b => {
                        const partCalc = calcResult.parts.find(p => p.id === b.id);
                        if (!partCalc) return null;
                        
                        // Calculate part total price with markup proportionally
                        const partCost = partCalc.costNetto;
                        const partsTotalCost = calcResult.totArb + calcResult.totMat;
                        const ratio = partsTotalCost > 0 ? partCost / partsTotalCost : 0;
                        const partAnbudPrice = partCost + (calcResult.omkTot * ratio) + (calcResult.vTot * ratio);

                        return (
                          <tr key={b.id} className="border-b border-[var(--border)] hover:bg-[var(--surface2)]">
                            <td className="p-3 font-semibold pl-6">{b.name}</td>
                            <td className="p-3 num text-[var(--text2)]">{b.antal || 1} st</td>
                            <td className="p-3 num">{b.qty || 1}</td>
                            <td className="p-3 text-center text-[var(--text3)] text-xs">{partCalc.unit}</td>
                            <td className="p-3 num font-bold flex items-center justify-end gap-2 group/price min-h-[44px]">
                              <span>{b.showPriceInOffer ? formatKr(partAnbudPrice) : '---'}</span>
                              <button 
                                onClick={() => updateByggdelOfferPrice?.(b.id, !b.showPriceInOffer)}
                                className={`text-xs ml-2 p-1 rounded transition-colors print:hidden ${b.showPriceInOffer ? 'text-[var(--blue)] hover:bg-[var(--blue-lt)]' : 'text-[var(--text4)] hover:bg-gray-200'}`}
                                title={b.showPriceInOffer ? "Dölj pris i anbud" : "Visa pris i anbud"}
                              >
                                <i className={`fa-solid ${b.showPriceInOffer ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-4 border-t-2 border-[var(--border)] mt-8">
          <div className="w-96 border border-[var(--border)] rounded-lg overflow-hidden shadow-sm">
            <div className="bg-[var(--surface3)] text-[var(--text1)] text-center py-2 text-[0.65rem] font-extrabold uppercase tracking-widest border-b border-[var(--border)]">
               Sammanställning
            </div>
            <div className="p-5 grid gap-2">
              <div className="flex justify-between text-sm text-[var(--text2)]">
                <span>Självkostnad:</span>
                <span className="font-mono">{formatKr(calcResult.projNetto)}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--text2)]">
                <span>Omkostnader:</span>
                <span className="font-mono">{formatKr(calcResult.omkTot)}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--text2)] border-b border-[var(--border)] pb-2 mb-1">
                <span>Vinst / Påslag:</span>
                <span className="font-mono">{formatKr(calcResult.vTot)}</span>
              </div>
              <div className="flex justify-between font-bold text-[var(--text1)] text-base pt-1">
                <span>Summa exkl. moms:</span>
                <span className="font-mono">{formatKr(calcResult.anbud)}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--text3)]">
                <span>Moms (25%):</span>
                <span className="font-mono">{formatKr(calcResult.anbud * 0.25)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-xl pt-3 mt-2 border-t-2 border-[var(--border)] text-[var(--blue-dk)]">
                <span>Total inkl. moms:</span>
                <span className="font-mono">{formatKr(calcResult.anbud * 1.25)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--border)] print:hidden" data-html2canvas-ignore="true">
          <p className="text-xs text-[var(--text3)] text-center">
            Offerten är giltig i 30 dagar. Betalningsvillkor 30 dagar netto ifall inget annat överenskommits.<br/>
            Angivna mängder baseras på inlämnat underlag. Uppmätt verklig mängd kan leda till justering av priset.
          </p>
          <div className="flex justify-center mt-6 gap-4">
            <button className="btn btn-secondary border border-gray-300 bg-white shadow-sm hover:bg-gray-50 text-sm px-6 py-2 font-medium" onClick={handleExportExcel}>
              <i className="fa-solid fa-file-excel text-green-600 mr-2"></i> Exportera Excel
            </button>
            <button className="btn btn-primary bg-[var(--blue)] text-white shadow-sm hover:bg-[var(--blue-dk)] text-sm px-6 py-2 font-medium" onClick={handleExportPdf}>
               <i className="fa-solid fa-file-pdf mr-2"></i> Exportera PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
