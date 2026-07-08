export type EacMetod = 'cpi' | 'kvarvarande-budget' | 'manuell';

export interface RadEacInput {
  bac: number; // Budget at Completion
  ac: number;  // Actual Cost
  fardiggrad: number; // 0.0 to 1.0
  metod: EacMetod;
  manuell_eac?: number; // Only used if metod === 'manuell'
}

export interface RadEacOutput {
  ev: number;  // Earned Value
  cpi: number | null; // Cost Performance Index
  eac: number; // Estimate at Completion
  etc: number; // Estimate to Complete
  vac: number; // Variance at Completion
}

export function computeRadEac(input: RadEacInput): RadEacOutput {
  const ev = input.bac * input.fardiggrad;
  
  let cpi: number | null = null;
  if (input.ac > 0 && input.fardiggrad > 0) {
    cpi = ev / input.ac;
  }
  
  let eac = 0;
  if (input.metod === 'manuell' && input.manuell_eac != null) {
    eac = input.manuell_eac;
  } else if (input.fardiggrad === 0) {
    eac = input.ac + input.bac;
  } else if (input.metod === 'cpi' && cpi !== null && cpi !== 0) {
    eac = input.bac / cpi;
  } else {
    eac = input.ac + (input.bac - ev);
  }
  
  const etc = eac - input.ac;
  const vac = input.bac - eac;
  
  return { ev, cpi, eac, etc, vac };
}

export function computeEac(poster: RadEacInput[]): RadEacOutput {
  let totalBac = 0;
  let totalAc = 0;
  let totalEv = 0;
  let totalEac = 0;
  
  for (const p of poster) {
    const r = computeRadEac(p);
    totalBac += p.bac;
    totalAc += p.ac;
    totalEv += r.ev;
    totalEac += r.eac;
  }
  
  let cpi: number | null = null;
  if (totalAc > 0 && totalEv > 0) {
    cpi = totalEv / totalAc;
  }
  
  const etc = totalEac - totalAc;
  const vac = totalBac - totalEac;
  
  return { ev: totalEv, cpi, eac: totalEac, etc, vac };
}

export function eacStatus(avvikelse: number, tolerans: number): 'over' | 'under' | 'ok' {
  if (avvikelse > tolerans) return 'over';
  if (avvikelse < -tolerans) return 'under';
  return 'ok';
}
