export interface ReceptMaterial {
  id: string;
  atgang: number;
  spill: number;
  aPris: number;
  co2PerEnhet: number;
}

export interface ReceptArbete {
  id: string;
  atgang: number;
  aPris: number;
}

export interface Recept {
  id: string;
  byggdelType?: string;
  mangd: number;
  material: ReceptMaterial[];
  arbete: ReceptArbete[];
}

export function receptStyckkostnad(recept: Recept): { material: number; arbete: number; total: number } {
  let material = 0;
  for (const m of recept.material) {
    material += m.atgang * (1 + m.spill) * m.aPris;
  }
  let arbete = 0;
  for (const a of recept.arbete) {
    arbete += a.atgang * a.aPris;
  }
  return { material, arbete, total: material + arbete };
}

export function receptCo2PerEnhet(recept: Recept): number {
  let co2 = 0;
  for (const m of recept.material) {
    co2 += m.atgang * (1 + m.spill) * m.co2PerEnhet;
  }
  return co2;
}

export function expandRecept(recept: Recept) {
  if (!recept.byggdelType) {
    throw new Error('byggdelType saknas');
  }

  const materialOverrides: Record<string, { unitPrice: number; co2PerEnhet: number }> = {};
  for (const m of recept.material) {
    materialOverrides[m.id] = {
      unitPrice: m.aPris,
      co2PerEnhet: m.co2PerEnhet
    };
  }

  return {
    qty: recept.mangd,
    type: recept.byggdelType,
    materialOverrides
  };
}

export function serializeRecept(recepts: Recept[]): string {
  try {
    return JSON.stringify(recepts);
  } catch {
    return '[]';
  }
}

export function deserializeRecept(str: string): Recept[] {
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}
