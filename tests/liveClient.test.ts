import { describe, expect, it } from 'vitest';
import { fromServerMission, isLiveAuthenticated } from '../src/engine/liveClient';
import { advanceDemoMission, isActiveMission, phaseLabel, type Mission } from '../src/engine/mission';

describe('ARRAY live mission adapter', () => {
  const raw = {
    id:'server-123',
    agentId:'scout',
    objective:'Summarize a provided article',
    policy:'review' as const,
    status:'queued' as const,
    createdAt:1700000000000,
  };
  it('labels authenticated service jobs as live, without pretending they completed', () => {
    const mission = fromServerMission(raw);
    expect(mission.isDemo).toBe(false);
    expect(mission.phase).toBe('queued');
    expect(mission.agentName).toBe('Scout');
    expect(isActiveMission(mission.phase)).toBe(true);
    expect(phaseLabel(mission.phase)).toBe('Queued');
    expect(isLiveAuthenticated()).toBe(false);
  });
  it('does not move server-managed missions through the local demo timer', () => {
    const mission = fromServerMission({...raw,status:'running' as const});
    const ticked = advanceDemoMission(mission,Date.now()+500000);
    expect(ticked).toBe(mission);
    expect(ticked.phase).toBe('running');
  });
  it('maps real outputs, failures, and server completion timestamps', () => {
    const mission:Mission = fromServerMission({...raw,status:'succeeded' as const,
      output:'Draft ready for review',finishedAt:1700000008000});
    expect(mission.output).toBe('Draft ready for review');
    expect(mission.finishedAt).toBe(1700000008000);
  });
});
