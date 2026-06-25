export interface Ref {
  '@type': string;
  '@id': string;
  name?: string;
  referenceUnit?: string;
}

export interface CalcSetup {
  target: Ref;
  impactMethod: Ref;
  amount: number;
}

export interface ImpactResult {
  indicator: Ref;
  amount: number;
}

export class OpenLcaClient {
  private url: string;

  constructor(url: string = 'http://localhost:8080') {
    this.url = url;
  }

  private async call(method: string, params: any = {}): Promise<any> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      })
    });
    if (!res.ok) {
      throw new Error(`OpenLCA HTTP error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (data.error) {
      throw new Error(`OpenLCA JSON-RPC error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    return data.result;
  }

  async getDescriptors(type: string): Promise<Ref[]> {
    return this.call('get/descriptors', { '@type': type });
  }

  async impactsFor(setup: CalcSetup): Promise<ImpactResult[]> {
    const res = await this.call('calculate', setup);
    return res.impactResults || [];
  }

  static pickGwp(impacts: ImpactResult[]): number | null {
    for (const ir of impacts) {
      const name = (ir.indicator.name || '').toLowerCase();
      if (name.includes('climate change') || name.includes('global warming') || name.includes('gwp')) {
        return ir.amount;
      }
    }
    return null;
  }
}
