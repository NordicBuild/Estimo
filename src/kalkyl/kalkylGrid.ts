import { Byggdel, Material } from '../data';
import { computeByggdelCo2, computeRowCo2 } from '../climate/co2';

export type GridRowKind = 'section' | 'line' | 'add-moment';

export interface GridRow {
  kind: GridRowKind;
  byggdelId: number;
  momentIndex?: number;
  part: any; // the enriched part from calcResult
  moment?: any;
  
  // Flattened for easy access
  name: string;
  active: boolean;
  type?: string;
  qty?: number;
  antal?: number;
  material?: string;
  amount?: number;
  unitPrice?: number;
  timeUnit?: number;
  
  // Summary/Computed values
  matCost?: number;
  arbCost?: number;
  totalCost?: number;
  co2?: number;
  
  // Helpers
  isCollapsed?: boolean;
}

export function buildGridRows(
  parts: any[], 
  materialsMap: Map<string, Material>, 
  showInactiveMoments: boolean
): GridRow[] {
  const rows: GridRow[] = [];
  
  for (const part of parts) {
    const isCollapsed = part.collapsed === true;
    const isPartActive = part.active !== false;
    
    // Compute total CO2 for the part
    const partCo2 = computeByggdelCo2(part, materialsMap);
    
    rows.push({
      kind: 'section',
      byggdelId: part.id,
      part,
      name: part.name,
      active: isPartActive,
      type: part.type,
      qty: part.qty || 1,
      antal: part.antal || 1,
      matCost: part.matNetto || 0,
      arbCost: part.arbNetto || 0,
      totalCost: part.costNetto || 0,
      co2: partCo2,
      isCollapsed
    });
    
    if (!isCollapsed) {
      const moments = part.moments || [];
      for (let i = 0; i < moments.length; i++) {
        const m = moments[i];
        const isMomentActive = m.active !== false;
        
        if (!isMomentActive && !showInactiveMoments) {
          continue; // skip if hidden
        }
        
        let rowCo2 = 0;
        if (m.material) {
          const mat = materialsMap.get(m.material);
          if (mat) {
             rowCo2 = computeRowCo2(m.amount, (part.qty || 1) * (part.antal || 1), mat);
          }
        }
        
        rows.push({
          kind: 'line',
          byggdelId: part.id,
          momentIndex: i,
          part,
          moment: m,
          name: m.label,
          active: isMomentActive,
          material: m.material,
          amount: m.amount,
          unitPrice: m.unitPrice,
          timeUnit: m.timeUnit,
          matCost: m.matNetto || 0,
          arbCost: m.arbNetto || 0,
          totalCost: m.cost || 0,
          co2: rowCo2
        });
      }
      
      // Add "Lägg till moment" row
      rows.push({
        kind: 'add-moment',
        byggdelId: part.id,
        part,
        name: '',
        active: true
      });
    }
  }
  
  return rows;
}
