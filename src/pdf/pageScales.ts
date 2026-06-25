import { Scale } from './scaleHelpers';

export type PageScales = Record<number, Scale>;

export function scaleForPage(pageScales: PageScales, pageIndex: number, defaultScale: Scale): Scale {
  return pageScales[pageIndex] || defaultScale;
}

export function setPageScale(pageScales: PageScales, pageIndex: number, scale: Scale): PageScales {
  return {
    ...pageScales,
    [pageIndex]: scale
  };
}

export function serializePageScales(pageScales: PageScales): string {
  return JSON.stringify(pageScales);
}

export function deserializePageScales(serialized: string): PageScales {
  if (!serialized) return {};
  try {
    return JSON.parse(serialized);
  } catch (e) {
    return {};
  }
}

export function emptyPageScales(): PageScales {
  return {};
}
