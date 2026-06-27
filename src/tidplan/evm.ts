import { TidplanAktivitet, aktivitetPlaneratVarde } from './tidplan';
import { Byggdel } from '../data';

export function fasaPlaneratVarde(startPeriod: number, endPeriod: number, totalCost: number, length: number): number[] {
  const result = new Array(length).fill(0);
  const duration = endPeriod - startPeriod + 1;
  if (duration <= 0) return result;
  
  const costPerPeriod = totalCost / duration;
  for (let i = startPeriod; i <= endPeriod; i++) {
    if (i < length) {
      result[i] = costPerPeriod;
    }
  }
  return result;
}

export function sKurvaVikter(duration: number): number[] {
  if (duration <= 0) return [];
  if (duration === 1) return [1];
  
  const weights = [];
  let sum = 0;
  for (let i = 0; i < duration; i++) {
    // 0 to PI mapping for symmetric curve with max in middle
    const x = Math.PI * (i + 0.5) / duration;
    const w = Math.sin(x);
    weights.push(w);
    sum += w;
  }
  
  return weights.map(w => w / sum);
}

export interface ActivityEvmData {
  budget: number; // Planerat värde
  startPeriod: number;
  endPeriod: number;
  acPerPeriod?: number[]; // Actual cost
  evPerPeriod?: number[]; // Earned value
}

export function byggEvmKurvor(activities: ActivityEvmData[], length: number) {
  const pv = new Array(length).fill(0);
  const ev = new Array(length).fill(0);
  const ac = new Array(length).fill(0);

  let bac = 0;

  for (const act of activities) {
    bac += act.budget;
    const pvFas = fasaPlaneratVarde(act.startPeriod, act.endPeriod, act.budget, length);
    
    for (let i = 0; i < length; i++) {
      pv[i] += pvFas[i];
      if (act.acPerPeriod && i < act.acPerPeriod.length) {
        ac[i] += act.acPerPeriod[i];
      }
      if (act.evPerPeriod && i < act.evPerPeriod.length) {
        ev[i] += act.evPerPeriod[i];
      }
    }
  }

  return { pv, ev, ac, bac };
}

export function evmMatt(pvCum: number, evCum: number, acCum: number, bac: number) {
  const cpi = acCum > 0 ? evCum / acCum : (evCum > 0 ? Infinity : 1);
  const spi = pvCum > 0 ? evCum / pvCum : (evCum > 0 ? Infinity : 1);
  
  let eac = bac;
  if (cpi > 0 && cpi !== Infinity) {
    eac = bac / cpi;
  } else if (cpi === Infinity) {
    eac = acCum; // Extremely efficient, remaining budget might not be applicable directly, fallback to AC
  }
  
  return { cpi, spi, eac, bac };
}
