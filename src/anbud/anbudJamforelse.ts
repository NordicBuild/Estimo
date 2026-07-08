export interface ReferensRad {
  id: string; // radnyckel
  mangd: number;
  kalkylAPris: number;
}

export interface OffertRad {
  id: string;
  aPris: number;
}

export interface Offert {
  id: string;
  namn: string;
  rader: OffertRad[];
}

export interface JamforelseCell {
  aPris: number;
  effektivtAPris: number;
  total: number;
  imputerad: boolean;
  klassificering: 'hog' | 'lag' | null;
}

export interface JamforelseOffert extends Offert {
  raTotal: number;
  utjamnadTotal: number;
  celler: Record<string, JamforelseCell>;
}

export interface Rekommendation {
  rekommenderadOffertId: string | null;
  konfidens: 'hog' | 'medel' | 'lag';
  anledning: string;
}

export function median(numbers: number[]): number {
  const filtered = numbers.filter(n => n !== 0);
  if (filtered.length === 0) return 0;
  const sorted = [...filtered].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function klassificeraCell(val: number, arr: number[], troskel: number = 0.15): 'hog' | 'lag' | null {
  const filtered = arr.filter(n => n !== 0);
  if (filtered.length <= 1) return null;
  const med = median(filtered);
  if (med === 0) return null;
  const diff = (val - med) / med;
  if (diff > troskel) return 'hog';
  if (diff < -troskel) return 'lag';
  return null;
}

export function byggJamforelse(referensRader: ReferensRad[], offerter: Offert[], troskel: number = 0.15): JamforelseOffert[] {
  const aPriserPerRad: Record<string, number[]> = {};
  for (const rad of referensRader) {
    aPriserPerRad[rad.id] = [];
    for (const offert of offerter) {
      const orad = offert.rader.find(r => r.id === rad.id);
      if (orad && orad.aPris > 0) {
        aPriserPerRad[rad.id].push(orad.aPris);
      }
    }
  }

  const medianerPerRad: Record<string, number> = {};
  for (const rad of referensRader) {
    medianerPerRad[rad.id] = median(aPriserPerRad[rad.id]);
  }

  return offerter.map(offert => {
    let raTotal = 0;
    let utjamnadTotal = 0;
    const celler: Record<string, JamforelseCell> = {};

    for (const rad of referensRader) {
      const orad = offert.rader.find(r => r.id === rad.id);
      const aPris = orad ? orad.aPris : 0;
      let effektivtAPris = aPris;
      let imputerad = false;

      raTotal += aPris * rad.mangd;

      if (!orad || aPris === 0) {
        effektivtAPris = medianerPerRad[rad.id];
        imputerad = true;
      }

      const total = effektivtAPris * rad.mangd;
      utjamnadTotal += total;

      celler[rad.id] = {
        aPris,
        effektivtAPris,
        total,
        imputerad,
        klassificering: klassificeraCell(effektivtAPris, aPriserPerRad[rad.id], troskel)
      };
    }

    return {
      ...offert,
      raTotal,
      utjamnadTotal,
      celler
    };
  });
}

export function kalkylTotal(referensRader: ReferensRad[]): number {
  return referensRader.reduce((sum, rad) => sum + rad.mangd * rad.kalkylAPris, 0);
}

export function geRekommendation(jamforelseOfferter: JamforelseOffert[]): Rekommendation {
  if (jamforelseOfferter.length === 0) {
    return { rekommenderadOffertId: null, konfidens: 'lag', anledning: 'Inga offerter' };
  }

  const sorted = [...jamforelseOfferter].sort((a, b) => a.utjamnadTotal - b.utjamnadTotal);
  const basta = sorted[0];

  const totaler = jamforelseOfferter.map(o => o.utjamnadTotal);
  const medianTotal = median(totaler);

  if (medianTotal > 0 && basta.utjamnadTotal < medianTotal * 0.8) {
    return {
      rekommenderadOffertId: basta.id,
      konfidens: 'lag',
      anledning: 'misstankt_lagt'
    };
  }

  return {
    rekommenderadOffertId: basta.id,
    konfidens: 'hog',
    anledning: 'basta_pris'
  };
}

export function kopVsEgenRegi(bastaAnbud: number, kalkylTotal: number, tolerans: number = 0): 'kop' | 'egen_regi' {
  if (bastaAnbud < kalkylTotal - tolerans) {
    return 'kop';
  }
  return 'egen_regi';
}

export function offertPriserPerKey(offert: JamforelseOffert): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, cell] of Object.entries(offert.celler)) {
    result[key] = cell.effektivtAPris;
  }
  return result;
}

export function serializeOfferter(offerter: Offert[]): string {
  try {
    return JSON.stringify(offerter);
  } catch (e) {
    return '[]';
  }
}

export function deserializeOfferter(str: string): Offert[] {
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    return [];
  }
}
