/** Geometry guard for the fictional ARRAY camera set.
 *
 * The road is a finite quad outside the circular silo opening. The old
 * 23-unit-long PlaneGeometry extended through (0, 0) and visually filled
 * the underground shaft, regardless of missile visibility settings.
 */
export type FloorPoint = { x: number; z: number };

export const SILO_OPENING_RADIUS = 1.15;

/** Smallest horizontal distance between the center of the shaft and a road
 * centerline segment, without assuming its axis alignment.
 */
export function segmentDistanceFromOrigin(a: FloorPoint, b: FloorPoint): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  if (!Number.isFinite(lengthSquared) || lengthSquared < 0.0001) {
    throw new Error('Access path requires two distinct finite endpoints.');
  }
  const t = Math.max(0, Math.min(1, -(a.x * dx + a.z * dz) / lengthSquared));
  return Math.hypot(a.x + t * dx, a.z + t * dz);
}

/** Four vertices of a finite horizontal road with a safe opening clearance.
 * Returns two-triangle vertices [startLeft, startRight, endRight, endLeft].
 */
export function safeAccessPath(
  start: FloorPoint,
  end: FloorPoint,
  width: number,
  y: number,
  openingRadius = SILO_OPENING_RADIUS,
): number[] {
  if (!(width > 0) || !Number.isFinite(width) || !Number.isFinite(y) ||
      !(openingRadius > 0) || !Number.isFinite(openingRadius)) {
    throw new Error('Road dimensions must be finite positive values.');
  }
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  if (!Number.isFinite(length) || length < 0.01) {
    throw new Error('Road requires distinct finite endpoints.');
  }
  const clearance = segmentDistanceFromOrigin(start, end) - width / 2;
  if (clearance <= openingRadius + .4) {
    throw new Error('Access path intersects the open silo: move it farther from the center.');
  }
  const px = -dz / length * width / 2;
  const pz = dx / length * width / 2;
  return [
    start.x + px, y, start.z + pz,
    start.x - px, y, start.z - pz,
    end.x - px, y, end.z - pz,
    end.x + px, y, end.z + pz,
  ];
}
