import { describe, expect, it } from 'vitest';
import { arcPosition, dot, interpolateUnit, pointIsForeground, projectGlobe, routeForMission } from '../src/engine/globe';
import { createDemoMission, advanceDemoMission, DEMO_RUN_MS } from '../src/engine/mission';
import { positionForDemoMission } from '../src/engine/globe';

describe('Orbit globe launch geometry', () => {
  it('keeps the same abstract route for a given mission and varies other launches', () => {
    const a = routeForMission('demo-test-launch-01');
    const b = routeForMission('demo-test-launch-02');
    expect(routeForMission('demo-test-launch-01')).toEqual(a);
    expect(a).not.toEqual(b);
    for (const point of [a.start, a.end]) {
      expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(1, 8);
    }
    expect(dot(a.start, a.end)).toBeLessThan(.8);
  });
  it('keeps trajectory endpoints on the sphere and arches its center outward', () => {
    const route = routeForMission('test-an-arc');
    const start = arcPosition(route, 0);
    const mid = arcPosition(route, .5);
    const end = arcPosition(route, 1);
    expect(start.x).toBeCloseTo(route.start.x, 7);
    expect(start.y).toBeCloseTo(route.start.y, 7);
    expect(end.z).toBeCloseTo(route.end.z, 7);
    expect(Math.hypot(mid.x, mid.y, mid.z)).toBeGreaterThan(1.25);
  });
  it('matches Orbit spherical rotation conventions and hides rear markers', () => {
    const rot = { yaw:0, pitch:0, roll:0 };
    const front = projectGlobe({x:0,y:0,z:1},rot,200,200,100);
    const back = projectGlobe({x:0,y:0,z:-1},rot,200,200,100);
    expect(front.x).toBeCloseTo(200);
    expect(front.y).toBeCloseTo(200);
    expect(pointIsForeground(front)).toBe(true);
    expect(pointIsForeground(back)).toBe(false);
    const side = projectGlobe({x:0,y:0,z:1},{yaw:Math.PI / 2,pitch:0,roll:0},200,200,100);
    expect(side.x).toBeGreaterThan(295);
  });
  it('interpolation stays finite and normalized even for coincident points', () => {
    const a = {x:0,y:1,z:0};
    const p = interpolateUnit(a,a,.44);
    expect(Number.isFinite(p.x+p.y+p.z)).toBe(true);
    expect(p.y).toBeCloseTo(1);
  });
  it('positions a demo flight by simulated time, not fake worker telemetry', () => {
    const start = 30_000;
    const m = createDemoMission({agentId:'test-vector',agentName:'Test Vector',category:'diagnostic',objective:'Visual test',policy:'assist'},start,'demo-globe');
    const midpoint = positionForDemoMission(m,start+DEMO_RUN_MS/2);
    expect(Math.hypot(midpoint.x,midpoint.y,midpoint.z)).toBeGreaterThan(1.25);
    const finished=advanceDemoMission(m,start+DEMO_RUN_MS);
    const p = positionForDemoMission(finished,start+DEMO_RUN_MS+3000);
    const end=routeForMission('demo-globe').end;
    expect(p.x).toBeCloseTo(end.x);
  });
});
