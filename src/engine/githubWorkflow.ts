/** Public, read-only GitHub Actions status adapter for Grove's ARRAY Builder.
 * Never treat a successful GitHub run as a deployed website.
 */
export const GROVE_REPO_URL = 'https://github.com/Link9060/Resonant-Grove';
export const GROVE_ACTIONS_URL = GROVE_REPO_URL + '/actions/workflows/array-builder.yml';
const API_URL = 'https://api.github.com/repos/Link9060/Resonant-Grove/actions/workflows/array-builder.yml/runs?per_page=6';

export type WorkerRun = {
  id: number;
  title: string;
  status: 'queued' | 'running' | 'success' | 'failure' | 'cancelled' | 'other';
  startedAt: string;
  url: string;
  conclusion: string | null;
};

export type WorkerRunsSnapshot = {
  configured: boolean;
  runs: WorkerRun[];
};

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function parseWorkerRun(value: unknown): WorkerRun | null {
  const raw = object(value);
  if (!raw || typeof raw.id !== 'number' || !Number.isSafeInteger(raw.id) || raw.id <= 0 ||
      typeof raw.html_url !== 'string' ||
      !raw.html_url.startsWith(GROVE_REPO_URL + '/actions/runs/')) return null;

  const rawStatus = raw.status;
  const conclusion = typeof raw.conclusion === 'string' ? raw.conclusion : null;
  let status: WorkerRun['status'] = 'other';
  if (rawStatus === 'queued' || rawStatus === 'waiting' || rawStatus === 'requested' || rawStatus === 'pending') status = 'queued';
  else if (rawStatus === 'in_progress') status = 'running';
  else if (rawStatus === 'completed') {
    status = conclusion === 'success' ? 'success' :
      conclusion === 'cancelled' ? 'cancelled' :
      conclusion === 'failure' || conclusion === 'timed_out' ? 'failure' : 'other';
  }
  const candidate = typeof raw.created_at === 'string' ? raw.created_at : '';
  return {
    id: Number(raw.id),
    title: typeof raw.display_title === 'string' && raw.display_title.trim()
      ? raw.display_title.slice(0, 120) : 'Builder mission',
    status,
    conclusion,
    startedAt: Number.isNaN(Date.parse(candidate)) ? '' : candidate,
    url: raw.html_url,
  };
}

export function parseWorkerRunsPayload(payload: unknown): WorkerRun[] {
  const raw = object(payload);
  return Array.isArray(raw?.workflow_runs)
    ? raw.workflow_runs.map(parseWorkerRun).filter((run): run is WorkerRun => run !== null)
    : [];
}

export async function fetchGroveWorkerRuns(signal?: AbortSignal): Promise<WorkerRunsSnapshot> {
  const response = await fetch(API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
    credentials: 'omit',
    signal,
  });
  // GitHub returns 404 until the new workflow exists on the default branch.
  if (response.status === 404) return { configured: false, runs: [] };
  if (!response.ok) throw new Error('GitHub Actions status unavailable (HTTP ' + response.status + ').');
  return { configured: true, runs: parseWorkerRunsPayload(await response.json()) };
}
