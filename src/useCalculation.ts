import { useMemo } from 'react';
import { Byggdel, Material, Tidsfaktor } from './data';
import { INITIAL_TIDSFAKTORER, TYPE_UNIT } from './data';

export type CalculationResult = {
  parts: (Byggdel & { 
    vol: number; 
    area: number; 
    tim: number; 
    costNetto: number; 
    matNetto: number; 
    arbNetto: number; 
    unit: string;
    moments: (Byggdel['moments'][0] & { hrs?: number; cost?: number; matUnit?: string })[];
  })[];
  materialsSummary: { name: string; cat: string; qty: number; unit: string; costNetto: number; previousPrice?: number }[];
  momentsSummary: { label: string; hours: number; costNetto: number }[];
  totArb: number;
  totMat: number;
  totTim: number;
  totVol: number;
  totArea: number;
  omkOrg: number;
  omkMaskin: number;
  omkForbr: number;
  omkTrakt: number;
  omkTot: number;
  projNetto: number;
  vMatKr: number;
  vArbKr: number;
  vTot: number;
  anbud: number;
  tg1: number;
  tb1: number;
  avgObjFactor: number;
};

export function useCalculation(
  byggdelar: Byggdel[],
  materials: Material[],
  fOrg = 0,
  fForbr = 0,
  tRate = 0,
  mRate = 0,
  trRate = 0,
  vMatP = 0,
  vArbP = 0,
  timeFactor = 1.0
): CalculationResult {
  return useMemo(() => {
    let totArb = 0, totMat = 0, totTim = 0, totVol = 0, totArea = 0;
    let totVMatKr = 0, totVArbKr = 0;
    const matMap = new Map<string, { cat: string; qty: number; unit: string; cost: number; previousPrice?: number }>();
    const momMap = new Map<string, { hours: number; cost: number }>();

    const parts = byggdelar.map(b => {
      const isActive = b.active !== false;
      let bVol = 0, bArea = 0, bTim = 0, bMat = 0, bArb = 0;
      const bQty = (b.qty || 1) * (b.antal || 1);
      const tf = INITIAL_TIDSFAKTORER.find(t => t.type === b.type) || { faktor: 1.0 };
      const currentTF = b.timeFactor !== undefined ? b.timeFactor : timeFactor;

      const calcMoments = (b.moments || []).map(m => {
        if (m.active === false) return { ...m, hrs: 0, cost: 0, matUnit: '' };
        const mat = materials.find(x => x.name === m.material) || materials[0];
        if (!mat) return { ...m, hrs: 0, cost: 0, matUnit: '' };
        
        const qty = (m.amount || 0) * bQty;
        const tid = m.timeUnit || 0;
        const spill = 1 + (mat.spill || 0) / 100;
        
        const netMat = qty * mat.price * spill;
        // Apply timeFactor and objFactor here
        const hrs = qty * tid * tf.faktor * currentTF * (b.objFactor || 1.0);
        const netArb = hrs * tRate;
        
        if (mat.unit === 'm³') bVol += qty;
        if (mat.unit === 'm²') bArea += qty;
        bTim += hrs;
        bMat += netMat;
        bArb += netArb;

        if (isActive) {
          if (!matMap.has(mat.name)) {
            let previousPrice = undefined;
            if (mat.priceHistory && mat.priceHistory.length > 1) {
               // Find second latest price or price from a year ago
               const sorted = [...mat.priceHistory].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
               if (sorted.length > 1) previousPrice = sorted[1].price;
            }
            matMap.set(mat.name, { cat: mat.cat, qty: 0, unit: mat.unit, cost: 0, previousPrice });
          }
          const mData = matMap.get(mat.name)!;
          mData.qty += qty;
          mData.cost += netMat;

          if (!momMap.has(m.label)) {
            momMap.set(m.label, { hours: 0, cost: 0 });
          }
          const momData = momMap.get(m.label)!;
          momData.hours += hrs;
          momData.cost += netArb;
        }

        return { ...m, hrs, cost: netArb + netMat, matUnit: mat.unit };
      });

      const bCost = bMat + bArb;
      const unit = TYPE_UNIT[b.type] || 'st';

      if (isActive) {
        totVol += bVol; 
        totArea += bArea;
        totTim += bTim; 
        totArb += bArb; 
        totMat += bMat;
        totVMatKr += bMat * (b.vMatP !== undefined ? b.vMatP : vMatP);
        totVArbKr += bArb * (b.vArbP !== undefined ? b.vArbP : vArbP);
      }

      return {
        ...b,
        moments: calcMoments,
        unit,
        vol: bVol,
        area: bArea,
        tim: bTim,
        costNetto: bCost,
        matNetto: bMat,
        arbNetto: bArb
      };
    });

    const materialsSummary = Array.from(matMap.entries()).map(([name, data]) => ({
      name,
      cat: data.cat,
      qty: data.qty,
      unit: data.unit,
      costNetto: data.cost,
      previousPrice: data.previousPrice
    })).sort((a, b) => b.costNetto - a.costNetto);

    const momentsSummary = Array.from(momMap.entries()).map(([label, data]) => ({
      label,
      hours: data.hours,
      costNetto: data.cost
    })).sort((a, b) => b.costNetto - a.costNetto);

    const omkOrg = (totArb + totMat) * fOrg;
    const omkMaskin = totTim * mRate;
    const omkForbr = totMat * fForbr;
    const omkTrakt = totTim * trRate;
    
    const omkTot = omkOrg + omkMaskin + omkForbr + omkTrakt;
    const projNetto = totArb + totMat + omkTot;
    
    const vMatKr = totVMatKr;
    const vArbKr = totVArbKr;
    const vTot = vMatKr + vArbKr;
    
    const anbud = projNetto + vTot;
    const tg1 = anbud > 0 ? (vTot / anbud) * 100 : 0;
    const tb1 = vTot + omkOrg;

    const activeParts = parts.filter(p => p.active !== false);
    const avgObjFactor = activeParts.length > 0 
       ? activeParts.reduce((acc, curr) => acc + (curr.objFactor || 1.0), 0) / activeParts.length 
       : 1.0;

    return {
      parts,
      materialsSummary,
      momentsSummary,
      totArb,
      totMat,
      totTim,
      totVol,
      totArea,
      omkOrg,
      omkMaskin,
      omkForbr,
      omkTrakt,
      omkTot,
      projNetto,
      vMatKr,
      vArbKr,
      vTot,
      anbud,
      tg1,
      tb1,
      avgObjFactor
    };
  }, [byggdelar, materials, fOrg, fForbr, tRate, mRate, trRate, vMatP, vArbP, timeFactor]);
}
