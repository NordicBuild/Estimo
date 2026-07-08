import { describe, it, expect } from 'vitest';
import { evalCell } from '../kalkyl/kalkylFormula';

describe('kalkylFormula', () => {
  it("evalCell('=12*3.5') = 42", () => {
    expect(evalCell('=12*3.5').value).toBe(42);
  });
  
  it("evalCell('=2^3^2') = 512 (högerassociativ)", () => {
    expect(evalCell('=2^3^2').value).toBe(512);
  });
  
  it("'12,5' = 12.5 (svenskt komma i rent tal)", () => {
    expect(evalCell('12,5').value).toBe(12.5);
  });
  
  it("'=1/0' ger error 'Division med noll'", () => {
    expect(evalCell('=1/0').error).toBe('Division med noll');
  });
  
  it("'=BTA*0.18' med resolve {BTA:1200} = 216", () => {
    expect(evalCell('=BTA*0.18', (name) => name === 'BTA' ? 1200 : undefined).value).toBe(216);
  });
  
  it("'=okänd' ger 'Okänd referens'", () => {
    expect(evalCell('=okänd').error).toBe('Okänd referens');
  });
});
