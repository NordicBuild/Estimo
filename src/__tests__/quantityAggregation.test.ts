import { describe, it, expect } from 'vitest';
import { classifyQuantityKey, aggregateQuantities } from '../bim/quantityAggregation';

describe('quantityAggregation', () => {
  it('classifyQuantityKey', () => {
    expect(classifyQuantityKey('Volume')).toBe('sum');
    expect(classifyQuantityKey('length')).toBe('sum');
    expect(classifyQuantityKey('thickness')).toBe('avg');
    expect(classifyQuantityKey('tjocklek')).toBe('avg');
    expect(classifyQuantityKey('FireRating')).toBe('distinct');
  });

  it('aggregateQuantities sum', () => {
    const res = aggregateQuantities([
      { quantities: { volume: 2 } },
      { quantities: { volume: 3 } }
    ]);
    expect(res['volume']).toEqual({
      key: 'volume',
      mode: 'sum',
      sum: 5,
      count: 2,
      unit: 'm³'
    });
  });

  it('aggregateQuantities avg', () => {
    const res = aggregateQuantities([
      { quantities: { thickness: 240 } },
      { quantities: { thickness: 240 } }
    ]);
    expect(res['thickness']).toMatchObject({
      mode: 'avg',
      avg: 240
    });
  });

  it('ignores null and non-numeric', () => {
    const res = aggregateQuantities([
      { quantities: { volume: 5 } },
      { quantities: { volume: null } },
      { quantities: { volume: 'str' } },
      { quantities: { volume: undefined } }
    ]);
    expect(res['volume'].sum).toBe(5);
    expect(res['volume'].count).toBe(1);
  });
});
