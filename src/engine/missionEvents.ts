import { type Mission, type MissionPhase } from './mission';

export interface MissionEvent {
  key: string;
  time: number;
  label: string;
  detail: string;
  source: 'simulation' | 'server';
}

export function missionEvents(mission: Mission): MissionEvent[] {
  const source = mission.isDemo ? 'simulation' : 'server';
  const records: MissionEvent[] = [{
    key: mission.id + '-created',
    time: mission.createdAt,
    label: mission.isDemo ? 'Simulation created' : 'Request accepted',
    detail: mission.isDemo
      ? 'A local visual demonstration was registered. No model inference was started.'
      : 'RAVIN acknowledged the authenticated mission request.',
    source,
  }];
  if (!mission.isDemo && typeof mission.startedAt === 'number') {
    records.push({
      key: mission.id + '-started', time: mission.startedAt, label: 'Worker started',
      detail: 'Start time reported by the RAVIN mission service.', source,
    });
  }
  const completions: Partial<Record<MissionPhase, string>> = {
    succeeded: mission.isDemo ? 'Simulation ended' : 'Task completed',
    failed: 'Task failed',
    canceled: 'Task canceled',
  };
  if (mission.finishedAt !== undefined && completions[mission.phase]) {
    records.push({
      key: mission.id + '-finished', time: mission.finishedAt,
      label: completions[mission.phase]!,
      detail: mission.isDemo
        ? 'Local illustration only. No AI-generated results.'
        : mission.phase === 'failed' ? 'The API reported a failure. Inspect the error details.'
        : mission.phase === 'canceled' ? 'Canceled before the worker completed.'
        : 'The API reported completion. Inspect the available result.',
      source,
    });
  }
  return records.sort((a, b) => a.time - b.time);
}

export function missionStatus(mission: Mission): string {
  if (mission.isDemo) return 'SIM · ' + mission.phase.toUpperCase().replaceAll('_', ' ');
  return ({
    queued: 'QUEUED', deploying: 'STARTING', running: 'RUNNING',
    waiting_approval: 'REVIEW NEEDED', succeeded: 'COMPLETED',
    failed: 'FAILED', canceled: 'CANCELED',
  } satisfies Record<MissionPhase, string>)[mission.phase];
}
