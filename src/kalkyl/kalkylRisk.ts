export type SakerhetsNiva = 'låg' | 'medel' | 'hög';

export interface RiskRad {
  key: string;
  bas: number;
  sakerhet?: SakerhetsNiva;
}

const SPANN = {
  'låg': 0.05,
  'medel': 0.15,
  'hög': 0.30
};

export function radRisk(rad: RiskRad) {
  const spann = SPANN[rad.sakerhet || 'medel'] || 0.15;
  const p50 = rad.bas;
  const sigma = p50 * spann;
  // Z-score for 85th percentile is approx 1.036
  const p85 = p50 + 1.036 * sigma;
  return { p50, p85, sigma };
}

export function summeraRisk(rader: RiskRad[]) {
  let sumP50 = 0;
  let sumVar = 0;
  
  for (const rad of rader) {
    const { p50, sigma } = radRisk(rad);
    sumP50 += p50;
    sumVar += sigma * sigma;
  }
  
  const totalSigma = Math.sqrt(sumVar);
  const p85 = sumP50 + 1.036 * totalSigma;
  
  const sakerhetstal = sumP50 > 0 ? Math.max(0, 1 - totalSigma / sumP50) : 1;
  
  return { p50: sumP50, p85, sakerhetstal };
}
