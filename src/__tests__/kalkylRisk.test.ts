import { describe, it, expect } from 'vitest';
import { radRisk, summeraRisk, RiskRad } from '../kalkyl/kalkylRisk';

describe('kalkylRisk', () => {
  it("radRisk med bas 1000, sakerhet 'medel' (spann 0.15) ger p85 ≈ 1155", () => {
    const rad: RiskRad = { key: 'test', bas: 1000, sakerhet: 'medel' };
    const { p85 } = radRisk(rad);
    expect(p85).toBeCloseTo(1155.4, 1);
  });

  it("summeraRisk slår ihop oberoende rader i kvadrat (portföljspann smalare än summan av radspann) och ger sakerhetstal 0..1", () => {
    const rader: RiskRad[] = [
      { key: 'r1', bas: 1000, sakerhet: 'medel' }, // sigma = 150
      { key: 'r2', bas: 1000, sakerhet: 'medel' }  // sigma = 150
    ];
    // sumP50 = 2000
    // sumVar = 150^2 + 150^2 = 22500 + 22500 = 45000
    // totalSigma = sqrt(45000) = 212.13
    // p85 = 2000 + 1.036 * 212.13 = 2219.77
    const result = summeraRisk(rader);
    expect(result.p50).toBe(2000);
    expect(result.p85).toBeLessThan(1155.4 * 2); // 2310.8 -> portföljeffekten gör det smalare
    expect(result.p85).toBeCloseTo(2219.77, 1);
    expect(result.sakerhetstal).toBeGreaterThan(0);
    expect(result.sakerhetstal).toBeLessThan(1);
    expect(result.sakerhetstal).toBeCloseTo(1 - (Math.sqrt(45000) / 2000), 4);
  });
});
