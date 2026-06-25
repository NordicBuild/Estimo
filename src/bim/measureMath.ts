export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export function distance3(p1: Point3, p2: Point3): number {
  return Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2 + (p2.z - p1.z)**2);
}

export function polygonArea3(points: Point3[]): number {
  if (points.length < 3) return 0;
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    nx += (p1.y - p2.y) * (p1.z + p2.z);
    ny += (p1.z - p2.z) * (p1.x + p2.x);
    nz += (p1.x - p2.x) * (p1.y + p2.y);
  }
  return Math.sqrt(nx*nx + ny*ny + nz*nz) / 2;
}

export function polygonPerimeter3(points: Point3[]): number {
  if (points.length < 2) return 0;
  let perim = 0;
  for (let i = 0; i < points.length; i++) {
    perim += distance3(points[i], points[(i + 1) % points.length]);
  }
  return perim;
}

export function angleBetween3(p1: Point3, p2: Point3, p3: Point3): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
  
  const mag1 = Math.sqrt(v1.x**2 + v1.y**2 + v1.z**2);
  const mag2 = Math.sqrt(v2.x**2 + v2.y**2 + v2.z**2);
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const dot = v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function prismVolume(area: number, depth: number): number {
  if (!depth) return 0;
  return area * depth;
}
