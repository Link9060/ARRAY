import { describe, expect, it } from 'vitest';
import { missionEvents, missionStatus } from '../src/engine/missionEvents';
import type { Mission } from '../src/engine/mission';

const base: Mission = {
  id:'task-01',agentId:'operations-01',agentName:'Operations 01',
  category:'operations',objective:'Draft code',policy:'review',
  phase:'running',createdAt:1000,isDemo:false,startedAt:2000,
};

describe('truthful mission audit log', () => {
  it('shows only server-reported timestamps for live missions', () => {
    expect(missionEvents(base).map(event => event.time)).toEqual([1000,2000]);
    expect(missionEvents(base).every(e => e.source === 'server')).toBe(true);
    expect(missionStatus(base)).toBe('RUNNING');
  });
  it('adds completion only when a real completion timestamp is supplied', () => {
    expect(missionEvents({ ...base, phase:'succeeded' })).toHaveLength(2);
    const done = missionEvents({ ...base, phase:'succeeded', finishedAt:3500 });
    expect(done.map(e => e.label)).toEqual(['Request accepted','Worker started','Task completed']);
  });
  it('does not pretend a demo launch triggered inference', () => {
    const demo = { ...base, id:'demo-01',isDemo:true,startedAt:undefined,phase:'succeeded' as const,finishedAt:3500 };
    expect(missionEvents(demo).map(e => e.label)).toEqual(['Simulation created','Simulation ended']);
    expect(missionEvents(demo).every(e => e.source === 'simulation')).toBe(true);
    expect(missionStatus(demo)).toBe('SIM · SUCCEEDED');
  });
});
