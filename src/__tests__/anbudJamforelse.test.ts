import { describe, it, expect } from 'vitest';
import { 
  median, 
  klassificeraCell, 
  byggJamforelse, 
  kalkylTotal, 
  geRekommendation, 
  kopVsEgenRegi, 
  offertPriserPerKey, 
  serializeOfferter, 
  deserializeOfferter,
  ReferensRad,
  Offert
} from '../anbud/anbudJamforelse';

describe('anbudJamforelse', () => {
  it('median beräknas korrekt och nollor ignoreras', () => {
    expect(median([100, 0, 200, 300])).toBe(200);
  });

  it('klassificeraCell fungerar', () => {
    expect(klassificeraCell(300, [100, 200, 300])).toBe('hog');
    expect(klassificeraCell(100, [100, 200, 300])).toBe('lag');
    expect(klassificeraCell(100, [100])).toBeNull();
  });

  it('byggJamforelse imputterar median vid saknad rad', () => {
    const referensRader: ReferensRad[] = [
      { id: 'a', mangd: 10, kalkylAPris: 50 },
      { id: 'b', mangd: 5, kalkylAPris: 100 },
      { id: 'c', mangd: 2, kalkylAPris: 500 }
    ];

    const offerter: Offert[] = [
      { id: 'o1', namn: 'Offert 1', rader: [{ id: 'a', aPris: 40 }, { id: 'b', aPris: 90 }, { id: 'c', aPris: 400 }] },
      { id: 'o2', namn: 'Offert 2', rader: [{ id: 'a', aPris: 45 }, { id: 'b', aPris: 95 }, { id: 'c', aPris: 450 }] },
      // o3 saknar rad c
      { id: 'o3', namn: 'Offert 3', rader: [{ id: 'a', aPris: 35 }, { id: 'b', aPris: 85 }] }
    ];

    const jamforelse = byggJamforelse(referensRader, offerter);
    const offert3 = jamforelse.find(o => o.id === 'o3')!;
    
    // Median of c is median([400, 450]) = 425
    expect(offert3.celler['c'].effektivtAPris).toBe(425);
    expect(offert3.celler['c'].imputerad).toBe(true);
    
    const forvantadRaTotal = (35 * 10) + (85 * 5); // 350 + 425 = 775
    const forvantadUtjamnadTotal = forvantadRaTotal + (425 * 2); // 775 + 850 = 1625
    
    expect(offert3.raTotal).toBe(forvantadRaTotal);
    expect(offert3.utjamnadTotal).toBe(forvantadUtjamnadTotal);
    expect(offert3.utjamnadTotal).toBeGreaterThan(offert3.raTotal);
  });

  it('kalkylTotal beräknar summan av mangd * kalkylAPris', () => {
    const rader: ReferensRad[] = [
      { id: 'a', mangd: 10, kalkylAPris: 50 },
      { id: 'b', mangd: 5, kalkylAPris: 100 }
    ];
    expect(kalkylTotal(rader)).toBe(1000);
  });

  it('geRekommendation ger misstankt_lagt om bästa är > 20% under median', () => {
    const referensRader: ReferensRad[] = [
      { id: 'a', mangd: 1, kalkylAPris: 100 }
    ];
    // Median aPris would be median(100, 110, 50) = 100.
    // However, the test specifies >20% under *medianTotal*.
    // utjamnadTotal values: 100, 110, 50
    // medianTotal = 100.
    // 50 < 100 * 0.8 (80) -> lag konfidens.
    const offerter: Offert[] = [
      { id: 'o1', namn: 'O1', rader: [{ id: 'a', aPris: 100 }] },
      { id: 'o2', namn: 'O2', rader: [{ id: 'a', aPris: 110 }] },
      { id: 'o3', namn: 'O3', rader: [{ id: 'a', aPris: 50 }] }
    ];
    
    const jamforelse = byggJamforelse(referensRader, offerter);
    const rekommendation = geRekommendation(jamforelse);
    
    expect(rekommendation.rekommenderadOffertId).toBe('o3');
    expect(rekommendation.konfidens).toBe('lag');
    expect(rekommendation.anledning).toBe('misstankt_lagt');
  });

  it('kopVsEgenRegi ger kop nar anbud < kalkylTotal - tolerans', () => {
    expect(kopVsEgenRegi(900, 1000, 50)).toBe('kop'); // 900 < 950
    expect(kopVsEgenRegi(960, 1000, 50)).toBe('egen_regi'); // 960 > 950
  });

  it('offertPriserPerKey extraherar effektivtAPris per radnyckel', () => {
    const referensRader: ReferensRad[] = [
      { id: 'a', mangd: 1, kalkylAPris: 100 }
    ];
    const offerter: Offert[] = [
      { id: 'o1', namn: 'O1', rader: [{ id: 'a', aPris: 150 }] }
    ];
    const jamforelse = byggJamforelse(referensRader, offerter);
    
    expect(offertPriserPerKey(jamforelse[0])).toEqual({ 'a': 150 });
  });

  it('serializeOfferter / deserializeOfferter kan koda avkodat format och hanterar skräp', () => {
    const offerter: Offert[] = [
      { id: 'o1', namn: 'O1', rader: [{ id: 'a', aPris: 150 }] }
    ];
    const serialiserad = serializeOfferter(offerter);
    expect(typeof serialiserad).toBe('string');
    expect(deserializeOfferter(serialiserad)).toEqual(offerter);
    
    // Hantera skräp
    expect(deserializeOfferter('invalid json')).toEqual([]);
    expect(deserializeOfferter('{"not":"array"}')).toEqual([]);
  });
});
