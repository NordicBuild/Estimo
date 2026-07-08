import { expect, test, describe } from 'vitest';
import { scaleForPage, setPageScale, serializePageScales, deserializePageScales, PageScales } from '../pdf/pageScales';
import { presetScale } from '../pdf/scaleHelpers';

describe('pageScales', () => {
  test('scaleForPage faller tillbaka på defaultScale för okalibrerad sida', () => {
    const defaultScale = presetScale(100);
    const scales: PageScales = {};
    const scale = scaleForPage(scales, 1, defaultScale);
    expect(scale).toEqual(defaultScale);
  });

  test('setPageScale muterar inte originalet och sätter rätt sida', () => {
    const defaultScale = presetScale(100);
    const original: PageScales = { 0: presetScale(50) };
    const newScale = presetScale(200);
    
    const updated = setPageScale(original, 1, newScale);
    
    expect(updated[1]).toEqual(newScale);
    expect(updated[0]).toEqual(presetScale(50));
    expect(original[1]).toBeUndefined(); // ensure not mutated
  });

  test('deserializePageScales(serializePageScales(x)) ger tillbaka x', () => {
    const scales: PageScales = {
      0: presetScale(50),
      2: presetScale(200)
    };
    
    const serialized = serializePageScales(scales);
    const deserialized = deserializePageScales(serialized);
    
    expect(deserialized['0']).toEqual(presetScale(50));
    expect(deserialized['2']).toEqual(presetScale(200));
  });
});
