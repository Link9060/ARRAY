/**
 * Authenticated adapter for Project-R.A.V.I.N.-1.1's ARRAY mission endpoints.
 * This module never persists tokens to localStorage and never calls an agent
 * provider directly. A real RAVIN server deployment is required.
 */
import { AGENTS } from '../data/agents';
import type { Mission, MissionPhase, ExecutionPolicy } from './mission';

const AUTH_ENDPOINT = 'https://bzjudqhjrbwglxdfbkmj.supabase.co/functions/v1/ravin-auth';
// Confirmed existing Render service in the user's selected workspace.
// This is a public HTTPS origin, not a credential. Can be overridden at build time.
export const RAVIN_ARRAY_API = (import.meta.env.VITE_RAVIN_ARRAY_API_URL || 'https://ravin-hyeq.onrender.com').trim().replace(/\/$/, '');

type Session = { accessToken: string; refreshToken: string; expiresAt: number };
let session: Session | null = null;

function validApi(): string {
  if (!RAVIN_ARRAY_API) throw new Error('Live RAVIN server is not configured yet. Simulation is available.');
  let url: URL;
  try { url = new URL(RAVIN_ARRAY_API); } catch { throw new Error('Invalid RAVIN ARRAY API URL.'); }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) {
    throw new Error('RAVIN API requires HTTPS, except during local development.');
  }
  return url.origin + url.pathname.replace(/\/$/, '');
}
export function liveApiConfigured(): boolean {
  try { validApi(); return true; } catch { return false; }
}
export function isLiveAuthenticated(): boolean { return Boolean(session?.accessToken); }
export function signOutLive(): void { session = null; }

async function authRequest(body: unknown): Promise<{ session?: { access_token: string; refresh_token?: string; expires_in?: number; expires_at?: number }; error?: string }> {
  const response = await fetch(AUTH_ENDPOINT, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),
    credentials:'omit',
    referrerPolicy:'no-referrer',
    signal:AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'RAVIN sign-in failed.');
  return data;
}
function saveSession(data: { access_token: string; refresh_token?: string; expires_in?: number; expires_at?: number }): void {
  session = {
    accessToken:data.access_token,
    refreshToken:data.refresh_token || '',
    expiresAt:data.expires_at ? data.expires_at * 1000 : Date.now() + (data.expires_in || 3600) * 1000,
  };
}
export async function signInLive(email: string, password: string): Promise<void> {
  validApi(); // Fail early: never ask for a password for a disconnected backend.
  if (!email.trim() || !password) throw new Error('Email and password are required.');
  const data = await authRequest({action:'signin',email:email.trim(),password});
  if (!data.session?.access_token) throw new Error('RAVIN did not return a usable session.');
  saveSession(data.session as Required<typeof data.session>);
}
async function token(): Promise<string> {
  if (!session) throw new Error('Sign in to RAVIN before launching a live mission.');
  if (session.expiresAt - Date.now() < 60000) {
    if (!session.refreshToken) { signOutLive(); throw new Error('RAVIN session expired. Sign in again.'); }
    try {
      const data = await authRequest({ action:'refresh',refresh_token:session.refreshToken });
      if (!data.session?.access_token) throw new Error('Session refresh failed.');
      saveSession(data.session as Required<typeof data.session>);
    } catch {
      signOutLive();
      throw new Error('RAVIN session expired. Sign in again.');
    }
  }
  return session.accessToken;
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const authorization = await token();
  const response = await fetch(validApi() + path, {
    ...init,
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${authorization}`},
    credentials:'omit',
    referrerPolicy:'no-referrer',
    signal:AbortSignal.timeout(45000),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    signOutLive();
    throw new Error('RAVIN session was rejected. Sign in again.');
  }
  if (!response.ok) throw new Error(data.error || `RAVIN request failed (HTTP ${response.status}).`);
  return data as T;
}
interface ServerMission {
  id: string;
  agentId: string;
  objective: string;
  policy: ExecutionPolicy;
  status: MissionPhase;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  output?: string;
  error?: string;
}
export function fromServerMission(remote: ServerMission): Mission {
  const agent = AGENTS.find(item => item.id === remote.agentId);
  const status:MissionPhase = ['queued','running','succeeded','failed','canceled','waiting_approval'].includes(remote.status)
    ? remote.status : 'failed';
  return {
    id:remote.id,
    agentId:remote.agentId,
    agentName:agent?.name || remote.agentId,
    category:agent?.category || 'intelligence',
    objective:remote.objective,
    policy:remote.policy,
    phase:status,
    isDemo:false,
    createdAt:remote.createdAt,
    startedAt:remote.startedAt,
    finishedAt:remote.finishedAt,
    output:remote.output,
    error:remote.error,
  };
}
export async function launchLiveMission(agentId:string, objective:string, policy: ExecutionPolicy): Promise<Mission> {
  const response = await request<{mission:ServerMission}>('/api/array/missions', {
    method:'POST',
    body:JSON.stringify({agentId, objective, policy}),
  });
  return fromServerMission(response.mission);
}
export async function listLiveMissions(): Promise<Mission[]> {
  const data = await request<{missions:ServerMission[]}>('/api/array/missions');
  return data.missions.map(fromServerMission);
}
export async function cancelQueuedLiveMission(id:string): Promise<Mission> {
  const data = await request<{mission:ServerMission}>(`/api/array/missions/${encodeURIComponent(id)}/cancel`,{method:'POST'});
  return fromServerMission(data.mission);
}
