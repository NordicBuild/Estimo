export type AggregationMode = 'sum' | 'avg' | 'distinct' | 'none';

export function classifyQuantityKey(key: string): AggregationMode {
  const k = key.toLowerCase();
  if (k.includes('volume') || k.includes('length')) return 'sum';
  if (k.includes('thickness') || k.includes('tjocklek')) return 'avg';
  if (k.includes('firerating')) return 'distinct';
  return 'none';
}

export function aggregateQuantities(elements: Array<{ quantities?: Record<string, any> }>) {
  const result: Record<string, any> = {};
  
  for (const el of elements) {
    if (!el.quantities) continue;
    for (const [key, value] of Object.entries(el.quantities)) {
      if (value === null || value === undefined) continue;
      
      const mode = classifyQuantityKey(key);
      if ((mode === 'sum' || mode === 'avg') && typeof value !== 'number') continue;
      
      if (!result[key]) {
        let unit = '';
        if (key.toLowerCase() === 'volume') unit = 'm³';
        result[key] = { key, mode, count: 0, unit };
        if (mode === 'sum' || mode === 'avg') result[key].sum = 0;
        if (mode === 'distinct') result[key].values = new Set();
      }
      
      const agg = result[key];
      agg.count++;
      if (mode === 'sum' || mode === 'avg') {
        agg.sum += value;
      } else if (mode === 'distinct') {
        agg.values.add(value);
      }
    }
  }
  
  for (const agg of Object.values(result)) {
    if (agg.mode === 'avg' && agg.count > 0) {
      agg.avg = agg.sum / agg.count;
    }
    if (agg.mode === 'distinct') {
      agg.distinctValues = Array.from(agg.values);
      delete agg.values;
    }
  }
  
  return result;
}
