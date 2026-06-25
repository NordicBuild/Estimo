import { describe, it, expect } from 'vitest';
import { buildByggdelGeometry } from '../components/byggdelGeometry';

describe('buildByggdelGeometry', () => {
  it('returns at least one part and positive bounds for 31.2_Vagg', () => {
    const parts = buildByggdelGeometry('31.2_Vagg', { length: 4, height: 3, wallThickness: 0.2 });
    
    expect(parts.length).toBeGreaterThanOrEqual(1);
    
    const part = parts[0];
    expect(part.size[0]).toBeGreaterThan(0);
    expect(part.size[1]).toBeGreaterThan(0);
    expect(part.size[2]).toBeGreaterThan(0);
  });

  it('returns 5 parts for 35.1_Trappa with stepCount 5', () => {
    const parts = buildByggdelGeometry('35.1_Trappa', { 
      stepCount: 5, 
      stepWidth: 1.2, 
      stepHeight: 0.15, 
      stepDepth: 0.3 
    });
    
    expect(parts.length).toBe(5);
    
    // Verify first step properties
    expect(parts[0].label).toBe('Steg 1');
    expect(parts[0].size).toEqual([1.2, 0.15, 0.3]);
    
    // Verify last step label
    expect(parts[4].label).toBe('Steg 5');
  });

  it('falls back to a single block part for unknown types', () => {
    const parts = buildByggdelGeometry('UnknownType', { length: 2, height: 2, width: 2 });
    
    expect(parts.length).toBe(1);
    expect(parts[0].kind).toBe('box');
    expect(parts[0].label).toBe('Betong');
    expect(parts[0].size).toEqual([2, 2, 2]);
  });
});
