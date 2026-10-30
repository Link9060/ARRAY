import { describe, expect, it, vi } from 'vitest';
import { createHermesAdapter, HermesAdapterError } from '../integrations/hermes/adapter.mjs';

const setup = (overrides = {}) => createHermesAdapter({
  enabled: true, sandboxConfirmed: true,
  baseUrl: 'http://127.0.0.1:8642', apiKey: 'test-key',
  fetchImpl: vi.fn(async () => ({
    ok: true, json: async () => ({
      choices: [{ finish_reason: 'stop', message: { content: 'Draft complete.' } }],
      usage: { total_tokens: 20 },
    }),
  })),
  ...overrides,
});

describe('Hermes server-side adapter', () => {
  it('is off by default when configured disabled', async () => {
    const agent = setup({ enabled: false });
    expect((await agent.health()).ready).toBe(false);
    await expect(agent.execute({ objective: 'Test', policy: 'assist' }))
      .rejects.toMatchObject({ code: 'DISABLED' });
  });
  it('requires verified tool isolation', () => {
    expect(() => setup({ sandboxConfirmed: false }))
      .toThrow('effect-free sandbox');
  });
  it('rejects unauthenticated/misconfigured external endpoints', () => {
    expect(() => setup({ apiKey: '' })).toThrow(HermesAdapterError);
    expect(() => setup({ baseUrl: 'http://example.org:8642' })).toThrow(HermesAdapterError);
    expect(() => setup({ baseUrl: 'https://token@example.org' })).toThrow(HermesAdapterError);
  });
  it('passes the objective to the authenticated Hermes API without browser credentials', async () => {
    const fetchImpl = vi.fn(async (_url: string, _options: RequestInit) => ({
      ok: true, json: async () => ({
        choices: [{ finish_reason: 'stop', message: { content: 'Draft complete.' } }],
      }),
    }));
    const output = await setup({ fetchImpl }).execute({
      objective: '  Review this TypeScript function  ', policy: 'review',
    });
    expect(output).toMatchObject({ engine: 'hermes', model: 'hermes-agent', output: 'Draft complete.' });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:8642/v1/chat/completions');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-key');
    expect(JSON.parse(String(options.body)).messages[1].content).toBe('Review this TypeScript function');
  });
  it('denies policies that could perform external actions', async () => {
    await expect(setup().execute({ objective: 'Ship changes', policy: 'authorized' }))
      .rejects.toMatchObject({ code: 'POLICY_DENIED' });
  });
  it('never reports an incomplete or errored model turn as successful', async () => {
    const agent = setup({ fetchImpl: async () => ({
      ok: true, json: async () => ({
        choices: [{ finish_reason: 'length', message: { content: 'Partial answer' } }],
      }),
    }) });
    await expect(agent.execute({ objective: 'Test', policy: 'assist' }))
      .rejects.toMatchObject({ code: 'INCOMPLETE_RESULT' });
  });
  it('reports health without triggering inference', async () => {
    const agent = setup({ fetchImpl: async () => ({
      ok: true, json: async () => ({ data: [{ id: 'hermes-agent' }] }),
    }) });
    expect(await agent.health()).toEqual({ ready: true });
  });
});
