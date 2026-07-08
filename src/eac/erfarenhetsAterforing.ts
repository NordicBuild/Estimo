export interface ErfarenhetsSample {
  kalkyladTimmar: number;
  utfallTimmar: number;
}

export function harledFaktorer(samples: ErfarenhetsSample[]): number {
  let sumKalkyl = 0;
  let sumUtfall = 0;
  
  for (const s of samples) {
    if (s.kalkyladTimmar <= 0) continue;
    sumKalkyl += s.kalkyladTimmar;
    sumUtfall += s.utfallTimmar;
  }
  
  if (sumKalkyl === 0) return 1.0;
  return sumUtfall / sumKalkyl;
}

export function appliceraFaktor(timmarPerEnhet: number, historiskFaktor: number, trohet: number): number {
  const weightedFactor = (1.0 * (1 - trohet)) + (historiskFaktor * trohet);
  return timmarPerEnhet * weightedFactor;
}

export function uppdateraTidsfaktorer(
  befintligaFaktorer: Record<string, number>,
  forslag: Record<string, { samples: ErfarenhetsSample[] }>,
  minN: number = 5
): Record<string, number> {
  const uppdaterade = { ...befintligaFaktorer };
  
  for (const [key, data] of Object.entries(forslag)) {
    const validSamples = data.samples.filter(s => s.kalkyladTimmar > 0);
    if (validSamples.length >= minN) {
      uppdaterade[key] = harledFaktorer(validSamples);
    }
  }
  
  return uppdaterade;
}
