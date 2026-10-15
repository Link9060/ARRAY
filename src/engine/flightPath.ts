import { DEMO_RUN_MS, type Mission } from './mission';

/**
 * Deterministic visualization-only coordinates. A given mission id always gets the
 * same abstract path; these points are NOT geographic and are not physical targets.
 */
export interface FlightCurve {
  sx: number; sy: number;
  c1x: number; c1y: number;
  c2x: number; c2y: number;
  ex: number; ey: number;
}

function seedFromId(id: string): number {
  let h = 2166136261;
  for (let index = 0; index < id.length; index++) {
    h ^= id.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededValue(seed: number, salt: number): number {
  let x = (seed + Math.imul(salt, 0x9e3779b9)) | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 0x100000000;
}

export function createFlightCurve(missionId: string): FlightCurve {
  const seed = seedFromId(missionId);
  const sx = Math.round(115 + seededValue(seed, 1) * 155);
  const sy = Math.round(195 + seededValue(seed, 2) * 155);
  const ex = Math.round(610 + seededValue(seed, 3) * 165);
  const ey = Math.round(105 + seededValue(seed, 4) * 245);
  const height = Math.max(28, Math.min(sy, ey) - 75 - seededValue(seed, 5) * 105);
  return {
    sx, sy, ex, ey,
    c1x: sx + (ex - sx) * 0.31,
    c1y: height,
    c2x: sx + (ex - sx) * 0.68,
    c2y: height,
  };
}

export function positionOnCurve(curve: FlightCurve, t: number): { x: number; y: number; angle: number } {
  const f = Math.max(0, Math.min(1, t));
  const r = 1 - f;
  const x = r*r*r*curve.sx + 3*r*r*f*curve.c1x + 3*r*f*f*curve.c2x + f*f*f*curve.ex;
  const y = r*r*r*curve.sy + 3*r*r*f*curve.c1y + 3*r*f*f*curve.c2y + f*f*f*curve.ey;
  const dx = 3*r*r*(curve.c1x-curve.sx) + 6*r*f*(curve.c2x-curve.c1x) + 3*f*f*(curve.ex-curve.c2x);
  const dy = 3*r*r*(curve.c1y-curve.sy) + 6*r*f*(curve.c2y-curve.c1y) + 3*f*f*(curve.ey-curve.c2y);
  return { x, y, angle: Math.atan2(dy, dx) * 180 / Math.PI };
}

/** Time-driven animation for local demos only. Never use as real agent progress. */
export function demoFlightFraction(mission: Mission, now: number): number {
  if (mission.phase === 'succeeded') return 1;
  const end = mission.finishedAt ?? now;
  return Math.max(0, Math.min(1, (end - mission.createdAt) / DEMO_RUN_MS));
}
