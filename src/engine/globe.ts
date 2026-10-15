import type { Mission } from './mission';
import { demoFlightFraction } from './flightPath';

export type Vec3 = { x: number; y: number; z: number };
export type Projected = { x: number; y: number; z: number; outside: boolean };
export type GlobeRoute = { start: Vec3; end: Vec3 };
export type ViewRotation = { yaw: number; pitch: number; roll: number };

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function seeded(hash: number, salt: number): number {
  let x = (hash + Math.imul(salt, 0x9e3779b9)) | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}
export function normalize(p: Vec3): Vec3 {
  const len = Math.hypot(p.x, p.y, p.z);
  if (len < 1e-10) return { x: 0, y: 0, z: 1 };
  return { x: p.x / len, y: p.y / len, z: p.z / len };
}
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function randomSpherePoint(seed: number, salt: number): Vec3 {
  const y = seeded(seed, salt) * 1.7 - .85;
  const angle = seeded(seed, salt + 1) * Math.PI * 2;
  const ring = Math.sqrt(1 - y * y);
  return { x: ring * Math.cos(angle), y, z: ring * Math.sin(angle) };
}
/**
 * Stable abstract points, NOT geographic sites or physical launch coordinates.
 * Angular separation ensures every new demo draws a legible arch.
 */
export function routeForMission(id: string): GlobeRoute {
  const seed = hashString(id);
  const start = randomSpherePoint(seed, 1);
  let end = randomSpherePoint(seed, 3);
  for (let i = 0; i < 10 && (dot(start, end) > .72 || dot(start, end) < -.88); i++) {
    end = randomSpherePoint(seed, 7 + i * 2);
  }
  if (dot(start, end) > .72 || dot(start, end) < -.88) {
    end = normalize({ x: -start.z, y: .15, z: start.x });
  }
  return { start, end };
}

/** Great-circle interpolation, with safe handling for nearly coincident vectors. */
export function interpolateUnit(a: Vec3, b: Vec3, fraction: number): Vec3 {
  const t = Math.max(0, Math.min(1, fraction));
  const cosine = Math.max(-1, Math.min(1, dot(a, b)));
  const angle = Math.acos(cosine);
  if (angle < .0001) {
    return normalize({ x: a.x * (1 - t) + b.x * t, y: a.y * (1 - t) + b.y * t, z: a.z * (1 - t) + b.z * t });
  }
  const sinAngle = Math.sin(angle);
  if (Math.abs(sinAngle) < 1e-6) {
    const perpendicular = normalize({ x: -a.z, y: 0, z: a.x });
    return normalize({ x: a.x * Math.cos(t * Math.PI) + perpendicular.x * Math.sin(t * Math.PI),
      y: a.y * Math.cos(t * Math.PI) + perpendicular.y * Math.sin(t * Math.PI),
      z: a.z * Math.cos(t * Math.PI) + perpendicular.z * Math.sin(t * Math.PI) });
  }
  const fa = Math.sin((1 - t) * angle) / sinAngle;
  const fb = Math.sin(t * angle) / sinAngle;
  return normalize({ x: a.x * fa + b.x * fb, y: a.y * fa + b.y * fb, z: a.z * fa + b.z * fb });
}
/** Curved abstract route elevating above the globe, returning to surface at each end. */
export function arcPosition(route: GlobeRoute, fraction: number, lift = .32): Vec3 {
  const t = Math.max(0, Math.min(1, fraction));
  const unit = interpolateUnit(route.start, route.end, t);
  const height = 1 + Math.pow(Math.sin(Math.PI * t), 1.14) * lift;
  return { x: unit.x * height, y: unit.y * height, z: unit.z * height };
}
/** Same yaw-pitch-roll and perspective convention as ARROW Orbit's point renderer. */
export function projectGlobe(p: Vec3, rot: ViewRotation, cx: number, cy: number, radius: number): Projected {
  const cyaw = Math.cos(rot.yaw), syaw = Math.sin(rot.yaw);
  const cpitch = Math.cos(rot.pitch), spitch = Math.sin(rot.pitch);
  const croll = Math.cos(rot.roll), sroll = Math.sin(rot.roll);
  const x1 = p.x * cyaw + p.z * syaw;
  const z1 = -p.x * syaw + p.z * cyaw;
  const y2 = p.y * cpitch - z1 * spitch;
  const z2 = p.y * spitch + z1 * cpitch;
  const x3 = x1 * croll - y2 * sroll;
  const y3 = x1 * sroll + y2 * croll;
  const perspective = 1 / Math.max(.76, 1 - z2 * .13);
  const x = cx + x3 * radius * perspective;
  const y = cy + y3 * radius * perspective;
  return { x, y, z: z2, outside: Math.hypot(x - cx, y - cy) > radius * .98 };
}
export function pointIsForeground(point: Projected): boolean {
  return point.z >= 0 || point.outside;
}
/** A demo animation fraction. It is never a measured AI-progress estimate. */
export function positionForDemoMission(mission: Mission, now: number, lift = .32): Vec3 {
  return arcPosition(routeForMission(mission.id), demoFlightFraction(mission, now), lift);
}
