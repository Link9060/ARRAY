import { describe,expect,it } from 'vitest';
import {filterMissionRegister,makeMissionExport} from '../src/engine/monitorFilters';
import type {Mission} from '../src/engine/mission';
const m=(id:string,phase:Mission['phase'],isDemo:boolean,at:number,objective='Build dashboard'):Mission=>({
  id,phase,isDemo,createdAt:at,objective,agentId:'operations-01',
  agentName:'Operations 01',category:'operations',policy:'review',
});
const missions=[
  m('1','running',false,1000),
  m('2','waiting_approval',false,2000,'Approve draft'),
  m('3','succeeded',true,3000),
  m('4','failed',false,4000,'Check error'),
];
describe('mission control filters and export',()=>{
  it('filters active, approval, and attention accurately',()=>{
    expect(filterMissionRegister(missions,'','active').map(x=>x.id)).toEqual(['2','1']);
    expect(filterMissionRegister(missions,'','review').map(x=>x.id)).toEqual(['2']);
    expect(filterMissionRegister(missions,'','attention').map(x=>x.id)).toEqual(['4']);
    expect(filterMissionRegister(missions,'','completed').map(x=>x.id)).toEqual(['3']);
  });
  it('searches and narrows live or demo independently',()=>{
    expect(filterMissionRegister(missions,'APPROVE','all','live').map(x=>x.id)).toEqual(['2']);
    expect(filterMissionRegister(missions,'','all','demo').map(x=>x.id)).toEqual(['3']);
    expect(filterMissionRegister(missions,'','all','both','oldest').map(x=>x.id)).toEqual(['1','2','3','4']);
  });
  it('exports explicit mission records without session credentials',()=>{
    const json=makeMissionExport(missions,5000);
    const result=JSON.parse(json);
    expect(result.count).toBe(4);
    expect(result.missions[1].phase).toBe('waiting_approval');
    expect(json).not.toContain('access_token');
  });
});
