import type { Mission, MissionPhase } from './mission';

/** Only announce new terminal transitions of missions already observed in this session.
 * Loading an old completed record must never send a retroactive notification.
 */
export function missionEndTransitions(
  previous: ReadonlyMap<string,MissionPhase>,
  current: readonly Mission[],
): Mission[] {
  return current.filter(mission => {
    const old = previous.get(mission.id);
    if (old === undefined || old === mission.phase) return false;
    if (old === 'succeeded' || old === 'failed' || old === 'canceled') return false;
    return mission.phase === 'succeeded' || mission.phase === 'failed';
  });
}

export function missionEndMessage(mission: Mission): {title:string;body:string} {
  if (mission.isDemo) {
    return mission.phase === 'failed'
      ? {title:'ARRAY simulation interrupted',body:mission.agentName+' / No AI task was executed.'}
      : {title:'ARRAY simulation complete',body:mission.agentName+' / Visual demo ended. No AI task was executed.'};
  }
  return mission.phase === 'failed'
    ? {title:'RAVIN task failed',body:mission.agentName+' / Open ARRAY to review the server-reported error.'}
    : {title:'RAVIN task complete',body:mission.agentName+' / Your result is available in Mission Control.'};
}
