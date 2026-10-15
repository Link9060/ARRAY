import { describe, expect, it } from 'vitest';
import { createFlightCurve, demoFlightFraction, positionOnCurve } from '../src/engine/flightPath';
import { DEMO_RUN_MS, advanceDemoMission, cancelDemoMission, createDemoMission } from '../src/engine/mission';

const params = {
  agentId: 'test-vector',
  agentName: 'Test Vector',
  category: 'diagnostic',
  objective: 'Preview launch arc',
  policy: 'assist' as const,
};

describe('Flight Monitor diagnostic visualization', () => {
  it('generates stable per-mission randomized paths', () => {
    const same = createFlightCurve('mission-A');
    expect(createFlightCurve('mission-A')).toEqual(same);
    expect(createFlightCurve('mission-B')).not.toEqual(same);
    expect(same.sx).toBeGreaterThanOrEqual(115);
    expect(same.ex).toBeLessThanOrEqual(775);
    expect(same.c1y).toBeLessThan(same.sy);
    expect(same.c2y).toBeLessThan(same.ey);
  });

  it('returns the exact launch and arrival points', () => {
    const curve = createFlightCurve('test-1');
    const start = positionOnCurve(curve, 0);
    const arrival = positionOnCurve(curve, 1);
    expect(start.x).toBeCloseTo(curve.sx);
    expect(start.y).toBeCloseTo(curve.sy);
    expect(arrival.x).toBeCloseTo(curve.ex);
    expect(arrival.y).toBeCloseTo(curve.ey);
  });

  it('moves across the arc during the local demo and stops at arrival', () => {
    const start = 50_000;
    const mission = createDemoMission(params, start, 'diagnostic-01');
    expect(demoFlightFraction(mission, start)).toBe(0);
    expect(demoFlightFraction(mission, start + DEMO_RUN_MS / 2)).toBeCloseTo(0.5);
    const completed = advanceDemoMission(mission, start + DEMO_RUN_MS);
    expect(demoFlightFraction(completed, start + DEMO_RUN_MS + 9_999)).toBe(1);
  });

  it('freezes canceled vectors where they stopped', () => {
    const start = 100_000;
    const mission = advanceDemoMission(createDemoMission(params, start, 'diagnostic-02'), start + 3000);
    const canceled = cancelDemoMission(mission, start + 5000);
    expect(demoFlightFraction(canceled, start + 50_000)).toBeCloseTo(5000 / DEMO_RUN_MS);
  });
});
