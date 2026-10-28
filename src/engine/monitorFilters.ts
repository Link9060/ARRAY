import type { Mission } from './mission';
import { isActiveMission } from './mission';

export type MissionFilter = 'all' | 'active' | 'review' | 'completed' | 'attention';
export type MissionOrder = 'newest' | 'oldest';
export type MissionChannel = 'both' | 'live' | 'demo';

export function filterMissionRegister(
  missions: readonly Mission[], query: string, filter: MissionFilter,
  channel: MissionChannel = 'both', order: MissionOrder = 'newest',
): Mission[] {
  const search = query.trim().toLocaleLowerCase();
  return missions.filter(mission => {
    if (channel === 'live' && mission.isDemo) return false;
    if (channel === 'demo' && !mission.isDemo) return false;
    if (filter === 'active' && !isActiveMission(mission.phase)) return false;
    if (filter === 'review' && mission.phase !== 'waiting_approval') return false;
    if (filter === 'completed' && mission.phase !== 'succeeded') return false;
    if (filter === 'attention' && !['failed','canceled'].includes(mission.phase)) return false;
    if (!search) return true;
    return [mission.id,mission.agentName,mission.agentId,mission.objective,
      mission.phase,mission.model || ''].some(item => item.toLocaleLowerCase().includes(search));
  }).sort((a,b) => order === 'oldest'
    ? a.createdAt-b.createdAt : b.createdAt-a.createdAt);
}

export function makeMissionExport(missions: readonly Mission[], at: number) {
  // No credentials or browser session values. Saved metadata/result only.
  return JSON.stringify({
    format: 'ravin-array-mission-register',
    exportedAt: new Date(at).toISOString(),
    count: missions.length,
    missions: missions.map(m => ({
      id:m.id,agentId:m.agentId,agentName:m.agentName,category:m.category,
      objective:m.objective,policy:m.policy,operationsMode:m.operationsMode,
      instructions:m.instructions,model:m.model,phase:m.phase,
      isDemo:m.isDemo,createdAt:m.createdAt,startedAt:m.startedAt,
      finishedAt:m.finishedAt,output:m.output,error:m.error,
    })),
  },null,2);
}
