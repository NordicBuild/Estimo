import { expect, test, describe } from 'vitest';
import { presetScale, deriveScale, toRealDistance, toRealArea, toMeters, ratioFromScale } from '../pdf/scaleHelpers';

describe('scaleHelpers', () => {
  test('presetScale(100) ger pixelsPerUnit = 72 / (0.0254 * 100) och unitLabel m', () => {
    const scale = presetScale(100);
    expect(scale.pixelsPerUnit).toBeCloseTo(72 / (0.0254 * 100), 5);
    expect(scale.unitLabel).toBe('m');
  });

  test('presetScale(0) och deriveScale(0, 5) ger invalid: true och pixelsPerUnit 0', () => {
    const scale1 = presetScale(0);
    expect(scale1.invalid).toBe(true);
    expect(scale1.pixelsPerUnit).toBe(0);

    const scale2 = deriveScale(0, 5);
    expect(scale2.invalid).toBe(true);
    expect(scale2.pixelsPerUnit).toBe(0);
  });

  test('deriveScale(200, 4) ger pixelsPerUnit 50 (200 px = 4 m)', () => {
    const scale = deriveScale(200, 4);
    expect(scale.pixelsPerUnit).toBe(50);
  });

  test('toRealDistance och toRealArea returnerar 0 när pixelsPerUnit <= 0', () => {
    expect(toRealDistance(100, 0)).toBe(0);
    expect(toRealDistance(100, -10)).toBe(0);
    
    expect(toRealArea(1000, 0)).toBe(0);
    expect(toRealArea(1000, -5)).toBe(0);
  });

  test('toMeters(300, mm) = 0.3 och toMeters(1, ft) ≈ 0.3048', () => {
    expect(toMeters(300, 'mm')).toBe(0.3);
    expect(toMeters(1, 'ft')).toBeCloseTo(0.3048, 4);
  });

  test('ratioFromScale(presetScale(50)) ≈ 50 (rundtur)', () => {
    const scale = presetScale(50);
    const ratio = ratioFromScale(scale);
    expect(ratio).toBeCloseTo(50, 4);
  });
});
