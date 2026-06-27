import { describe, it, expect } from 'vitest';
import {
  receptStyckkostnad,
  receptCo2PerEnhet,
  expandRecept,
  serializeRecept,
  deserializeRecept,
  Recept
} from '../recept/recept';

describe('recept', () => {
  it('receptStyckkostnad beräknar material, arbete och total', () => {
    const recept: Recept = {
      id: 'r1',
      byggdelType: 'vag',
      mangd: 1,
      material: [
        { id: 'm1', atgang: 0.3, spill: 0.05, aPris: 1800, co2PerEnhet: 280 }
      ],
      arbete: [
        { id: 'a1', atgang: 0.4, aPris: 520 }
      ]
    };

    const res = receptStyckkostnad(recept);
    expect(res.material).toBeCloseTo(567);
    expect(res.arbete).toBeCloseTo(208);
    expect(res.total).toBeCloseTo(775);
  });

  it('receptCo2PerEnhet beräknar co2', () => {
    const recept: Recept = {
      id: 'r1',
      byggdelType: 'vag',
      mangd: 1,
      material: [
        { id: 'm1', atgang: 0.3, spill: 0.05, aPris: 1800, co2PerEnhet: 280 }
      ],
      arbete: []
    };
    
    expect(receptCo2PerEnhet(recept)).toBeCloseTo(88.2);
  });

  it('expandRecept ger qty, type, materialOverrides', () => {
    const recept: Recept = {
      id: 'r1',
      byggdelType: 'Vagg',
      mangd: 10,
      material: [
        { id: 'm1', atgang: 0.3, spill: 0.05, aPris: 1800, co2PerEnhet: 280 }
      ],
      arbete: []
    };

    const res = expandRecept(recept);
    expect(res.qty).toBe(10);
    expect(res.type).toBe('Vagg');
    expect(res.materialOverrides).toEqual({
      m1: { unitPrice: 1800, co2PerEnhet: 280 }
    });
  });

  it('expandRecept kastar fel om byggdelType saknas', () => {
    const recept: Recept = {
      id: 'r1',
      mangd: 10,
      material: [],
      arbete: []
    };

    expect(() => expandRecept(recept)).toThrow('byggdelType saknas');
  });

  it('serializeRecept och deserializeRecept hanterar data och skräp', () => {
    const recepts: Recept[] = [{
      id: 'r1',
      mangd: 10,
      material: [],
      arbete: []
    }];

    const serialized = serializeRecept(recepts);
    expect(deserializeRecept(serialized)).toEqual(recepts);

    expect(deserializeRecept('not valid json')).toEqual([]);
    expect(deserializeRecept('{"some": "object"}')).toEqual([]);
  });
});
