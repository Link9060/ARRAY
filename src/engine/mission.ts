export type MissionPhase = 'queued' | 'deploying' | 'running' | 'waiting_approval' | 'succeeded' | 'failed' | 'canceled';
export type ExecutionPolicy = 'review' | 'assist' | 'authorized';
export type OperationsMode = 'general' | 'coding';

export interface Mission {
  id: string;
  agentId: string;
  agentName: string;
  category: string;
  objective: string;
  policy: ExecutionPolicy;
  operationsMode?: OperationsMode;
  instructions?: string;
  model?: string;
  phase: MissionPhase;
  createdAt: number;
  finishedAt?: number;
  isDemo: boolean;
  output?: string;
  error?: string;
  startedAt?: number;
}

export const DEMO_RUN_MS = 24_000;
export const DEMO_DEPLOY_MS = 2_400;

export function createDemoMission(
  params: Pick<Mission, 'agentId' | 'agentName' | 'category' | 'objective' | 'policy'>,
  now: number = Date.now(),
  id: string = `demo-${now}-${Math.random().toString(36).slice(2, 9)}`,
): Mission {
  if (!params.objective.trim()) throw new Error('A mission objective is required.');
  return { ...params, objective: params.objective.trim(), id, phase: 'deploying', createdAt: now, isDemo: true };
}

/** Visible demonstration only. Not a live RAVIN worker and not real AI progress. */
export function advanceDemoMission(mission: Mission, now: number): Mission {
  if (!mission.isDemo || mission.phase === 'canceled' || mission.phase === 'failed' || mission.phase === 'succeeded') return mission;
  const elapsed = Math.max(0, now - mission.createdAt);
  if (elapsed >= DEMO_RUN_MS) return { ...mission, phase: 'succeeded', finishedAt: mission.createdAt + DEMO_RUN_MS };
  const phase: MissionPhase = elapsed < DEMO_DEPLOY_MS ? 'deploying' : 'running';
  return phase === mission.phase ? mission : { ...mission, phase };
}

export function cancelDemoMission(mission: Mission, now: number): Mission {
  if (!mission.isDemo || mission.phase === 'succeeded' || mission.phase === 'canceled' || mission.phase === 'failed') return mission;
  return { ...mission, phase: 'canceled', finishedAt: now };
}

export function trajectoryPosition(phase: MissionPhase): number {
  switch (phase) {
    case 'queued': return 0.04;
    case 'deploying': return 0.13;
    case 'running': return 0.55;
    case 'waiting_approval': return 0.68;
    case 'succeeded': return 1;
    case 'failed': case 'canceled': return 0.55;
  }
}

export function isActiveMission(phase: MissionPhase): boolean {
  return phase === 'queued' || phase === 'deploying' || phase === 'running' || phase === 'waiting_approval';
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function phaseLabel(phase: MissionPhase): string {
  return ({
    queued: 'Queued',
    deploying: 'Deploying',
    running: 'In flight',
    waiting_approval: 'Awaiting approval',
    succeeded: 'Sequence complete',
    failed: 'Sequence failed',
    canceled: 'Canceled',
  })[phase];
}

/**
 * Backend integration seam (future):
 * replace demo create/advance logic with mission API + authenticated event stream.
 * Do not infer live progress or ETA from the animation clock.
 */
