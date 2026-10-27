/** Timeline for ARRAY's fictional signal-pod launch visualization.
 * This animation is purely illustrative and never reflects provider progress.
 */
export const SILO_SEQUENCE_MS = 4800;

export type SiloPose = {
  hatch: number;
  thrust: number;
  ascent: number;
  glow: number;
  shake: number;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export function siloPose(elapsedMs: number | null, reducedMotion = false): SiloPose {
  if (elapsedMs === null) {
    return { hatch: 0, thrust: 0, ascent: 0, glow: 0.23, shake: 0 };
  }
  if (reducedMotion) {
    return { hatch: 1, thrust: 0, ascent: 0, glow: 0.68, shake: 0 };
  }
  const t = Math.max(0, elapsedMs) / SILO_SEQUENCE_MS;
  if (t >= 1) return { hatch: 0, thrust: 0, ascent: 0, glow: 0.23, shake: 0 };
  const hatchOpen = smooth((t - .09) / .21);
  const hatchClose = smooth((t - .76) / .19);
  const ascent = smooth((t - .31) / .47);
  const thrust = smooth((t - .27) / .1) * (1 - smooth((t - .74) / .12));
  return {
    hatch: hatchOpen * (1 - hatchClose),
    thrust,
    ascent,
    glow: .23 + .77 * Math.max(hatchOpen * (1 - hatchClose), thrust),
    shake: thrust * (1 - ascent) * .014,
  };
}
