import { Byggdel } from '../data';

export interface EvalResult {
  value: number;
  error?: string;
}

export type Resolver = (name: string) => number | undefined;

export function evalCell(input: string, resolver?: Resolver): EvalResult {
  if (!input) return { value: 0 };
  if (typeof input !== 'string') input = String(input);
  const trimmed = input.trim();
  
  if (!trimmed.startsWith('=')) {
    // Plain number, handle comma
    const num = Number(trimmed.replace(',', '.'));
    if (isNaN(num)) return { value: 0, error: 'Ogiltigt tal' };
    return { value: num };
  }

  const expr = trimmed.slice(1);
  return evaluate(expr, resolver || (() => undefined));
}

function evaluate(expr: string, resolver: Resolver): EvalResult {
  let pos = 0;
  
  function match(expected: string) {
    while (pos < expr.length && /\s/.test(expr[pos])) pos++;
    if (expr.substring(pos, pos + expected.length) === expected) {
      pos += expected.length;
      return true;
    }
    return false;
  }
  
  function parsePrimary(): number {
    while (pos < expr.length && /\s/.test(expr[pos])) pos++;
    if (pos >= expr.length) throw new Error('Oväntat slut');
    
    if (match('(')) {
      const v = parseExpression();
      if (!match(')')) throw new Error('Saknar stängande parentes');
      return v;
    }
    
    // Number
    const start = pos;
    while (pos < expr.length && /[0-9.,]/.test(expr[pos])) pos++;
    if (pos > start) {
      const str = expr.substring(start, pos).replace(',', '.');
      const num = Number(str);
      if (isNaN(num)) throw new Error('Ogiltigt tal');
      return num;
    }
    
    // Identifier
    const idStart = pos;
    while (pos < expr.length && /[a-zA-Z0-9_]/.test(expr[pos])) pos++;
    if (pos > idStart) {
      const id = expr.substring(idStart, pos);
      const val = resolver(id);
      if (val === undefined) throw new Error('Okänd referens');
      return val;
    }
    
    if (match('-')) return -parsePrimary();
    if (match('+')) return parsePrimary();
    
    throw new Error('Ogiltigt uttryck');
  }
  
  function parsePower(): number {
    const left = parsePrimary();
    if (match('^')) {
      const right = parsePower(); // Right-associative
      return Math.pow(left, right);
    }
    return left;
  }
  
  function parseTerm(): number {
    let left = parsePower();
    while (true) {
      if (match('*')) {
        left *= parsePower();
      } else if (match('/')) {
        const right = parsePower();
        if (right === 0) throw new Error('Division med noll');
        left /= right;
      } else {
        break;
      }
    }
    return left;
  }
  
  function parseExpression(): number {
    let left = parseTerm();
    while (true) {
      if (match('+')) {
        left += parseTerm();
      } else if (match('-')) {
        left -= parseTerm();
      } else {
        break;
      }
    }
    return left;
  }
  
  try {
    const val = parseExpression();
    while (pos < expr.length && /\s/.test(expr[pos])) pos++;
    if (pos < expr.length) throw new Error('Oväntade tecken på slutet');
    return { value: val };
  } catch (e: any) {
    return { value: 0, error: e.message || 'Fel i formel' };
  }
}
