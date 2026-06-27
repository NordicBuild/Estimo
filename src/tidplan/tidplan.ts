import { Byggdel } from '../data';

export interface TidplanAktivitet {
  id: string;
  name: string;
  startPeriod: number;
  endPeriod: number;
  linkedByggdelar: number[];
}

export function aktivitetPlaneratVarde(aktivitet: TidplanAktivitet, byggdelar: Byggdel[], calcResult: any): number {
  return aktivitet.linkedByggdelar.reduce((sum, bId) => {
    const part = calcResult.parts.find((p: any) => p.id === bId);
    return sum + (part ? part.costNetto : 0);
  }, 0);
}
