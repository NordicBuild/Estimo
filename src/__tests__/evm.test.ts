import { describe, it, expect } from 'vitest';
import { fasaPlaneratVarde, sKurvaVikter, byggEvmKurvor, evmMatt } from '../tidplan/evm';
import { aktivitetPlaneratVarde, TidplanAktivitet } from '../tidplan/tidplan';
import { Byggdel } from '../data';

describe('evm', () => {
  it('fasaPlaneratVarde linjärt över period 1–3 av 60000 => [0,20000,20000,20000]', () => {
    const arr = fasaPlaneratVarde(1, 3, 60000, 4);
    expect(arr).toEqual([0, 20000, 20000, 20000]);
  });

  it('sKurvaVikter(3) summerar till 1 och är symmetrisk med max i mitten', () => {
    const w = sKurvaVikter(3);
    expect(w.length).toBe(3);
    const sum = w.reduce((a,b)=>a+b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(w[0]).toBeCloseTo(w[2], 5);
    expect(w[1]).toBeGreaterThan(w[0]);
  });

  it('byggEvmKurvor med två aktiviteter ger BAC = summan av planerade värden', () => {
    const act1 = { startPeriod: 0, endPeriod: 1, budget: 1000 };
    const act2 = { startPeriod: 1, endPeriod: 2, budget: 2000 };
    const { bac, pv } = byggEvmKurvor([act1, act2], 3);
    
    expect(bac).toBe(3000);
    expect(pv[0]).toBe(500); // 1000/2
    expect(pv[1]).toBe(500 + 1000); // 1000/2 + 2000/2
    expect(pv[2]).toBe(1000); // 2000/2
  });

  it('evmMatt vid period 1: CPI = EV/AC, SPI = EV/PV, EAC = BAC/CPI', () => {
    // PV = 100, EV = 80, AC = 90, BAC = 1000
    const { cpi, spi, eac } = evmMatt(100, 80, 90, 1000);
    expect(cpi).toBe(80/90);
    expect(spi).toBe(80/100);
    expect(eac).toBe(1000 / (80/90));
  });

  it('aktivitetPlaneratVarde summerar länkade byggdelars kostnad', () => {
    const act: TidplanAktivitet = {
      id: 'a1',
      name: 'Test',
      startPeriod: 1,
      endPeriod: 2,
      linkedByggdelar: [1, 2]
    };
    const byggdelar: Byggdel[] = [
      { id: 1 } as Byggdel,
      { id: 2 } as Byggdel,
      { id: 3 } as Byggdel
    ];
    const calcResult = {
      parts: [
        { id: 1, costNetto: 1000 },
        { id: 2, costNetto: 2000 },
        { id: 3, costNetto: 500 }
      ]
    };

    const cost = aktivitetPlaneratVarde(act, byggdelar, calcResult);
    expect(cost).toBe(3000);
  });
});
