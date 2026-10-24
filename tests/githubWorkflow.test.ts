import { describe, expect, it } from 'vitest';
import { parseWorkerRun, parseWorkerRunsPayload, GROVE_ACTIONS_URL } from '../src/engine/githubWorkflow';

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
