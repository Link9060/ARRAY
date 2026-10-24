import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRun, safeRunId, diagnoseRun, listBuilderRuns, inspectBuilderRun } from '../github.mjs';

const WEB = 'https://github.com/Link9060/Resonant-Grove';
const run = {
  id: 123, path: '.github/workflows/array-builder.yml',
  html_url: WEB + '/actions/runs/123',
  status: 'completed', conclusion: 'failure',
  display_title: 'ARRAY Builder task',
  created_at: '2026-10-24T12:00:00Z',
};
function mockedFetch(contents) {
  return async (url) => {
    const end = String(url).replace('https://api.github.com/repos/Link9060/Resonant-Grove', '');
    const result = contents[end];
    return { ok: result !== undefined, status: result === undefined ? 404 : 200, json: async () => result };
  };
}

test('rejects bad run IDs without API requests', () => {
  for (const id of [-1, 0, 1.4, NaN, Infinity, '123']) assert.throws(() => safeRunId(id));
  assert.equal(safeRunId(123), 123);
});

test('summaries preserve GitHub state without claiming deployment', () => {
  const summary = summarizeRun(run);
  assert.equal(summary.conclusion, 'failure');
  assert.match(summary.note, /verify any proposed PR/i);
  assert.equal(summarizeRun({ ...run, html_url: 'https://example.com/123' }), null);
});

test('run list returns not-configured when the workflow is not yet on main', async () => {
  const result = await listBuilderRuns(mockedFetch({}));
  assert.equal(result.workflowConfigured, false);
  assert.deepEqual(result.runs, []);
});

test('inspect returns a bounded diagnosis from public job steps, not raw logs', async () => {
  const result = await inspectBuilderRun(123, mockedFetch({
    '/actions/runs/123': run,
    '/actions/runs/123/jobs?per_page=25': { jobs: [{
      name: 'Builder', status: 'completed', conclusion: 'failure',
      steps: [{ name: 'Install OpenCode', status: 'completed', conclusion: 'failure' }],
    }] },
  }));
  assert.equal(result.found, true);
  assert.deepEqual(result.diagnosis.failedSteps, ['Builder: Install OpenCode']);
  assert.equal(result.run.state, 'completed');
  assert.equal(Object.hasOwn(result, 'logs'), false);
});

test('ignore non-Builder workflows even if their run ID is valid', async () => {
  const result = await inspectBuilderRun(123, mockedFetch({
    '/actions/runs/123': { ...run, path: '.github/workflows/deploy.yml' },
  }));
  assert.equal(result.found, false);
});

test('non-terminal jobs are never recommended for restart', () => {
  const diag = diagnoseRun({ state: 'in_progress', conclusion: null }, []);
  assert.equal(diag.severity, 'in_progress');
  assert.match(diag.summary, /do not restart/i);
});
