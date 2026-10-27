import { describe, expect, it } from 'vitest';
import { SILO_SEQUENCE_MS, siloPose } from '../src/engine/siloAnimation';

describe('3D launch visualization choreography', () => {
  it('starts with a closed hatch and no exhaust', () => {
    expect(siloPose(null)).toMatchObject({ hatch: 0, thrust: 0, ascent: 0, shake: 0 });
  });
  it('opens the display hatch before the decorative signal pod ascends', () => {
    expect(siloPose(SILO_SEQUENCE_MS * .27).hatch).toBeGreaterThan(.5);
    expect(siloPose(SILO_SEQUENCE_MS * .27).ascent).toBe(0);
    expect(siloPose(SILO_SEQUENCE_MS * .55).ascent).toBeGreaterThan(0);
    expect(siloPose(SILO_SEQUENCE_MS * .55).thrust).toBeGreaterThan(0);
  });
  it('returns to standby after the finite sequence', () => {
    expect(siloPose(SILO_SEQUENCE_MS + 10)).toEqual(siloPose(null));
  });
  it('removes motion and particle exhaust for reduced-motion preference', () => {
    const pose = siloPose(500, true);
    expect(pose.hatch).toBe(1);
    expect(pose.thrust).toBe(0);
    expect(pose.ascent).toBe(0);
    expect(pose.shake).toBe(0);
  });
});
