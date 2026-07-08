import { describe, it, expect } from 'vitest';
import {
  harledFaktorer,
  appliceraFaktor,
  uppdateraTidsfaktorer
} from '../eac/erfarenhetsAterforing';

describe('erfarenhet', () => {
  it('harledFaktorer mängdviktar korrekt', () => {
    const res = harledFaktorer([
      { kalkyladTimmar: 120, utfallTimmar: 150 }, // 1.25 @ 120
      { kalkyladTimmar: 80, utfallTimmar: 88 },   // 1.10 @ 80
      { kalkyladTimmar: 0, utfallTimmar: 50 },    // Ignoreras
      { kalkyladTimmar: -10, utfallTimmar: 10 }   // Ignoreras
    ]);
    // 238 / 200 = 1.19
    expect(res).toBeCloseTo(1.19);
  });

  it('appliceraFaktor skapar vägt genomsnitt med trohet', () => {
    const res = appliceraFaktor(0.4, 1.19, 0.5);
    // 1.0*0.5 + 1.19*0.5 = 1.095 -> 0.4 * 1.095 = 0.438
    expect(res).toBeCloseTo(0.438);
  });

  it('uppdateraTidsfaktorer rör inte nycklar utan förslag och respekterar minN', () => {
    const befintliga = { 'A': 1.0, 'B': 1.5 };
    const forslag = {
      'A': {
        samples: [
          { kalkyladTimmar: 120, utfallTimmar: 150 },
          { kalkyladTimmar: 80, utfallTimmar: 88 }
        ]
      },
      'C': {
        samples: Array(10).fill({ kalkyladTimmar: 10, utfallTimmar: 20 })
      }
    };
    
    // minN = 5, A har 2 valid samples, C har 10 valid samples.
    // A should not be updated (stays 1.0).
    // B should not be updated (stays 1.5).
    // C should be added/updated with factor 2.0.
    const uppdaterade = uppdateraTidsfaktorer(befintliga, forslag, 5);
    
    expect(uppdaterade['A']).toBe(1.0);
    expect(uppdaterade['B']).toBe(1.5);
    expect(uppdaterade['C']).toBe(2.0);
  });
});
