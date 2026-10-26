/** Public, read-only GitHub Actions status adapter for Grove's ARRAY Builder.
 * Never treat a successful GitHub run as a deployed website.
 */
export const GROVE_REPO_URL = 'https://github.com/Link9060/Resonant-Grove';
export const GROVE_ACTIONS_URL = GROVE_REPO_URL + '/actions/workflows/array-builder.yml';
export const SUPERVISOR_ACTIONS_URL = GROVE_REPO_URL + '/actions/workflows/array-supervisor.yml';
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


/** Read-only owner task and draft PR queue. Public GitHub metadata only. */
const ISSUES_API = 'https://api.github.com/repos/Link9060/Resonant-Grove/issues?state=open&per_page=30';
const PULLS_API = 'https://api.github.com/repos/Link9060/Resonant-Grove/pulls?state=open&per_page=30';

export type ArrayTask = {
  number: number;
  title: string;
  url: string;
  mode: 'copy' | 'code' | 'queue';
  phase?: 'waiting-approval' | 'approved' | 'dispatched';
};
export type ReviewPr = {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  updatedAt: string;
};
export type GroveReviewQueue = { tasks: ArrayTask[]; reviews: ReviewPr[] };

export function parseTaskIssue(input: unknown): ArrayTask | null {
  const raw = object(input);
  const owner = object(raw?.user);
  if (!raw || owner?.login !== 'Link9060' ||
      typeof raw.number !== 'number' || !Number.isSafeInteger(raw.number) || raw.number < 1 ||
      typeof raw.title !== 'string' || typeof raw.html_url !== 'string' || raw.pull_request ||
      !raw.html_url.startsWith(GROVE_REPO_URL + '/issues/')) return null;
  const mode = raw.title.startsWith('[ARRAY-CODE] ') ? 'code' :
    raw.title.startsWith('[ARRAY] ') ? 'copy' :
    raw.title.startsWith('[ARRAY-QUEUE] ') ? 'queue' : null;
  if (!mode) return null;
  const labels = Array.isArray(raw.labels) ? raw.labels.map(label => object(label)?.name) : [];
  const phase = mode === 'queue' ?
    labels.includes('array-dispatched') ? 'dispatched' :
    labels.includes('array-ready') ? 'approved' : 'waiting-approval' : undefined;
  return { number: raw.number, title: raw.title.slice(0, 150), url: raw.html_url, mode, phase };
}

export function parseReviewPr(input: unknown): ReviewPr | null {
  const raw = object(input);
  const head = object(raw?.head);
  if (!raw || typeof raw.number !== 'number' || !Number.isSafeInteger(raw.number) || raw.number < 1 ||
      typeof raw.title !== 'string' || typeof raw.html_url !== 'string' ||
      typeof head?.ref !== 'string' || !head.ref.startsWith('array/builder-') ||
      !raw.html_url.startsWith(GROVE_REPO_URL + '/pull/')) return null;
  const date = typeof raw.updated_at === 'string' && !Number.isNaN(Date.parse(raw.updated_at))
    ? raw.updated_at : '';
  return { number: raw.number, title: raw.title.slice(0, 150), url: raw.html_url, isDraft: raw.draft === true, updatedAt: date };
}

async function getPublicJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' }, credentials: 'omit', signal });
  if (!response.ok) throw new Error('GitHub review queue unavailable (HTTP ' + response.status + ').');
  return response.json();
}

export async function fetchGroveReviewQueue(signal?: AbortSignal): Promise<GroveReviewQueue> {
  const [issues, prs] = await Promise.all([getPublicJson(ISSUES_API, signal), getPublicJson(PULLS_API, signal)]);
  return {
    tasks: Array.isArray(issues) ? issues.map(parseTaskIssue).filter((task): task is ArrayTask => task !== null).slice(0, 8) : [],
    reviews: Array.isArray(prs) ? prs.map(parseReviewPr).filter((pr): pr is ReviewPr => pr !== null).slice(0, 8) : [],
  };
}

/** Separate public heartbeat feed. This does not run GPT or grant repository writes. */
const SUPERVISOR_API = 'https://api.github.com/repos/Link9060/Resonant-Grove/actions/workflows/array-supervisor.yml/runs?per_page=4';

export async function fetchSupervisorRuns(signal?: AbortSignal): Promise<WorkerRunsSnapshot> {
  const response = await fetch(SUPERVISOR_API, {
    headers: { Accept: 'application/vnd.github+json' },
    credentials: 'omit', signal,
  });
  if (response.status === 404) return { configured: false, runs: [] };
  if (!response.ok) throw new Error('ARRAY supervisor feed unavailable (HTTP ' + response.status + ').');
  return { configured: true, runs: parseWorkerRunsPayload(await response.json()) };
}
