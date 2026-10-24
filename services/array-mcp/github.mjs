/** Public GitHub Actions metadata only. This module NEVER fetches raw job logs or tokens. */
const API = 'https://api.github.com/repos/Link9060/Resonant-Grove';
const WEB = 'https://github.com/Link9060/Resonant-Grove';
const WORKFLOW = 'array-builder.yml';

export const LINKS = Object.freeze({
  repo: WEB,
  builder: WEB + '/actions/workflows/' + WORKFLOW,
  array: 'https://github.com/Link9060/ARRAY',
});

async function githubGet(path, fetchImpl = fetch) {
  // All paths supplied by this module; callers cannot inject a hostname.
  const response = await fetchImpl(API + path, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Resonant-ARRAY-MCP/0.1',
    },
    signal: AbortSignal.timeout(12000),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error('GitHub returned HTTP ' + response.status + '; inspect Actions directly.');
  }
  return response.json();
}

export function safeRunId(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError('Run ID must be a positive integer.');
  }
  return value;
}

export function summarizeRun(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!Number.isSafeInteger(raw.id) || typeof raw.html_url !== 'string' ||
      !raw.html_url.startsWith(WEB + '/actions/runs/')) return null;
  const status = typeof raw.status === 'string' ? raw.status : 'unknown';
  const conclusion = typeof raw.conclusion === 'string' ? raw.conclusion : null;
  return {
    id: raw.id,
    title: String(raw.display_title || 'ARRAY Builder mission').slice(0, 160),
    state: status,
    conclusion,
    startedAt: raw.run_started_at || raw.created_at || null,
    finishedAt: status === 'completed' ? (raw.updated_at || null) : null,
    url: raw.html_url,
    branch: String(raw.head_branch || 'unknown').slice(0, 120),
    // A completed workflow is not proof that a draft PR was opened or merged.
    note: 'GitHub workflow state only; verify any proposed PR separately.',
  };
}

export function summarizeJob(raw) {
  return {
    id: Number.isSafeInteger(raw?.id) ? raw.id : null,
    name: String(raw?.name || 'Unnamed job').slice(0, 120),
    status: String(raw?.status || 'unknown'),
    conclusion: raw?.conclusion || null,
    steps: Array.isArray(raw?.steps) ? raw.steps.map(step => ({
      name: String(step?.name || 'Unnamed step').slice(0, 120),
      status: String(step?.status || 'unknown'),
      conclusion: step?.conclusion || null,
    })).slice(0, 50) : [],
  };
}

export function diagnoseRun(run, jobs) {
  if (!run) return { severity: 'unknown', summary: 'The specified run was not found.' };
  if (run.state !== 'completed') {
    return { severity: 'in_progress', summary: 'The run has not finished; do not restart it.' };
  }
  if (run.conclusion === 'success') {
    return { severity: 'passed', summary: 'The workflow passed. Confirm a draft pull request was created before marking the mission delivered.' };
  }
  if (run.conclusion === 'cancelled') {
    return { severity: 'cancelled', summary: 'The run was cancelled. Do not automatically restart without owner instruction.' };
  }
  const failed = jobs.flatMap(job => job.steps
    .filter(step => step.conclusion === 'failure' || step.conclusion === 'timed_out')
    .map(step => job.name + ': ' + step.name));
  if (failed.length) {
    return {
      severity: 'failed',
      summary: 'One or more GitHub job steps failed; check the run on GitHub before choosing a fix.',
      failedSteps: failed.slice(0, 12),
    };
  }
  return {
    severity: 'needs_review',
    summary: 'The run did not succeed. Inspect the GitHub run before deciding whether a retry is appropriate.',
  };
}

export async function listBuilderRuns(fetchImpl = fetch) {
  const raw = await githubGet('/actions/workflows/' + WORKFLOW + '/runs?per_page=8', fetchImpl);
  return {
    repo: WEB,
    actionsUrl: LINKS.builder,
    workflowConfigured: raw !== null,
    runs: Array.isArray(raw?.workflow_runs)
      ? raw.workflow_runs.map(summarizeRun).filter(Boolean) : [],
  };
}

export async function inspectBuilderRun(runId, fetchImpl = fetch) {
  const id = safeRunId(runId);
  const runRaw = await githubGet('/actions/runs/' + id, fetchImpl);
  // Refuse to show unrelated workflows from the same repository.
  if (!runRaw || typeof runRaw.path !== 'string' ||
      !runRaw.path.endsWith('/' + WORKFLOW)) {
    return { found: false, message: 'ARRAY Builder run not found.', actionsUrl: LINKS.builder };
  }
  const run = summarizeRun(runRaw);
  if (!run) return { found: false, message: 'Invalid workflow run response.', actionsUrl: LINKS.builder };
  const jobsRaw = await githubGet('/actions/runs/' + id + '/jobs?per_page=25', fetchImpl);
  const jobs = Array.isArray(jobsRaw?.jobs) ? jobsRaw.jobs.map(summarizeJob) : [];
  return { found: true, run, jobs, diagnosis: diagnoseRun(run, jobs), logsAvailableAt: run.url };
}
