import { describe, expect, it } from 'vitest';
import { safeAccessPath, segmentDistanceFromOrigin, SILO_OPENING_RADIUS } from '../src/engine/siloFloor';

describe('nightwatch open silo aperture', () => {
  it('the new approach road stays completely outside the real shaft hole', () => {
    const start = {x:-8.5,z:10.5};
    const end = {x:-2.7,z:2.4};
    const width = 2.15;
    const points = safeAccessPath(start,end,width,.107);
    expect(points).toHaveLength(12);
    expect(segmentDistanceFromOrigin(start,end) - width/2).toBeGreaterThan(SILO_OPENING_RADIUS+.4);
    for(let i=0;i<points.length;i+=3){
      expect(Math.hypot(points[i],points[i+2])).toBeGreaterThan(SILO_OPENING_RADIUS);
      expect(points[i+1]).toBe(.107);
    }
  });
  it('rejects the old oversized road that cut through the silo opening', () => {
    // Old unbounded rotated plane crossed within a few tenths of the origin.
    const oldStart={x:-13.9,z:15.3},oldEnd={x:1.3,z:-1.9};
    expect(segmentDistanceFromOrigin(oldStart,oldEnd)).toBeLessThan(SILO_OPENING_RADIUS);
    expect(() => safeAccessPath(oldStart,oldEnd,2.4,.107)).toThrow(/intersects the open silo/);
  });
  it('rejects a centered or invalid solid slab', () => {
    expect(() => safeAccessPath({x:-3,z:0},{x:3,z:0},2,.1)).toThrow(/intersects/);
    expect(() => safeAccessPath({x:0,z:0},{x:0,z:0},2,.1)).toThrow(/distinct/);
    expect(() => safeAccessPath({x:-5,z:-5},{x:-3,z:-3},0,.1)).toThrow(/dimensions/);
  });
});
