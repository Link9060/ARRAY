import { describe, expect, it } from 'vitest';
import { parseWorkerRun, parseWorkerRunsPayload, parseTaskIssue, parseReviewPr, GROVE_ACTIONS_URL, SUPERVISOR_ACTIONS_URL } from '../src/engine/githubWorkflow';

const base = {
  id: 4567,
  display_title: 'ARRAY Builder: improve Seed form',
  status: 'completed',
  conclusion: 'success',
  created_at: '2026-10-24T16:10:00Z',
  html_url: 'https://github.com/Link9060/Resonant-Grove/actions/runs/4567',
};

describe('Grove Builder external telemetry', () => {
  it('links to actual GitHub Actions, not the ARRAY simulator', () => {
    expect(GROVE_ACTIONS_URL).toContain('/Resonant-Grove/actions/workflows/array-builder.yml');
    expect(parseWorkerRun(base)).toMatchObject({
      id: 4567,
      status: 'success',
      startedAt: base.created_at,
      url: base.html_url,
    });
  });

  it('distinguishes running, failed and cancelled GitHub jobs', () => {
    expect(parseWorkerRun({ ...base, status: 'in_progress', conclusion: null })?.status).toBe('running');
    expect(parseWorkerRun({ ...base, conclusion: 'failure' })?.status).toBe('failure');
    expect(parseWorkerRun({ ...base, conclusion: 'cancelled' })?.status).toBe('cancelled');
    expect(parseWorkerRun({ ...base, status: 'queued', conclusion: null })?.status).toBe('queued');
  });

  it('rejects malformed runs and non-Grove URLs rather than showing fabricated status', () => {
    expect(parseWorkerRun({ ...base, html_url: 'https://example.com/fake' })).toBeNull();
    expect(parseWorkerRun({ ...base, id: 'not-a-number' })).toBeNull();
    expect(parseWorkerRun(null)).toBeNull();
    expect(parseWorkerRunsPayload({ workflow_runs: [base, null, { ...base, id: -2 }] })).toHaveLength(1);
    expect(parseWorkerRunsPayload({ workflow_runs: 'no' })).toEqual([]);
  });

  it('never treats a completed run with no success conclusion as a finished PR', () => {
    expect(parseWorkerRun({ ...base, conclusion: null })?.status).toBe('other');
    expect(parseWorkerRun({ ...base, conclusion: 'timed_out' })?.status).toBe('failure');
  });
});


describe('Grove review queue parsing', () => {
  it('only shows genuine owner-created ARRAY issues', () => {
    const item = {
      number: 8,
      title: '[ARRAY-CODE] Improve New Seed card',
      html_url: 'https://github.com/Link9060/Resonant-Grove/issues/8',
      user: { login: 'Link9060' },
    };
    expect(parseTaskIssue(item)).toMatchObject({ number: 8, mode: 'code' });
    expect(parseTaskIssue({ ...item, title: '[ARRAY] Improve copy' })?.mode).toBe('copy');
    expect(parseTaskIssue({ ...item, user: { login: 'someone-else' } })).toBeNull();
    expect(parseTaskIssue({ ...item, html_url: 'https://evil.example/issues/8' })).toBeNull();
    expect(parseTaskIssue({ ...item, pull_request: { url: 'https://example.com' } })).toBeNull();
    expect(parseTaskIssue({ ...item, title: 'Ordinary issue' })).toBeNull();
  });

  it('only shows genuine ARRAY Builder PRs and preserves draft state', () => {
    const pr = {
      number: 9, title: 'ARRAY Builder: code improvement',
      html_url: 'https://github.com/Link9060/Resonant-Grove/pull/9',
      head: { ref: 'array/builder-123456' },
      draft: true, updated_at: '2026-10-24T18:00:00Z',
    };
    expect(parseReviewPr(pr)).toMatchObject({ number: 9, isDraft: true });
    expect(parseReviewPr({ ...pr, draft: false })?.isDraft).toBe(false);
    expect(parseReviewPr({ ...pr, head: { ref: 'unrelated' } })).toBeNull();
    expect(parseReviewPr({ ...pr, html_url: 'https://elsewhere.example/pull/9' })).toBeNull();
  });
});

describe('ARRAY Supervisor heartbeat and mission queue', () => {
  it('uses the real dedicated GitHub Actions supervisor workflow', () => {
    expect(SUPERVISOR_ACTIONS_URL).toBe('https://github.com/Link9060/Resonant-Grove/actions/workflows/array-supervisor.yml');
  });

  it('surfaces owner-created mission queue approval phases', () => {
    const task = {
      number: 32,
      title: '[ARRAY-QUEUE] Improve one helper sentence',
      html_url: 'https://github.com/Link9060/Resonant-Grove/issues/32',
      user: { login: 'Link9060' },
      labels: [{ name: 'array-copy' }],
    };
    expect(parseTaskIssue(task)).toMatchObject({ number: 32, mode: 'queue', phase: 'waiting-approval' });
    expect(parseTaskIssue({ ...task, labels: [...task.labels, { name: 'array-ready' }] })?.phase).toBe('approved');
    expect(parseTaskIssue({ ...task, labels: [...task.labels, { name: 'array-dispatched' }] })?.phase).toBe('dispatched');
    expect(parseTaskIssue({ ...task, user: { login: 'someone-else' } })).toBeNull();
  });
});
