export type GeoPartRole = 'concrete' | 'formwork' | 'fill' | 'armature';

export interface GeoDim {
  label: string;
  value: number;
  p1: [number, number, number];
  p2: [number, number, number];
}

export interface GeoPart {
  id: string;
  kind: 'box' | 'cylinder';
  size: [number, number, number]; // [width (x), height (y), depth (z)] for box, or [radiusTop, radiusBottom, height] for cylinder
  position: [number, number, number]; // [x, y, z]
  role: GeoPartRole;
  label: string;
  dims?: GeoDim[];
}

export const ROLE_COLORS: Record<GeoPartRole, string> = {
  concrete: '#b3b7b9',
  formwork: '#c8a47e',
  fill: '#d2b48c',
  armature: '#ff0000'
};

export function buildByggdelGeometry(mType: string, dimensions: any): GeoPart[] {
  const parts: GeoPart[] = [];
  
  const l = Math.max(0.1, Number(dimensions.length) || 1);
  const w = Math.max(0.1, Number(dimensions.width) || Number(dimensions.wallThickness) || 1);
  const h = Math.max(0.1, Number(dimensions.height) || Number(dimensions.slabThickness) || 1);

  if (mType === '24.2_Sula') {
    const shaftW = Math.max(0.1, Number(dimensions.shaftWidth) || w * 0.2);
    // Base slab (sula)
    parts.push({
      id: 'sula-base',
      kind: 'box',
      size: [l, h, w],
      position: [0, h / 2, 0], // Center at y = h/2
      role: 'concrete',
      label: 'Sula',
      dims: [
        { label: 'L', value: l, p1: [-l/2, 0, w/2], p2: [l/2, 0, w/2] },
        { label: 'B', value: w, p1: [l/2, 0, -w/2], p2: [l/2, 0, w/2] },
        { label: 'H', value: h, p1: [-l/2, 0, w/2], p2: [-l/2, h, w/2] }
      ]
    });
    // Shaft formwork representation (mock height)
    const shaftH = 0.5; // fake height
    parts.push({
      id: 'sula-shaft',
      kind: 'box',
      size: [l, shaftH, shaftW],
      position: [0, h + shaftH / 2, 0], // On top of sula
      role: 'formwork',
      label: 'Gjutform (Schakt)',
      dims: [
        { label: 'B(form)', value: shaftW, p1: [l/2, h + shaftH, -shaftW/2], p2: [l/2, h + shaftH, shaftW/2] }
      ]
    });
  } else if (mType === '35.1_Trappa') {
    const steps = Math.max(1, Number(dimensions.stepCount) || 1);
    const stepW = Math.max(0.1, Number(dimensions.stepWidth) || Number(dimensions.width) || 1.0);
    const stepH = Math.max(0.1, Number(dimensions.stepHeight) || 0.15);
    const stepD = Math.max(0.1, Number(dimensions.stepDepth) || 0.3);

    for (let i = 0; i < steps; i++) {
      parts.push({
        id: `step-${i}`,
        kind: 'box',
        size: [stepW, stepH, stepD],
        position: [0, (i * stepH) + (stepH / 2), (i * stepD) + (stepD / 2)],
        role: 'concrete',
        label: `Steg ${i + 1}`,
        dims: i === 0 ? [
          { label: 'Bredd', value: stepW, p1: [-stepW/2, 0, stepD/2], p2: [stepW/2, 0, stepD/2] },
          { label: 'Djup', value: stepD, p1: [stepW/2, 0, -stepD/2], p2: [stepW/2, 0, stepD/2] },
          { label: 'Höjd', value: stepH, p1: [-stepW/2, 0, stepD/2], p2: [-stepW/2, stepH, stepD/2] }
        ] : []
      });
    }
  } else if (mType.includes('Grop')) {
    // Example for Grop
    parts.push({
      id: 'grop-fill',
      kind: 'box',
      size: [l, h, w],
      position: [0, h / 2, 0],
      role: 'fill',
      label: 'Grop',
      dims: [
        { label: 'L', value: l, p1: [-l/2, h, w/2], p2: [l/2, h, w/2] },
        { label: 'B', value: w, p1: [l/2, h, -w/2], p2: [l/2, h, w/2] },
        { label: 'H(djup)', value: h, p1: [-l/2, 0, w/2], p2: [-l/2, h, w/2] }
      ]
    });
  } else {
    // Default rectangular block
    parts.push({
      id: 'base-block',
      kind: 'box',
      size: [l, h, w],
      position: [0, h / 2, 0],
      role: 'concrete',
      label: 'Betong',
      dims: [
        { label: 'L', value: l, p1: [-l/2, 0, w/2], p2: [l/2, 0, w/2] },
        { label: 'B/Tj', value: w, p1: [l/2, 0, -w/2], p2: [l/2, 0, w/2] },
        { label: 'H/Tj', value: h, p1: [-l/2, 0, w/2], p2: [-l/2, h, w/2] }
      ]
    });
  }

  return parts;
}
