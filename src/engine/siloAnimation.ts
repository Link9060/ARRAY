/** Timeline for ARRAY's fictional signal-pod launch visualization.
 * This animation is purely illustrative and never reflects provider progress.
 */
export const SILO_SEQUENCE_MS = 5600;

// Pure visual geometry constraints. The complete elongated model starts below the sealed deck.
export const SILO_DECK_Y = 0.21;
export const SILO_MODEL_SCALE_Y = 1.52;
export const SILO_MODEL_TIP_Y = 2.255;
export const SILO_PARKED_Y = -3.6;
export const SILO_TRAVEL_Y = 9.2;

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
  const hatchOpen = smooth((t - .06) / .19);
  const hatchClose = smooth((t - .82) / .16);
  // The missile must be below the deck until the doors finish opening.
  const ascent = smooth((t - .29) / .52);
  const thrust = smooth((t - .31) / .13) * (1 - smooth((t - .79) / .10));
  return {
    hatch: hatchOpen * (1 - hatchClose),
    thrust,
    ascent,
    glow: .23 + .77 * Math.max(hatchOpen * (1 - hatchClose), thrust),
    shake: thrust * (1 - ascent) * .014,
  };
}

/** World-space base translation; never use the visual timer to infer task completion. */
export function siloModelY(pose: SiloPose): number {
  return SILO_PARKED_Y + SILO_TRAVEL_Y * pose.ascent;
}

/** Do not render the hidden prop until both the hatch and rising tip clear the deck. */
export function siloModelVisible(pose: SiloPose): boolean {
  return pose.hatch >= 0.92
    && pose.ascent > 0
    && siloModelY(pose) + SILO_MODEL_SCALE_Y * SILO_MODEL_TIP_Y > SILO_DECK_Y;
}
