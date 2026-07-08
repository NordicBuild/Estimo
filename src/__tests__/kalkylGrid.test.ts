import { describe, it, expect } from 'vitest';
import { buildGridRows } from '../kalkyl/kalkylGrid';
import { Material } from '../data';

describe('buildGridRows', () => {
  const mockMaterialsMap = new Map<string, Material>([
    ['Trä', { name: 'Trä', unit: 'lpm', price: 10, co2PerUnit: 2, spill: 0, cat: 'Bygg', konto: "1234" }]
  ]);

  it('creates a section row followed by line rows and an add-moment row', () => {
    const parts = [
      {
        id: 1,
        name: 'Vägg',
        active: true,
        collapsed: false,
        qty: 1,
        antal: 1,
        matNetto: 100,
        arbNetto: 200,
        costNetto: 300,
        moments: [
          { label: 'Regla', active: true, amount: 10, material: 'Trä', matNetto: 50, arbNetto: 100, cost: 150 },
          { label: 'Gipsa', active: true, amount: 5, matNetto: 50, arbNetto: 100, cost: 150 }
        ]
      }
    ];

    const rows = buildGridRows(parts, mockMaterialsMap, false);
    
    // 1 section + 2 lines + 1 add-moment = 4 rows
    expect(rows.length).toBe(4);
    
    expect(rows[0].kind).toBe('section');
    expect(rows[0].name).toBe('Vägg');
    
    expect(rows[1].kind).toBe('line');
    expect(rows[1].name).toBe('Regla');
    
    expect(rows[2].kind).toBe('line');
    expect(rows[2].name).toBe('Gipsa');
    
    expect(rows[3].kind).toBe('add-moment');
  });

  it('hides inactive moments when showInactiveMoments is false', () => {
    const parts = [
      {
        id: 1,
        name: 'Vägg',
        active: true,
        collapsed: false,
        qty: 1,
        antal: 1,
        matNetto: 100,
        arbNetto: 200,
        costNetto: 300, // Total is unchanged by inactive moment presentation
        moments: [
          { label: 'Regla', active: true, amount: 10, matNetto: 100, arbNetto: 200, cost: 300 },
          { label: 'Gipsa', active: false, amount: 5, matNetto: 0, arbNetto: 0, cost: 0 }
        ]
      }
    ];

    const rows = buildGridRows(parts, mockMaterialsMap, false);
    
    // 1 section + 1 active line + 1 add-moment = 3 rows
    expect(rows.length).toBe(3);
    
    const lines = rows.filter(r => r.kind === 'line');
    expect(lines.length).toBe(1);
    expect(lines[0].name).toBe('Regla');
    
    // The section costNetto is unchanged
    expect(rows[0].totalCost).toBe(300);
  });

  it('hides all line rows when building is collapsed (collapsed: true)', () => {
    const parts = [
      {
        id: 1,
        name: 'Vägg',
        active: true,
        collapsed: true,
        qty: 1,
        antal: 1,
        moments: [
          { label: 'Regla', active: true },
          { label: 'Gipsa', active: true }
        ]
      }
    ];

    const rows = buildGridRows(parts, mockMaterialsMap, false);
    
    // Only section row should be returned when collapsed
    expect(rows.length).toBe(1);
    expect(rows[0].kind).toBe('section');
    expect(rows[0].isCollapsed).toBe(true);
  });

  it('calculates the total as the sum of active parts sub-totals', () => {
    const parts = [
      {
        id: 1,
        name: 'Vägg 1',
        active: true, // active
        collapsed: true,
        costNetto: 300,
        moments: []
      },
      {
        id: 2,
        name: 'Vägg 2',
        active: false, // inactive
        collapsed: true,
        costNetto: 200,
        moments: []
      },
      {
        id: 3,
        name: 'Vägg 3',
        active: true, // active
        collapsed: true,
        costNetto: 150,
        moments: []
      }
    ];

    const rows = buildGridRows(parts, mockMaterialsMap, false);
    
    expect(rows.length).toBe(3);
    
    // We only check that the rows mapped correctly and total is sum of active parts
    const total = rows.filter(r => r.kind === 'section' && r.active).reduce((sum, r) => sum + (r.totalCost || 0), 0);
    expect(total).toBe(450); // 300 + 150
  });
});
