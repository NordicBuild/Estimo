import { Byggdel, Material } from '../data';

export const EXAMPLE_CO2_FACTORS: Record<string, number> = {
  // kg CO2e per unit (usually per m3, kg, st, etc. matching the material's unit)
  'Betong C28/35': 280,   // kg CO2e / m3
  'Betong C32/40': 320,   // kg CO2e / m3
  'Betong C35/45': 350,   // kg CO2e / m3
  'Armeringsnät': 1.1,    // kg CO2e / kg
  'Armeringsstål': 1.2,   // kg CO2e / kg
  'Formvirke': 0.8,       // kg CO2e / m
  'Plywood': 5.5,         // kg CO2e / m2
  'Cellplast EPS': 4.5,   // kg CO2e / m2
  'Makadam': 0.05         // kg CO2e / ton
};

export type Co2Breakdown = {
  total: number;
  byMaterial: Record<string, number>;
  byCategory: Record<string, number>;
};

export function computeTotalCo2(byggdelar: Byggdel[], materials: Material[]): Co2Breakdown {
  const result: Co2Breakdown = {
    total: 0,
    byMaterial: {},
    byCategory: {}
  };

  const matMap = new Map<string, Material>();
  for (const m of materials) {
    matMap.set(m.name, m);
  }

  for (const b of byggdelar) {
    if (b.active === false) continue;
    const bQty = (b.qty || 1) * (b.antal || 1);

    for (const m of (b.moments || [])) {
      if (m.active === false) continue;
      const mat = matMap.get(m.material);
      if (!mat || !mat.co2PerUnit) continue;

      const qty = (m.amount || 0) * bQty;
      const spill = 1 + (mat.spill || 0) / 100;
      
      const totalMatQty = qty * spill;
      const co2ForMoment = totalMatQty * mat.co2PerUnit;

      result.total += co2ForMoment;
      result.byMaterial[mat.name] = (result.byMaterial[mat.name] || 0) + co2ForMoment;
      result.byCategory[mat.cat] = (result.byCategory[mat.cat] || 0) + co2ForMoment;
    }
  }

  return result;
}

export function materialsMissingCo2(byggdelar: Byggdel[], materials: Material[]): string[] {
  const missing = new Set<string>();
  const matMap = new Map<string, Material>();
  for (const m of materials) {
    matMap.set(m.name, m);
  }

  for (const b of byggdelar) {
    if (b.active === false) continue;
    for (const m of (b.moments || [])) {
      if (m.active === false) continue;
      const mat = matMap.get(m.material);
      if (!mat || typeof mat.co2PerUnit !== 'number') {
        missing.add(m.material);
      }
    }
  }

  return Array.from(missing).sort();
}

export function computeByggdelCo2(byggdel: Byggdel, materialsMap: Map<string, Material>): number {
  if (byggdel.active === false) return 0;
  const bQty = (byggdel.qty || 1) * (byggdel.antal || 1);
  let totalCo2 = 0;

  for (const m of (byggdel.moments || [])) {
    if (m.active === false) continue;
    const mat = materialsMap.get(m.material);
    if (!mat || !mat.co2PerUnit) continue;
    
    totalCo2 += computeRowCo2(m.amount, bQty, mat);
  }
  return totalCo2;
}

export function computeRowCo2(amount: number = 0, bQty: number = 1, mat: Material): number {
  if (!mat.co2PerUnit) return 0;
  const qty = amount * bQty;
  const spill = 1 + (mat.spill || 0) / 100;
  return qty * spill * mat.co2PerUnit;
}
