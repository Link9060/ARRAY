import {describe,it,expect} from 'vitest';
import {missionEndTransitions,missionEndMessage} from '../src/engine/completionAlerts';
import type {Mission,MissionPhase} from '../src/engine/mission';
const task=(id:string,phase:MissionPhase,isDemo=false):Mission=>({
  id,phase,isDemo,agentId:'intelligence-01',agentName:'Intelligence 01',
  category:'intelligence',objective:'Research design',createdAt:100,
  policy:'review',
});
describe('completion notifications',()=>{
  it('notifies only when a previously tracked mission changes to success',()=>{
    const before = new Map<string,MissionPhase>([['alpha','running']]);
    expect(missionEndTransitions(before,[task('alpha','succeeded')]).map(x=>x.id)).toEqual(['alpha']);
    expect(missionEndTransitions(before,[task('alpha','running')])).toEqual([]);
  });
  it('never re-announces historical completed records or a repeated poll',()=>{
    expect(missionEndTransitions(new Map(),[task('historical','succeeded')])).toEqual([]);
    expect(missionEndTransitions(new Map([['x','succeeded']]),[task('x','succeeded')])).toEqual([]);
    expect(missionEndTransitions(new Map([['x','succeeded']]),[task('x','failed')])).toEqual([]);
  });
  it('handles failure and ignores cancellation and approval states',()=>{
    const before = new Map<string,MissionPhase>([['a','running'],['b','running'],['c','queued']]);
    expect(missionEndTransitions(before,[
      task('a','failed'),task('b','canceled'),task('c','waiting_approval'),
    ]).map(x=>x.id)).toEqual(['a']);
  });
  it('makes demo and real task messages explicitly different',()=>{
    expect(missionEndMessage(task('demo','succeeded',true)).title).toContain('simulation');
    expect(missionEndMessage(task('demo','succeeded',true)).body).toContain('No AI task');
    expect(missionEndMessage(task('real','succeeded')).title).toBe('RAVIN task complete');
  });
});
