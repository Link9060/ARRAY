import { describe, expect, it } from 'vitest';
import {
  SILO_SEQUENCE_MS, siloPose, siloModelY, siloModelVisible,
  SILO_DECK_Y, SILO_MODEL_SCALE_Y, SILO_MODEL_TIP_Y,
} from '../src/engine/siloAnimation';

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
  it('keeps the whole lengthened prop below the sealed deck before launch', () => {
    const idle = siloPose(null);
    expect(idle.hatch).toBe(0);
    expect(siloModelY(idle) + SILO_MODEL_SCALE_Y * SILO_MODEL_TIP_Y).toBeLessThan(SILO_DECK_Y);
    expect(siloModelVisible(idle)).toBe(false);
    const opening = siloPose(SILO_SEQUENCE_MS * .18);
    expect(opening.hatch).toBeGreaterThan(0);
    expect(opening.ascent).toBe(0);
    expect(siloModelVisible(opening)).toBe(false);
  });
  it('shows the rising prop only when hatch is open and tip has cleared the deck', () => {
    expect(siloModelVisible(siloPose(SILO_SEQUENCE_MS * .30))).toBe(false);
    expect(siloModelVisible(siloPose(SILO_SEQUENCE_MS * .50))).toBe(true);
    expect(siloModelVisible(siloPose(SILO_SEQUENCE_MS + 25))).toBe(false);
    expect(siloPose(SILO_SEQUENCE_MS + 25).hatch).toBe(0);
  });
  it('removes motion and particle exhaust for reduced-motion preference', () => {
    const pose = siloPose(500, true);
    expect(pose.hatch).toBe(1);
    expect(pose.thrust).toBe(0);
    expect(pose.ascent).toBe(0);
    expect(pose.shake).toBe(0);
  });
});
