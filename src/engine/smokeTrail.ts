/** Independent, purely illustrative atmospheric particles.
 * Each puff is simulated from its own birth time, not from launch progress.
 */
export const SMOKE_LIFETIME_MS = 15000;
export const SMOKE_EMIT_INTERVAL_MS = 125;

export type SmokeSeed = {
  bornAt: number;
  x: number;
  y: number;
  z: number;
  size: number;
  phase: number;
};
export type SmokeFrame = {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function evolveSmoke(seed: SmokeSeed, now: number): SmokeFrame {
  const age = Math.max(0, now - seed.bornAt);
  const progress = clamp(age / SMOKE_LIFETIME_MS);
  const breathing = .06 * Math.sin(seed.phase + age * .00036);
  return {
    alive: age < SMOKE_LIFETIME_MS,
    x: seed.x + progress * 1.18 + breathing,
    y: seed.y + progress * 1.20,
    z: seed.z - progress * .73 + .09 * Math.cos(seed.phase + age * .00027),
    size: seed.size * (1 + progress * 2.55),
    alpha: .48 * Math.min(1, age / 460) * (1 - progress) ** 1.65,
  };
}
