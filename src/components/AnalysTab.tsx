import React, { useMemo, useEffect, useState } from 'react';
import { CalculationResult } from '../useCalculation';
import { INITIAL_TIDSFAKTORER } from '../data';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, AreaChart, Area } from 'recharts';

interface Props {
  calcResult: CalculationResult;
}

export function AnalysTab({ calcResult }: Props) {
  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';

  const [realHistory, setRealHistory] = useState<any[]>([]);
  const [iterations, setIterations] = useState(5000);
  const [uncMat, setUncMat] = useState(5);
  const [uncArb, setUncArb] = useState(10);
  const [uncVol, setUncVol] = useState(2);

  useEffect(() => {
    if (calcResult.anbud <= 0) return;
    
    const todayDate = new Date();
    // Format ex: "14:30:15" (real time changes)
    const todayStr = todayDate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second:'2-digit' });
    
    const newEntry = {
      label: todayStr,
      anbud: Math.round(calcResult.anbud),
      kostnad: Math.round(calcResult.projNetto),
      vinst: Math.round(calcResult.vTot)
    };

    setRealHistory(prev => {
       if (prev.length > 0) {
          const last = prev[prev.length - 1];
          // Only add if something changed
          if (last.anbud === newEntry.anbud && last.kostnad === newEntry.kostnad) {
             return prev;
          }
       }
       const updated = [...prev, newEntry];
       if (updated.length > 20) return updated.slice(updated.length - 20);
       return updated;
    });
  }, [calcResult.anbud, calcResult.projNetto, calcResult.vTot]);

  const m3Total = calcResult.totVol;
  const plattaArea = useMemo(() => {
    return calcResult.parts
      .filter(p => p.active !== false)
      .reduce((sum, p) => {
         if (p.type.toLowerCase().includes('platta')) {
            return sum + (p.qty || 0);
         } else if (p.type === '24.3_Grop') {
            const L = p.dimensions?.length || 0;
            const W = p.dimensions?.width || 0;
            return sum + (L * W * (p.qty || 1));
         }
         return sum;
      }, 0);
  }, [calcResult.parts]);
  const m2Total = plattaArea;
  const krPerM3 = m3Total > 0 ? calcResult.anbud / m3Total : 0;
  const unitTimes = useMemo(() => {
     const groups = new Map<string, { label: string, unit: string, tim: number, qty: number }>();
     calcResult.parts.filter(p => p.active !== false && p.qty > 0).forEach(p => {
        if (!groups.has(p.type)) {
           const label = INITIAL_TIDSFAKTORER.find(t => t.type === p.type)?.label?.split(' - ')[1] || p.type.split('_').pop() || p.type;
           groups.set(p.type, {
              label,
              unit: p.unit,
              tim: 0,
              qty: 0
           });
        }
        const g = groups.get(p.type)!;
        g.tim += p.tim;
        g.qty += p.qty;
     });
     
     return Array.from(groups.values()).map(g => ({
        label: g.label,
        unit: g.unit,
        qty: g.qty,
        val: g.qty > 0 ? (g.tim / g.qty) : 0
     })).filter(x => x.qty !== 0); // we already filtered p.qty > 0
  }, [calcResult.parts]);

  const timPerM3 = m3Total > 0 ? calcResult.totTim / m3Total : 0;
  const krPerM2 = m2Total > 0 ? calcResult.anbud / m2Total : 0;
  const timPerM2 = m2Total > 0 ? calcResult.totTim / m2Total : 0;
  
  const kundprisPerH = calcResult.totTim > 0 ? calcResult.anbud / calcResult.totTim : 0;
  
  const total = calcResult.anbud;
  const matPct = total > 0 ? (calcResult.totMat / total) * 100 : 0;
  const arbPct = total > 0 ? (calcResult.totArb / total) * 100 : 0;
  const omkPct = total > 0 ? (calcResult.omkTot / total) * 100 : 0;
  const vinstPct = total > 0 ? (calcResult.vTot / total) * 100 : 0;

  // Market comparison constants (hypothetical benchmarks)
  const MARKET_REF_PRICE_M3 = 7500;
  const MARKET_REF_HOURS_M3 = 5.5;

  const priceDiffPct = krPerM3 > 0 ? ((krPerM3 - MARKET_REF_PRICE_M3) / MARKET_REF_PRICE_M3) * 100 : 0;
  const timeDiffPct = timPerM3 > 0 ? ((timPerM3 - MARKET_REF_HOURS_M3) / MARKET_REF_HOURS_M3) * 100 : 0;

  // Will be calculated via Monte Carlo below

  // Data for Pie Chart
  const pieData = [
    { name: 'Material', value: calcResult.totMat, color: '#3b82f6' },
    { name: 'Arbete', value: calcResult.totArb, color: '#a855f7' },
    { name: 'Omkostnader', value: calcResult.omkTot, color: '#f59e0b' },
    { name: 'Vinst', value: calcResult.vTot, color: '#10b981' }
  ].filter(d => d.value > 0);

  // Data for Bar Chart: Materials
  const materialBarData = calcResult.materialsSummary?.slice(0, 5).map(m => ({
    name: m.name.length > 15 ? m.name.substring(0, 15) + '...' : m.name,
    Kostnad: Math.round(m.costNetto)
  })) || [];

  // Data for Bar Chart: Arbetsmoment
  const momentsBarData = calcResult.momentsSummary?.slice(0, 5).map(m => ({
    name: m.label.length > 15 ? m.label.substring(0, 15) + '...' : m.label,
    Kostnad: Math.round(m.costNetto)
  })) || [];

  const byggdelarBarData = calcResult.parts
    .filter(p => p.active !== false && p.costNetto > 0)
    .map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      Material: Math.round(p.matNetto),
      Arbete: Math.round(p.arbNetto),
    }));

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md text-sm">
          <p className="font-semibold text-gray-800">{payload[0].name}</p>
          <p className="text-gray-600">{formatKr(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (payload.length > 1) { // Stacked chart
        return (
          <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md text-sm z-50">
            <p className="font-semibold text-gray-800 mb-2">{label}</p>
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4 mb-1 border-b border-gray-50 pb-1 last:border-0 last:pb-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                  <span className="text-gray-600">{entry.name}:</span>
                </div>
                <span className="font-mono text-xs font-semibold">{formatKr(entry.value)}</span>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md text-sm z-50">
          <p className="font-semibold text-gray-800 mb-1">{label}</p>
          <p className="text-gray-600 font-mono text-xs">{formatKr(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const winSimulation = useMemo(() => {
    if (calcResult.anbud <= 0) return null;
    
    const ITERATIONS = iterations;
    const ourPrice = calcResult.anbud;
    const ourTime = calcResult.totTim;
    const ourQuality = 8; // Antagande om god kvalitet

    const marketPriceAvg = MARKET_REF_PRICE_M3 * calcResult.totVol;
    const marketTimeAvg = MARKET_REF_HOURS_M3 * calcResult.totVol;

    // Beta-PERT approximation using Johnk's algorithm
    const randomBeta = (alpha: number, beta: number) => {
        let u, v;
        do {
            u = Math.pow(Math.random(), 1 / alpha);
            v = Math.pow(Math.random(), 1 / beta);
        } while (u + v > 1);
        if (u + v === 0) return 0;
        return u / (u + v);
    };

    const randomPERT = (min: number, mode: number, max: number) => {
        if (min === max) return min;
        const range = max - min;
        const alpha = 1 + 4 * ((mode - min) / range);
        const beta = 1 + 4 * ((max - mode) / range);
        return min + randomBeta(alpha, beta) * range;
    };

    const compPrices: number[] = [];
    const compTimes: number[] = [];
    const compQualities: number[] = [];
    const ourSimCosts: number[] = [];
    
    // Försimulera marknadens (konkurrenters) nivåer och våra egna kostnader
    for (let i = 0; i < ITERATIONS; i++) {
        // PERT fördelningar (min, troligast, max) för marknaden
        compPrices.push(randomPERT(marketPriceAvg * 0.80, marketPriceAvg, marketPriceAvg * 1.30));
        compTimes.push(randomPERT(marketTimeAvg * 0.8, marketTimeAvg, marketTimeAvg * 1.4));
        compQualities.push(randomPERT(5, 7, 10)); // Kvalitet 1-10

        // Simulera vår egen kostnad baserat på osäkerheter
        const simMat = randomPERT(calcResult.totMat * (1 - uncMat/100), calcResult.totMat, calcResult.totMat * (1 + uncMat/100));
        const simArb = randomPERT(calcResult.totArb * (1 - uncArb/100), calcResult.totArb, calcResult.totArb * (1 + uncArb/100));
        const simVolFactor = randomPERT(1 - uncVol/100, 1, 1 + uncVol/100);
        
        let simOmk = calcResult.omkTot;
        
        // Totalkostnad
        const simTotCost = (simMat + simArb) * simVolFactor + simOmk;
        ourSimCosts.push(simTotCost);
    }
    
    // Det riskabla priset blir 90:e percentilen av våra simulerade kostnader
    const sortedCosts = [...ourSimCosts].sort((a, b) => a - b);
    const calculatedRiskabelPrice = sortedCosts[Math.floor(ITERATIONS * 0.90)];
    
    // Vi undersöker en kurva runt vårt eget anbud
    const minBid = ourPrice * 0.70;
    const maxBid = ourPrice * 1.30;
    const steps = 30;
    const stepSize = (maxBid - minBid) / steps;
    
    const curveData = [];
    let currentBidWinProb = 0;
    
    for (let step = 0; step <= steps; step++) {
        const testBid = minBid + step * stepSize;
        let winsOnlyPrice = 0;
        let winsStandard = 0;
        let winsQuality = 0;
        
        for (let i = 0; i < ITERATIONS; i++) {
            const cp = compPrices[i];
            const ct = compTimes[i];
            const cq = compQualities[i];
            
            // Scenario 1: Endast Pris (lägst vinner)
            if (testBid < cp) winsOnlyPrice++;
            
            // Helper för relativ poäng, maxpoäng = minVärde / VerkligtVärde (Lägre är bättre för Pris/Tid)
            const mpStd = Math.min(testBid, cp);
            const mtStd = Math.min(ourTime, ct);

            // Scenario 2: Standardvärdering (70% Pris, 20% Tid, 10% Kvalitet)
            const ourScoreStd = (mpStd/testBid)*70 + (mtStd/ourTime)*20 + (ourQuality/10)*10;
            const compScoreStd = (mpStd/cp)*70 + (mtStd/ct)*20 + (cq/10)*10;
            if (ourScoreStd > compScoreStd) winsStandard++;
            
            // Scenario 3: Kvalitetsfokus (40% Pris, 20% Tid, 40% Kvalitet)
            const ourScoreQ = (mpStd/testBid)*40 + (mtStd/ourTime)*20 + (ourQuality/10)*40;
            const compScoreQ = (mpStd/cp)*40 + (mtStd/ct)*20 + (cq/10)*40;
            if (ourScoreQ > compScoreQ) winsQuality++;
        }
        
        const probOnlyPrice = (winsOnlyPrice / ITERATIONS) * 100;
        const probStandard = (winsStandard / ITERATIONS) * 100;
        const probQuality = (winsQuality / ITERATIONS) * 100;
        
        curveData.push({
            anbud: testBid,
            'Endast Pris': Math.round(probOnlyPrice),
            'Standardvärdering (70/30)': Math.round(probStandard),
            'Kvalitetsfokus (40/60)': Math.round(probQuality)
        });
        
        if (Math.abs(testBid - ourPrice) < stepSize) {
           currentBidWinProb = probStandard;
        }
    }
    
    // Find specific price points
    let braMarknadPrice = marketPriceAvg;
    let tooHighPrice = marketPriceAvg * 1.2;
    
    // Attempt to find from curves
    const goodMarketPoint = [...curveData].reverse().find(d => d['Standardvärdering (70/30)'] >= 50);
    if (goodMarketPoint) braMarknadPrice = goodMarketPoint.anbud;
    
    const tooHighPoint = curveData.find(d => d['Standardvärdering (70/30)'] <= 10);
    if (tooHighPoint) tooHighPrice = tooHighPoint.anbud;

    return {
        curveData,
        currentBidWinProb,
        ourPrice,
        marketPriceAvg,
        riskabelPrice: calculatedRiskabelPrice,
        braMarknadPrice,
        tooHighPrice
    };
  }, [calcResult, MARKET_REF_PRICE_M3, MARKET_REF_HOURS_M3, iterations, uncMat, uncArb, uncVol]);

  let winProb = winSimulation ? Math.round(winSimulation.currentBidWinProb) : 0;

  const trendData = realHistory.map((h, i) => ({
    label: h.label + (i === realHistory.length - 1 ? ' (Nu)' : ''),
    anbud: h.anbud,
    kostnad: h.kostnad,
    vinst: h.vinst
  }));

  const sensitivityData = [
    { name: 'Arbetskostnad', impact: -(calcResult.totArb * 0.10) },
    { name: 'Materialkostnad', impact: -(calcResult.totMat * 0.10) },
    { name: 'Omkostnader', impact: -(calcResult.omkTot * 0.10) },
  ];

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 my-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* KPI: Kostnad per m3 */}
        <div className="card p-6 border-t-4 border-t-[var(--blue)]">
          <div className="flex justify-between items-start mb-4">
             <div>
               <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text3)]">Försäljning per m³ / m²</div>
               <div className="text-2xl font-mono font-bold mt-1 text-[var(--text)]">{formatKr(krPerM3)} <span className="text-sm">/ m³</span></div>
               <div className="text-xl font-mono text-[var(--text2)] mt-1">{formatKr(krPerM2)} <span className="text-xs">/ m²</span></div>
             </div>
             <div className="w-8 h-8 rounded bg-[var(--blue-lt)] text-[var(--blue)] flex items-center justify-center"><i className="fa-solid fa-cube"></i></div>
          </div>
          <p className="text-[0.7rem] text-[var(--text3)] mt-2">Anbudssumma fördelat på volym resp. area.</p>
        </div>

        {/* KPI: Enhetstider */}
        <div className="card p-6 border-t-4 border-t-[var(--purple)] overflow-hidden flex flex-col">
          <div className="flex justify-between items-start mb-4">
             <div>
               <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text3)]">Enhetstider (Kalkyl)</div>
               <div className="text-xl font-mono font-bold mt-1 text-[var(--text)]">Snitt {(calcResult.totTim / Math.max(1, calcResult.totVol)).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm">h/m³ (tot)</span></div>
             </div>
             <div className="w-8 h-8 rounded bg-[var(--purple-lt)] text-[var(--purple)] flex items-center justify-center shrink-0"><i className="fa-solid fa-stopwatch"></i></div>
          </div>
          <div className="flex-1 overflow-y-auto mb-2 space-y-2 pr-1">
             {unitTimes.length === 0 ? (
               <div className="text-xs text-[var(--text3)]">Inga byggdelar</div>
             ) : (
                unitTimes.map((ut, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-xs font-medium text-[var(--text2)] truncate pr-2 max-w-[65%]">{ut.label}</span>
                    <span className="text-sm font-mono text-[var(--text)] shrink-0">{ut.val.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-[var(--text3)]">h/{ut.unit}</span></span>
                  </div>
                ))
             )}
          </div>
          <p className="text-[0.65rem] text-[var(--text3)] mt-auto pt-2 border-t border-[var(--border)]">Tot tid: {calcResult.totTim.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} h. Visar snitt per kategori.</p>
        </div>
        
        {/* KPI: Kundpris per h */}
        <div className="card p-6 border-t-4 border-t-[var(--green)]">
          <div className="flex justify-between items-start mb-4">
             <div>
               <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text3)]">Kundpris per h</div>
               <div className="text-2xl font-mono font-bold mt-1 text-[var(--text)]">{formatKr(kundprisPerH)}</div>
             </div>
             <div className="w-8 h-8 rounded bg-green-50 text-green-600 flex items-center justify-center"><i className="fa-solid fa-bolt"></i></div>
          </div>
          <p className="text-[0.7rem] text-[var(--text3)] mt-2">Snittpris per producerad arbetstimme.</p>
        </div>

        {/* KPI: Täckningsbidrag */}
        <div className="card p-6 border-t-4 border-t-indigo-500">
          <div className="flex justify-between items-start mb-4">
             <div>
               <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text3)]">Täckningsbidrag (TB1)</div>
               <div className="text-2xl font-mono font-bold mt-1 text-[var(--text)]">{formatKr(calcResult.tb1)}</div>
             </div>
             <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-500 flex items-center justify-center"><i className="fa-solid fa-coins"></i></div>
          </div>
          <p className="text-[0.7rem] text-[var(--text3)] mt-2">Bidrag till täckning av samkostnader etc.</p>
        </div>
        
        {/* KPI: Ren Vinst */}
        <div className="card p-6 border-t-4 border-t-emerald-500">
          <div className="flex justify-between items-start mb-4">
             <div>
               <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text3)]">Beräknad Vinst</div>
               <div className="text-2xl font-mono font-bold mt-1 text-[var(--text)]">{formatKr(calcResult.vTot)}</div>
             </div>
             <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-500 flex items-center justify-center"><i className="fa-solid fa-money-bill-trend-up"></i></div>
          </div>
          <p className="text-[0.7rem] text-[var(--text3)] mt-2">Ren kalkylvinst för projektet.</p>
        </div>

        {/* KPI: Vinstmarginal */}
        <div className="card p-6 border-t-4 border-t-[var(--amber)]">
          <div className="flex justify-between items-start mb-4">
             <div>
               <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text3)]">Vinstmarginal i anbud</div>
               <div className="text-2xl font-mono font-bold mt-1 text-[var(--text)]">{calcResult.tg1.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</div>
             </div>
             <div className="w-8 h-8 rounded bg-[var(--amber-lt)] text-[var(--amber)] flex items-center justify-center"><i className="fa-solid fa-arrow-trend-up"></i></div>
          </div>
          <div className="h-1.5 w-full bg-[var(--surface3)] rounded-full overflow-hidden mt-2">
             <div className="h-full bg-[var(--amber)]" style={{ width: `${Math.min(100, calcResult.tg1)}%` }}></div>
          </div>
          <p className="text-[0.7rem] text-[var(--text3)] mt-3">Kalkylerad nettomarginal på offert (TG1).</p>
        </div>

        {/* KPI: Anbudssannolikhet */}
        <div className="card p-6 border-t-4 border-t-cyan-500">
          <div className="flex justify-between items-start mb-4">
             <div>
               <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text3)]">Anbudssannolikhet</div>
               <div className="text-2xl font-mono font-bold mt-1 text-[var(--text)]">{winProb}%</div>
             </div>
             <div className="w-8 h-8 rounded bg-cyan-50 text-cyan-600 flex items-center justify-center"><i className="fa-solid fa-bullseye"></i></div>
          </div>
          <div className="h-1.5 w-full bg-[var(--surface3)] rounded-full overflow-hidden mt-2">
             <div className="h-full bg-cyan-500" style={{ width: `${winProb}%` }}></div>
          </div>
          <p className="text-[0.7rem] text-[var(--text3)] mt-3">Statistisk chans för "Vunnet" anbud baserat på marknadspris.</p>
        </div>

        {/* KPI: Marknadsjämförelse Pris */}
        <div className="card p-6 border-t-4 border-t-rose-400">
          <div className="flex justify-between items-start mb-4">
             <div>
               <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text3)]">Pris vs Marknad</div>
               <div className="text-2xl font-mono font-bold mt-1 text-[var(--text)]">
                 {priceDiffPct > 0 ? '+' : ''}{priceDiffPct.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
               </div>
             </div>
             <div className="w-8 h-8 rounded bg-rose-50 text-rose-500 flex items-center justify-center"><i className="fa-solid fa-scale-balanced"></i></div>
          </div>
          <p className="text-[0.7rem] text-[var(--text3)] mt-2">
            Ert pris ({formatKr(krPerM3)}/m³) jämfört med svenskt snitt ({formatKr(MARKET_REF_PRICE_M3)}/m³).
          </p>
        </div>

        {/* KPI: Marknadsjämförelse Tid */}
        <div className="card p-6 border-t-4 border-t-fuchsia-400">
          <div className="flex justify-between items-start mb-4">
             <div>
               <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text3)]">Tid vs Marknad</div>
               <div className="text-2xl font-mono font-bold mt-1 text-[var(--text)]">
                 {timeDiffPct > 0 ? '+' : ''}{timeDiffPct.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
               </div>
             </div>
             <div className="w-8 h-8 rounded bg-fuchsia-50 text-fuchsia-500 flex items-center justify-center"><i className="fa-solid fa-clock-rotate-left"></i></div>
          </div>
          <p className="text-[0.7rem] text-[var(--text3)] mt-2">
            Er produktionstid ({timPerM3.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h/m³) jämfört med svenskt snitt ({MARKET_REF_HOURS_M3} h/m³).
          </p>
        </div>

      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Kostnadsfördelning */}
         <div className="card">
            <div className="card-header border-b border-[var(--border)]">
               <div className="card-icon bg-indigo-50 text-indigo-500"><i className="fa-solid fa-chart-pie"></i></div>
               <span className="card-title">Anbudets Fördelning</span>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
               <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={pieData}
                       cx="50%"
                       cy="50%"
                       innerRadius={40}
                       outerRadius={80}
                       paddingAngle={2}
                       dataKey="value"
                     >
                       {pieData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                     </Pie>
                     <Tooltip content={<CustomPieTooltip />} />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
               
               <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                     <span className="font-medium text-[var(--text2)]">Material</span>
                   </div>
                   <div className="text-right">
                     <span className="font-mono font-semibold">{formatKr(calcResult.totMat)}</span>
                     <span className="text-xs text-[var(--text3)] w-12 inline-block ml-2">{matPct.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                   </div>
                 </div>
                 
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                     <span className="font-medium text-[var(--text2)]">Arbete</span>
                   </div>
                   <div className="text-right">
                     <span className="font-mono font-semibold">{formatKr(calcResult.totArb)}</span>
                     <span className="text-xs text-[var(--text3)] w-12 inline-block ml-2">{arbPct.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                   </div>
                 </div>
                 
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                     <span className="font-medium text-[var(--text2)]">Omkostnader</span>
                   </div>
                   <div className="text-right">
                     <span className="font-mono font-semibold">{formatKr(calcResult.omkTot)}</span>
                     <span className="text-xs text-[var(--text3)] w-12 inline-block ml-2">{omkPct.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                   </div>
                 </div>
                 
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                     <span className="font-medium text-[var(--text2)]">Vinst</span>
                   </div>
                   <div className="text-right">
                     <span className="font-mono font-semibold">{formatKr(calcResult.vTot)}</span>
                     <span className="text-xs text-[var(--text3)] w-12 inline-block ml-2">{vinstPct.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                   </div>
                 </div>
               </div>
            </div>
         </div>

         <div className="card">
            <div className="card-header border-b border-[var(--border)]">
               <div className="card-icon blue"><i className="fa-solid fa-chart-bar"></i></div>
               <span className="card-title">Kostnader per Byggdel (Netto)</span>
            </div>
            <div className="p-4 overflow-y-auto max-h-72">
               {calcResult.parts.filter(p => p.active !== false).length === 0 ? (
                 <div className="text-center text-[var(--text3)] py-8 text-sm">Inga aktiva byggdelar.</div>
               ) : (
                 calcResult.parts.filter(p => p.active !== false).map(p => {
                   const pct = calcResult.projNetto > 0 ? (p.costNetto / calcResult.projNetto) * 100 : 0;
                   return (
                     <div key={p.id} className="mb-4 last:mb-0">
                        <div className="flex justify-between text-xs font-semibold mb-1">
                           <span>{p.name} <span className="text-[var(--text3)] font-normal ml-1">({p.type})</span></span>
                           <span className="font-mono">{formatKr(p.costNetto)}</span>
                        </div>
                        <div className="h-2 w-full bg-[var(--surface3)] rounded-full overflow-hidden">
                           <div className="h-full bg-[var(--blue)] rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                     </div>
                   );
                 })
               )}
            </div>
         </div>
      </div>

      <div className="mt-8">
        <div className="card">
          <div className="card-header border-b border-[var(--border)]">
             <div className="card-icon bg-indigo-50 text-indigo-600"><i className="fa-solid fa-chart-column"></i></div>
             <span className="card-title">Material- och Arbetskostnad per Byggdel</span>
          </div>
          <div className="p-4 h-80">
             {byggdelarBarData.length === 0 ? (
               <div className="text-center text-[var(--text3)] py-8 text-sm h-full flex items-center justify-center">Inga aktiva byggdelar.</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={byggdelarBarData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                   <XAxis 
                     dataKey="name" 
                     angle={-45} 
                     textAnchor="end" 
                     height={80} 
                     interval={0} 
                     tick={{ fontSize: 11, fill: 'var(--text2)' }} 
                     axisLine={{ stroke: '#cbd5e1' }}
                     tickLine={{ stroke: '#cbd5e1' }}
                   />
                   <YAxis 
                     tick={{ fontSize: 11, fill: 'var(--text2)' }} 
                     tickFormatter={(val) => val >= 1000 ? Math.round(val/1000) + 'k' : val}
                     axisLine={{ stroke: '#cbd5e1' }}
                     tickLine={{ stroke: '#cbd5e1' }}
                   />
                   <Tooltip content={<CustomBarTooltip />} cursor={{fill: '#f8fafc'}} />
                   <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
                   <Bar dataKey="Material" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} maxBarSize={50} />
                   <Bar dataKey="Arbete" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={50} />
                 </BarChart>
               </ResponsiveContainer>
             )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP 5 materialkostnader */}
        <div className="card">
          <div className="card-header border-b border-[var(--border)]">
             <div className="card-icon bg-blue-50 text-blue-600"><i className="fa-solid fa-chart-column"></i></div>
             <span className="card-title">Största Materialkostnader</span>
          </div>
          <div className="p-4 h-64">
            {materialBarData.length === 0 ? (
              <div className="text-center text-[var(--text3)] py-8 text-sm h-full flex items-center justify-center">Inga data tillgänglig.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={materialBarData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} style={{ fontSize: '0.75rem', fill: 'var(--text2)' }} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="Kostnad" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* TOP 5 arbetskostnader */}
        <div className="card">
          <div className="card-header border-b border-[var(--border)]">
             <div className="card-icon bg-purple-50 text-purple-600"><i className="fa-solid fa-chart-column"></i></div>
             <span className="card-title">Största Arbetskostnader</span>
          </div>
          <div className="p-4 h-64">
            {momentsBarData.length === 0 ? (
               <div className="text-center text-[var(--text3)] py-8 text-sm h-full flex items-center justify-center">Inga data tillgänglig.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={momentsBarData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} style={{ fontSize: '0.75rem', fill: 'var(--text2)' }} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="Kostnad" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kostnad per material */}
        <div className="card">
          <div className="card-header border-b border-[var(--border)]">
             <div className="card-icon bg-blue-50 text-blue-600"><i className="fa-solid fa-boxes-stacked"></i></div>
             <span className="card-title">Kostnad per Material (Netto)</span>
          </div>
          <div className="p-4 overflow-y-auto max-h-72">
             {calcResult.materialsSummary && calcResult.materialsSummary.length === 0 ? (
               <div className="text-center text-[var(--text3)] py-8 text-sm">Inga materialkostnader.</div>
             ) : (
               <div className="overflow-x-auto w-full">
                 <table className="w-full text-left text-sm min-w-[500px]">
                   <thead>
                     <tr className="border-b border-[var(--border)]">
                       <th className="pb-2 text-[var(--text2)] font-semibold">Material</th>
                       <th className="pb-2 text-right text-[var(--text2)] font-semibold">Mängd</th>
                       <th className="pb-2 text-right text-[var(--text2)] font-semibold">Totalt</th>
                       <th className="pb-2 text-right text-[var(--text2)] font-semibold" title="Jämfört med föregående pris">+ / -</th>
                     </tr>
                   </thead>
                   <tbody>
                     {calcResult.materialsSummary?.map(m => {
                       let priceDiffStr = '-';
                       let diffClass = '';
                       if (m.previousPrice && m.qty > 0) {
                         const currentAvgPrice = m.costNetto / m.qty;
                         const diff = currentAvgPrice - m.previousPrice;
                         const diffPct = (diff / m.previousPrice) * 100;
                         if (Math.abs(diffPct) > 1) {
                           const sign = diff > 0 ? '+' : '';
                           diffClass = diff > 0 ? 'text-red-500' : 'text-green-500';
                           priceDiffStr = `${sign}${diffPct.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
                         }
                       }
                       return (
                         <tr key={m.name} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 transition-colors">
                           <td className="py-2 font-medium">{m.name} <span className="text-[0.65rem] text-[var(--text3)] font-normal ml-1 block sm:inline">{m.cat}</span></td>
                           <td className="py-2 text-right text-[var(--text2)] whitespace-nowrap">{m.qty.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[0.65rem]">{m.unit}</span></td>
                           <td className="py-2 text-right font-mono font-semibold">{formatKr(m.costNetto)}</td>
                           <td className={`py-2 text-right text-xs font-semibold ${diffClass}`}>{priceDiffStr}</td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        </div>

        {/* Kostnad per arbetsmoment */}
        <div className="card">
          <div className="card-header border-b border-[var(--border)]">
             <div className="card-icon bg-purple-50 text-purple-600"><i className="fa-solid fa-person-digging"></i></div>
             <span className="card-title">Kostnad per Arbetsmoment (Netto)</span>
          </div>
          <div className="p-4 overflow-y-auto max-h-72">
             {calcResult.momentsSummary && calcResult.momentsSummary.length === 0 ? (
               <div className="text-center text-[var(--text3)] py-8 text-sm">Inga arbetskostnader.</div>
             ) : (
               <div className="overflow-x-auto w-full">
                 <table className="w-full text-left text-sm min-w-[500px]">
                   <thead>
                     <tr className="border-b border-[var(--border)]">
                       <th className="pb-2 text-[var(--text2)] font-semibold">Arbetsmoment</th>
                       <th className="pb-2 text-right text-[var(--text2)] font-semibold">Timmar</th>
                       <th className="pb-2 text-right text-[var(--text2)] font-semibold">Totalt</th>
                     </tr>
                   </thead>
                   <tbody>
                     {calcResult.momentsSummary?.map(m => (
                       <tr key={m.label} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 transition-colors">
                         <td className="py-2 font-medium">{m.label}</td>
                         <td className="py-2 text-right text-[var(--text2)] whitespace-nowrap">{m.hours.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[0.65rem]">h</span></td>
                         <td className="py-2 text-right font-mono font-semibold">{formatKr(m.costNetto)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        </div>
      </div>

      {winSimulation && (
        <div className="mt-8 card p-6 border-t-4 border-t-indigo-600">
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-chart-line text-indigo-600"></i> Monte Carlo-simulering (Anbudssannolikhet)
               </h3>
               <div className="mt-2 sm:mt-0 flex items-center text-sm">
                  <label className="text-[var(--text2)] mr-2 font-semibold">Iterationer:</label>
                  <select 
                     className="border border-[var(--border)] rounded px-2 py-1 text-sm bg-white"
                     value={iterations}
                     onChange={e => setIterations(Number(e.target.value))}
                  >
                     <option value={1000}>1 000</option>
                     <option value={5000}>5 000</option>
                     <option value={10000}>10 000</option>
                  </select>
               </div>
           </div>
           
           <p className="text-sm text-[var(--text3)] mb-4">
              Simulering av marknadens anbudsutfall ({iterations} iterationer). Grafen visar chansen att vinna vid olika anbudssummor under tre olika utvärderingskriterier (endast pris, standard med 70% prisfokus, och kvalitetsfokus med 40% prisvikt).
           </p>

           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-md border border-[var(--border)]">
               <div>
                  <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Materialosäkerhet (±%)</label>
                  <input type="number" min="0" max="100" value={uncMat} onChange={e => setUncMat(Number(e.target.value) || 0)} className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-500" />
               </div>
               <div>
                  <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Tids/Arbetsosäkerhet (±%)</label>
                  <input type="number" min="0" max="100" value={uncArb} onChange={e => setUncArb(Number(e.target.value) || 0)} className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-500" />
               </div>
               <div>
                  <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Mängdosäkerhet (±%)</label>
                  <input type="number" min="0" max="100" value={uncVol} onChange={e => setUncVol(Number(e.target.value) || 0)} className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-500" />
               </div>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                 <div className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1"><i className="fa-solid fa-triangle-exclamation"></i> Riskabelt Anbud</div>
                    <div className="text-[10px] lowercase text-red-600 font-normal bg-red-100 px-1.5 py-0.5 rounded" title="Beräknas genom Monte Carlo-simulering av era egna kostnader med hänsyn till vald osäkerhet">90% Säkerhet mot förlust</div>
                 </div>
                 <div className="text-xl font-mono text-red-700">{formatKr(winSimulation.riskabelPrice)}</div>
                 <div className="text-xs text-red-600 mt-1">Säkerhetsmarginal för att undvika förlust baserat på maximerade osäkerheter (90:e percentilen)</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                 <div className="text-xs font-bold uppercase tracking-wider text-green-700 mb-1 flex items-center justify-between">
                   <div className="flex items-center gap-1"><i className="fa-solid fa-bullseye"></i> Bra för marknaden</div>
                   <div className="text-[10px] lowercase text-green-600 font-normal bg-green-100 px-1.5 py-0.5 rounded" title="Beräknas genom Monte Carlo-simulering gentemot marknadsreferens (branschstandard snittpris)">Källa: Estimering</div>
                 </div>
                 <div className="text-xl font-mono text-green-800">{formatKr(winSimulation.braMarknadPrice)}</div>
                 <div className="text-xs text-green-700 mt-1">Balanserat pris med ~50% vinstchans mot branschsnitt ({formatKr(MARKET_REF_PRICE_M3)}/m³)</div>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                 <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1 flex items-center gap-1"><i className="fa-solid fa-ban"></i> För högt (Svårsålt)</div>
                 <div className="text-xl font-mono text-amber-800">{formatKr(winSimulation.tooHighPrice)}</div>
                 <div className="text-xs text-amber-700 mt-1">Låg chanser till vinst (&lt;10%)</div>
              </div>
           </div>

           {/* Beslutsstöd AI / Sammanfattning */}
           {(() => {
              const { ourPrice, riskabelPrice, braMarknadPrice, tooHighPrice } = winSimulation;
              let rec = { title: "", desc: "", icon: "", colorCls: "" };
              
              if (ourPrice < riskabelPrice) {
                rec = {
                  title: "Varning: Hög risk för förlust",
                  desc: `Ert nuvarande anbud (${formatKr(ourPrice)}) ligger under den nödvändiga säkerhetsmarginalen (${formatKr(riskabelPrice)}). Om arbetet tar längre tid eller materialkostnaderna ökar i enlighet med vald osäkerhet, kommer ni troligen att göra en förlust. Överväg att höja priset eller sänka marginalerna på era omkostnader.`,
                  icon: "fa-triangle-exclamation",
                  colorCls: "bg-red-50 text-red-800 border-red-200 shadow-sm shadow-red-100"
                };
              } else if (ourPrice >= riskabelPrice && ourPrice <= (braMarknadPrice * 1.05)) {
                rec = {
                  title: "Bra Balans: Konkurrenskraftigt Anbud",
                  desc: `Ert nuvarande anbud (${formatKr(ourPrice)}) ligger över riskgränsen (${formatKr(riskabelPrice)}) men är ändå konkurrenskraftigt jämfört med marknaden (${formatKr(braMarknadPrice)}). Detta ger er en trygg vinst om ni vinner, samt en god chans (${Math.round(winSimulation.currentBidWinProb)}%) att ta över affären beroende på kvalitetsbedömningen.`,
                  icon: "fa-check-double",
                  colorCls: "bg-green-50 text-green-900 border-green-200 shadow-sm shadow-green-100"
                };
              } else if (ourPrice > (braMarknadPrice * 1.05) && ourPrice <= tooHighPrice) {
                rec = {
                  title: "Över marknadssnitt: Kräver kvalitetsfokus",
                  desc: `Ert nuvarande anbud (${formatKr(ourPrice)}) ligger högre än marknadspriset (${formatKr(braMarknadPrice)}). Chansen att vinna på enbart pris är extremt liten. För att bärga denna affär måste ni presentera starka kvalitetsargument till beställaren.`,
                  icon: "fa-scale-unbalanced",
                  colorCls: "bg-amber-50 text-amber-900 border-amber-200 shadow-sm shadow-amber-100"
                };
              } else {
                rec = {
                  title: "Mycket svårsålt: Översta gränsen passerad",
                  desc: `Ert anbud (${formatKr(ourPrice)}) ligger betydligt högre än vad liknande projekt kostar på dagens marknad (${formatKr(tooHighPrice)} som max). Konkurrensen blir stenhård och chansen att vinna är praktiskt taget obefintlig (<10%). Fundera på om ni har beräknat onödigt lång tid, fel materia eller behöver justera era vinstkrav.`,
                  icon: "fa-ban",
                  colorCls: "bg-orange-50 text-orange-900 border-orange-200 shadow-sm shadow-orange-100"
                };
              }

              return (
                 <div className={`mb-8 p-5 rounded-lg border ${rec.colorCls} flex items-start gap-4 transition-all`}>
                    <div className="mt-1 text-2xl opactiy-90"><i className={`fa-solid ${rec.icon}`}></i></div>
                    <div>
                       <h4 className="font-bold text-base mb-1">{rec.title}</h4>
                       <p className="text-sm leading-relaxed opacity-90">{rec.desc}</p>
                    </div>
                 </div>
              );
           })()}

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Ert aktuella anbud</div>
                 <div className="text-xl font-mono text-slate-800">{formatKr(winSimulation.ourPrice)}</div>
                 <div className="text-xs text-slate-500 mt-1">Önskad kalkyl</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Vinstchans (Endast pris)</div>
                 <div className="text-xl font-mono text-blue-600">
                    {winSimulation.curveData.find(d => Math.abs(d.anbud - winSimulation.ourPrice) < (winSimulation.ourPrice * 0.4 / 30))?.['Endast Pris'] || 0}%
                 </div>
                 <div className="text-xs text-slate-500 mt-1">Om lägst pris vinner</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Vinstchans (Standard)</div>
                 <div className={`text-xl font-mono ${winSimulation.currentBidWinProb > 50 ? 'text-green-600' : 'text-amber-600'}`}>
                    {winSimulation.currentBidWinProb.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                 </div>
                 <div className="text-xs text-slate-500 mt-1">Baserat på 70% pris / 30% mjuka värden</div>
              </div>
           </div>

           <div className="h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={winSimulation.curveData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis 
                   dataKey="anbud" 
                   tickFormatter={(val) => Math.round(val / 1000) + 'k'} 
                   style={{ fontSize: '0.75rem', fill: 'var(--text3)' }}
                 />
                 <YAxis 
                    tickFormatter={(val) => val + '%'}
                    style={{ fontSize: '0.75rem', fill: 'var(--text3)' }}
                 />
                 <Tooltip 
                   formatter={(value: number) => [value + '%', 'Sannolikhet']}
                   labelFormatter={(label) => `Anbud: ${formatKr(Number(label))}`}
                   contentStyle={{ fontSize: '0.8rem', borderRadius: '8px' }}
                 />
                 <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
                 <Bar dataKey="Endast Pris" fill="#ef4444" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="Standardvärdering (70/30)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="Kvalitetsfokus (40/60)" fill="#10b981" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
         {trendData.length > 0 && (
           <div className="card p-6 border-t-4 border-t-sky-500">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <i className="fa-solid fa-chart-area text-sky-500"></i> Trendanalys
              </h3>
              <p className="text-xs text-[var(--text3)] mb-6 min-h-[40px]">
                 Historisk utveckling av anbudssummor jämfört med kostnader och vinst.
              </p>
              
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      style={{ fontSize: '0.75rem', fill: 'var(--text3)' }} 
                    />
                    <YAxis 
                      tickFormatter={(val) => Math.round(val / 1000) + 'k'} 
                      style={{ fontSize: '0.75rem', fill: 'var(--text3)' }} 
                    />
                    <Tooltip 
                      formatter={(value: number) => formatKr(value)}
                      contentStyle={{ fontSize: '0.8rem', borderRadius: '8px' }}
                      labelStyle={{ color: 'var(--text2)', fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="anbud" name="Anbudssumma" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="kostnad" name="Kostnad" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="vinst" name="Vinst" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </div>
         )}

         <div className="card p-6 border-t-4 border-t-amber-500">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
               <i className="fa-solid fa-tornado text-amber-500"></i> Känslighetsanalys (+10% kostnad)
            </h3>
            <p className="text-xs text-[var(--text3)] mb-6 min-h-[40px]">
               Visar potentiellt tapp i vinst om en utgiftspost (material, arbete, eller omkostnader) ökar med 10%.
            </p>
            
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sensitivityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" 
                    tickFormatter={(val) => formatKr(val)}
                    style={{ fontSize: '0.75rem', fill: 'var(--text3)' }} 
                  />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} style={{ fontSize: '0.75rem', fill: 'var(--text2)' }} />
                  <Tooltip 
                     formatter={(value: number) => [formatKr(value), 'Minus i vinst']}
                     contentStyle={{ fontSize: '0.8rem', borderRadius: '8px' }}
                  />
                  <Bar dataKey="impact" fill="#f59e0b" radius={[4, 0, 0, 4]} barSize={24}>
                     {sensitivityData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.impact < 0 ? '#ef4444' : '#10b981'} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>

    </div>
  );
}
