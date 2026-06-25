import { describe, it, expect } from 'vitest';
import { distance3, polygonArea3, polygonPerimeter3, angleBetween3, prismVolume } from '../bim/measureMath';

describe('measureMath', () => {
  it('distance3', () => {
    expect(distance3({x:0, y:0, z:0}, {x:3, y:4, z:0})).toBe(5);
  });

  it('polygonArea3', () => {
    const sq = [{x:0,y:0,z:0}, {x:1,y:0,z:0}, {x:1,y:1,z:0}, {x:0,y:1,z:0}];
    expect(polygonArea3(sq)).toBe(1);
  });

  it('polygonPerimeter3', () => {
    const sq = [{x:0,y:0,z:0}, {x:1,y:0,z:0}, {x:1,y:1,z:0}, {x:0,y:1,z:0}];
    expect(polygonPerimeter3(sq)).toBe(4);
  });

  it('angleBetween3', () => {
    expect(angleBetween3({x:1,y:0,z:0}, {x:0,y:0,z:0}, {x:0,y:1,z:0})).toBe(90);
  });

  it('prismVolume', () => {
    expect(prismVolume(10, 0.3)).toBe(3);
    expect(prismVolume(10, 0)).toBe(0);
  });
});
