export interface Scale {
  pixelsPerUnit: number;
  unitLabel: string;
  invalid?: boolean;
}

export function presetScale(scaleRatio: number): Scale {
  if (scaleRatio <= 0) {
    return { pixelsPerUnit: 0, unitLabel: 'm', invalid: true };
  }
  return {
    pixelsPerUnit: 72 / (0.0254 * scaleRatio),
    unitLabel: 'm'
  };
}

export function deriveScale(pixelDistance: number, realDistance: number): Scale {
  if (pixelDistance <= 0 || realDistance <= 0) {
    return { pixelsPerUnit: 0, unitLabel: 'm', invalid: true };
  }
  return {
    pixelsPerUnit: pixelDistance / realDistance,
    unitLabel: 'm'
  };
}

export function toRealDistance(pixelDistance: number, pixelsPerUnit: number): number {
  if (pixelsPerUnit <= 0) return 0;
  return pixelDistance / pixelsPerUnit;
}

export function toRealArea(pixelArea: number, pixelsPerUnit: number): number {
  if (pixelsPerUnit <= 0) return 0;
  return pixelArea / (pixelsPerUnit * pixelsPerUnit);
}

export function toMeters(value: number, unit: string): number {
  switch (unit) {
    case 'mm': return value * 0.001;
    case 'cm': return value * 0.01;
    case 'ft': return value * 0.3048;
    case 'in': return value * 0.0254;
    default: return value;
  }
}

export function ratioFromScale(scale: Scale): number {
  if (!scale || scale.pixelsPerUnit <= 0) return 0;
  return 72 / (0.0254 * scale.pixelsPerUnit);
}
