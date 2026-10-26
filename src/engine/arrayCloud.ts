/**
 * Owner-scoped Supabase history store for ARRAY.
 * RAVIN is still the source of truth for live execution and worker status.
 * Supabase only stores last-known snapshots, including explicit demo provenance.
 * Browser-safe publishable key; every database operation is protected by RLS.
 */
import type { Mission, MissionPhase, ExecutionPolicy } from './mission';
import { getLiveAccessToken } from './liveClient';

const URL = 'https://bzjudqhjrbwglxdfbkmj.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_wVnTPMs0hUuWdt1_LGMIYQ_D-aXveMV';
let cachedOwnerId: string | null = null;

export function resetArrayCloudIdentity(): void { cachedOwnerId = null; }

async function supabaseRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const jwt = await getLiveAccessToken();
  const response = await fetch(URL + path, {
    ...options,
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: 'Bearer ' + jwt,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { message?: string; error?: string };
    throw new Error(detail.message || detail.error || 'Supabase request failed (' + response.status + ').');
  }
  if (response.status === 204 || options.method === 'POST') return undefined as T;
  return response.json() as Promise<T>;
}

async function ownerId(): Promise<string> {
  if (cachedOwnerId) return cachedOwnerId;
  const user = await supabaseRequest<{ id: string }>('/auth/v1/user');
  if (!user.id) throw new Error('Supabase did not return a user ID.');
  cachedOwnerId = user.id;
  return cachedOwnerId;
}

const phases: MissionPhase[] = ['queued', 'deploying', 'running', 'waiting_approval', 'succeeded', 'failed', 'canceled'];
const policies: ExecutionPolicy[] = ['review', 'assist', 'authorized'];

function parseMission(data: unknown): Mission | null {
  if (!data || typeof data !== 'object') return null;
  const m = data as Partial<Mission>;
  if (typeof m.id !== 'string' || m.id.length > 160 || !m.id
    || typeof m.agentId !== 'string' || typeof m.agentName !== 'string'
    || typeof m.category !== 'string' || typeof m.objective !== 'string'
    || m.objective.length > 1200 || typeof m.createdAt !== 'number'
    || !Number.isFinite(m.createdAt) || typeof m.isDemo !== 'boolean'
    || !phases.includes(m.phase as MissionPhase)
    || !policies.includes(m.policy as ExecutionPolicy)) return null;
  return {
    id: m.id, agentId: m.agentId, agentName: m.agentName, category: m.category,
    objective: m.objective, createdAt: m.createdAt, isDemo: m.isDemo,
    policy: m.policy!, phase: m.phase!,
    ...(typeof m.startedAt === 'number' ? { startedAt: m.startedAt } : {}),
    ...(typeof m.finishedAt === 'number' ? { finishedAt: m.finishedAt } : {}),
    ...(typeof m.output === 'string' ? { output: m.output } : {}),
    ...(typeof m.error === 'string' ? { error: m.error } : {}),
  };
}

export async function loadSavedMissions(): Promise<Mission[]> {
  // RLS checks the JWT; owner filter also makes the query explicit.
  const id = await ownerId();
  const rows = await supabaseRequest<Array<{ details: unknown }>>(
    '/rest/v1/array_saved_missions?select=details&owner_id=eq.' + encodeURIComponent(id) + '&order=updated_at.desc&limit=50',
  );
  return rows.map(row => parseMission(row.details)).filter((m): m is Mission => m !== null);
}

export async function storeMission(mission: Mission): Promise<void> {
  if (!parseMission(mission)) throw new Error('Invalid mission history record.');
  const id = await ownerId();
  await supabaseRequest<void>('/rest/v1/array_saved_missions?on_conflict=owner_id,mission_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      owner_id: id,
      mission_id: mission.id,
      details: mission,
      updated_at: new Date().toISOString(),
    }),
  });
}
