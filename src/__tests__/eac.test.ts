import { describe, it, expect } from 'vitest';
import { computeRadEac, computeEac, eacStatus } from '../eac/eac';

describe('eac', () => {
  it('computeRadEac med cpi', () => {
    const res = computeRadEac({
      bac: 100000,
      ac: 60000,
      fardiggrad: 0.5,
      metod: 'cpi'
    });
    
    expect(res.ev).toBe(50000);
    expect(res.cpi).toBeCloseTo(0.833333, 4);
    expect(res.eac).toBeCloseTo(120000);
    expect(res.etc).toBeCloseTo(60000);
    expect(res.vac).toBeCloseTo(-20000);
  });

  it('computeRadEac med kvarvarande-budget', () => {
    const res = computeRadEac({
      bac: 100000,
      ac: 60000,
      fardiggrad: 0.5,
      metod: 'kvarvarande-budget'
    });
    
    expect(res.eac).toBe(110000); // 60000 + 50000
  });

  it('computeRadEac med fardiggrad 0 faller tillbaka', () => {
    const res = computeRadEac({
      bac: 100000,
      ac: 10000,
      fardiggrad: 0,
      metod: 'cpi'
    });
    
    expect(res.cpi).toBeNull();
    expect(res.eac).toBe(110000); // 10000 + 100000
  });

  it('computeEac aggregerar poster', () => {
    const res = computeEac([
      { bac: 100000, ac: 60000, fardiggrad: 0.5, metod: 'cpi' },
      { bac: 50000, ac: 10000, fardiggrad: 0.2, metod: 'kvarvarande-budget' }
    ]);
    
    // P1: EV=50k, EAC=120k
    // P2: EV=10k, EAC=10k + (50k-10k) = 50k
    // Tot: BAC=150k, AC=70k, EV=60k, EAC=170k, ETC=100k, VAC=-20k
    expect(res.ev).toBe(60000);
    expect(res.cpi).toBeCloseTo(60000 / 70000);
    expect(res.eac).toBe(170000);
    expect(res.etc).toBe(100000);
    expect(res.vac).toBe(-20000);
  });

  it('eacStatus utvärderar avvikelse mot tolerans', () => {
    expect(eacStatus(100, 50)).toBe('over');
    expect(eacStatus(-100, 50)).toBe('under');
    expect(eacStatus(10, 50)).toBe('ok');
  });
});
