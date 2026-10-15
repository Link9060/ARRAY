import { describe, expect, it } from 'vitest';
import {
  DEMO_RUN_MS,
  advanceDemoMission,
  cancelDemoMission,
  createDemoMission,
  formatDuration,
  isActiveMission,
  phaseLabel,
  trajectoryPosition,
} from '../src/engine/mission';

const params = {
  agentId: 'scout',
  agentName: 'Scout',
  category: 'intelligence',
  objective: 'Research a new UI pattern',
  policy: 'review' as const,
};

describe('demo mission contract', () => {
  it('requires an objective and trims user text', () => {
    expect(() => createDemoMission({ ...params, objective: '   ' })).toThrow();
    const mission = createDemoMission({ ...params, objective: '  Find examples  ' }, 1000, 'demo-test');
    expect(mission.objective).toBe('Find examples');
    expect(mission.phase).toBe('deploying');
    expect(mission.isDemo).toBe(true);
    expect(mission.id).toBe('demo-test');
  });

  it('moves only through clearly labeled simulated phases', () => {
    const mission = createDemoMission(params, 1000, 'test-01');
    expect(advanceDemoMission(mission, 1200).phase).toBe('deploying');
    expect(advanceDemoMission(mission, 3400).phase).toBe('running');
    const done = advanceDemoMission(mission, 1000 + DEMO_RUN_MS);
    expect(done.phase).toBe('succeeded');
    expect(done.finishedAt).toBe(1000 + DEMO_RUN_MS);
    expect(advanceDemoMission(done, 100_000)).toBe(done);
  });

  it('cancels running demos and prevents later simulated completion', () => {
    const mission = createDemoMission(params, 1000);
    const running = advanceDemoMission(mission, 5000);
    const canceled = cancelDemoMission(running, 6000);
    expect(canceled.phase).toBe('canceled');
    expect(canceled.finishedAt).toBe(6000);
    expect(advanceDemoMission(canceled, 1_000_000)).toBe(canceled);
  });

  it('never cancels a completed mission', () => {
    const mission = advanceDemoMission(createDemoMission(params, 1000), 1000 + DEMO_RUN_MS);
    expect(cancelDemoMission(mission, 30000)).toBe(mission);
  });

  it('has stable symbolic paths and readable labels', () => {
    expect(trajectoryPosition('deploying')).toBeLessThan(trajectoryPosition('running'));
    expect(trajectoryPosition('running')).toBeLessThan(trajectoryPosition('succeeded'));
    expect(isActiveMission('running')).toBe(true);
    expect(isActiveMission('canceled')).toBe(false);
    expect(phaseLabel('succeeded')).toBe('Sequence complete');
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65_990)).toBe('01:05');
  });
});
