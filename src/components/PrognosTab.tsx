import React, { useState, useEffect, useMemo } from 'react';
import { Byggdel } from '../data';
import { listUtfall, DbUtfall } from '../eac/utfallApi';
import { EacMetod, computeEac, eacStatus, RadEacInput } from '../eac/eac';

interface Props {
  byggdelar: Byggdel[];
  calcResult: any;
  projectId: string;
  companyId: string;
}

export function PrognosTab({ byggdelar, calcResult, projectId, companyId }: Props) {
  const [utfall, setUtfall] = useState<Record<string, DbUtfall>>({});
  const [loading, setLoading] = useState(true);
  const [metod, setMetod] = useState<EacMetod>('kvarvarande-budget');

  useEffect(() => {
    if (!companyId || !projectId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    listUtfall(companyId, projectId).then(data => {
      const map: Record<string, DbUtfall> = {};
      data.forEach(d => {
        map[d.line_key] = d;
      });
      setUtfall(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [companyId, projectId]);

  const { budgetPoster, totals } = useMemo(() => {
    const poster: (RadEacInput & { id: number, name: string, acData: DbUtfall })[] = [];
    
    for (const b of byggdelar) {
      if (b.active === false) continue;
      
      const partCalc = calcResult.parts.find((p: any) => p.id === b.id);
      const bac = partCalc ? partCalc.costNetto : 0;
      
      const u = utfall[b.id.toString()] || { ac: null, fardiggrad: null, manuell_eac: null };
      const ac = u.ac || 0;
      const fardiggrad = u.fardiggrad || 0;
      const manuell_eac = u.manuell_eac || undefined;

      poster.push({
        id: b.id,
        name: b.name,
        acData: u as DbUtfall,
        bac,
        ac,
        fardiggrad,
        metod,
        manuell_eac
      });
    }

    const t = computeEac(poster);
    
    // Calculate total actual cost
    const totalAc = poster.reduce((sum, p) => sum + p.ac, 0);
    const totalBac = poster.reduce((sum, p) => sum + p.bac, 0);
    
    // Calculate total fardiggrad weighted by BAC
    const totalFardiggrad = totalBac > 0 ? poster.reduce((sum, p) => sum + (p.fardiggrad * p.bac), 0) / totalBac : 0;

    return { budgetPoster: poster, totals: { ...t, totalAc, totalBac, totalFardiggrad } };
  }, [byggdelar, calcResult, utfall, metod]);

  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';

  if (loading) {
    return <div className="p-8 text-gray-500">Laddar prognosdata...</div>;
  }

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 my-8 pb-32">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-extrabold tracking-tight">Ekonomisk Prognos (EAC)</h2>
        
        <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
          <button 
            onClick={() => setMetod('kvarvarande-budget')} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${metod === 'kvarvarande-budget' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Kvarvarande budget
          </button>
          <button 
            onClick={() => setMetod('cpi')} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${metod === 'cpi' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            CPI-trend
          </button>
          <button 
            onClick={() => setMetod('manuell')} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${metod === 'manuell' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Manuell
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg border-l-4 border-l-[var(--blue)] shadow-sm">
          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Total Budget (BAC)</div>
          <div className="text-2xl font-mono font-bold text-[var(--text)]">{formatKr(totals.totalBac)}</div>
        </div>
        
        <div className="bg-white p-5 rounded-lg border-l-4 border-l-[var(--purple)] shadow-sm">
          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Total Färdiggrad</div>
          <div className="text-2xl font-mono font-bold text-[var(--purple)]">{(totals.totalFardiggrad * 100).toFixed(1)}%</div>
        </div>

        <div className="bg-gradient-to-br from-[var(--blue)] to-[var(--blue-dk)] p-5 rounded-lg text-white shadow-md border-none relative overflow-hidden">
          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-blue-200 mb-1">Prognos (EAC)</div>
          <div className="text-2xl font-mono font-bold">{formatKr(totals.eac)}</div>
          <div className="absolute top-0 right-0 p-3 opacity-20"><i className="fa-solid fa-chart-line text-4xl"></i></div>
        </div>
        
        <div className={`bg-white p-5 rounded-lg border-l-4 shadow-sm ${totals.vac < 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Avvikelse (VAC)</div>
          <div className={`text-2xl font-mono font-bold ${totals.vac < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatKr(totals.vac)}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--surface3)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3 font-semibold text-[var(--text2)] uppercase text-xs tracking-wider">Byggdel</th>
                <th className="px-4 py-3 font-semibold text-[var(--text2)] uppercase text-xs tracking-wider text-right">BAC</th>
                <th className="px-4 py-3 font-semibold text-[var(--text2)] uppercase text-xs tracking-wider text-right">AC</th>
                <th className="px-4 py-3 font-semibold text-[var(--text2)] uppercase text-xs tracking-wider text-right">Färdiggrad</th>
                <th className="px-4 py-3 font-semibold text-[var(--text2)] uppercase text-xs tracking-wider text-right">EV</th>
                <th className="px-4 py-3 font-semibold text-[var(--text2)] uppercase text-xs tracking-wider text-right">CPI</th>
                <th className="px-4 py-3 font-semibold text-[var(--text2)] uppercase text-xs tracking-wider text-right">EAC</th>
                <th className="px-4 py-3 font-semibold text-[var(--text2)] uppercase text-xs tracking-wider text-right">ETC</th>
                <th className="px-4 py-3 font-semibold text-[var(--text2)] uppercase text-xs tracking-wider text-right">VAC</th>
                <th className="px-4 py-3 font-semibold text-[var(--text2)] uppercase text-xs tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {budgetPoster.map(p => {
                const { ev, cpi, eac, etc, vac } = computeEac([{...p}]);
                const avvikelseProcent = p.bac > 0 ? (vac / p.bac) * 100 : 0;
                
                // Status for UI
                let statusColor = 'bg-gray-100 text-gray-800';
                let statusText = 'På plan';
                
                // Let's say tolerance is 5% of BAC
                const tolerans = p.bac * 0.05;
                const status = eacStatus(-vac, tolerans); // Because avvikelse in eacStatus is EAC - BAC? Wait.
                // eacStatus(avvikelse, tolerans) ... if avvikelse > tolerans -> over.
                // EAC is estimated cost. So if EAC > BAC + tolerans => over.
                // vac is BAC - EAC. So if vac < -tolerans => EAC is more than BAC + tolerans. 
                // Let's pass -vac as avvikelse (which is EAC - BAC).
                const statusVal = eacStatus(-vac, tolerans);

                if (statusVal === 'over') {
                  statusColor = 'bg-red-100 text-red-800';
                  statusText = 'Över budget';
                } else if (statusVal === 'under') {
                  statusColor = 'bg-green-100 text-green-800';
                  statusText = 'Under budget';
                }

                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--text2)]">{formatKr(p.bac)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--text2)]">{formatKr(p.ac)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--text2)]">{(p.fardiggrad * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--text2)]">{formatKr(ev)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--text2)]">{cpi !== null ? cpi.toFixed(2) : '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{formatKr(eac)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--text2)]">{formatKr(etc)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${vac < 0 ? 'text-red-600' : vac > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {formatKr(vac)}
                      <span className="text-[10px] ml-1 opacity-70">({avvikelseProcent > 0 ? '+' : ''}{avvikelseProcent.toFixed(1)}%)</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
