# ARRAY Hermes integration (Phase 1)

Optional server-side Hermes worker adapter, disabled by default. The existing RAVIN/Qwen mission flow remains unchanged.

## Shipped in this branch
- integrations/hermes/adapter.mjs: authenticated Hermes OpenAI-compatible chat-completions client.
- tests/hermesAdapter.test.ts: offline tests using a fake response.
- The ARRAY live client can request engine: hermes only after the existing authenticated RAVIN server advertises it in GET /api/array/capabilities.
- Mission history records engine provenance and the user interface exposes an opt-in engine selector.

## Server-only setup
Install and configure Hermes on a separate trusted server, then enable its API gateway. The Hermes API server uses /v1/chat/completions and bearer authentication (see official API server docs).
Server variables: ARRAY_HERMES_URL, ARRAY_HERMES_API_KEY, ARRAY_HERMES_ENABLED=true, ARRAY_HERMES_SANDBOX_CONFIRMED=true.
Do not put the API key into a VITE_ variable or expose it to browser JavaScript.

Crucial: Hermes normally has terminal, file and other effectful tools. This bridge does not implement an operating-system sandbox. Before marking SANDBOX_CONFIRMED=true, deploy an isolated Hermes instance with ALL effectful tools disabled and verify that restriction independently. An AI instruction is not an access-control mechanism.

## Existing RAVIN server work still required
1. Keep existing Supabase login, server-side ownership checks and mission queue.
2. Expose authenticated GET /api/array/capabilities with engines: [ravin] by default. Add hermes only if enabled, isolated and healthy.
3. On authenticated POST /api/array/missions, accept optional engine: hermes for assist/review-only missions. Reject unsupported engines; never silently fall back.
4. Run createHermesAdapter().execute({ objective, policy, instructions, signal }) in a bounded background worker. Do not block frontend API requests while Hermes runs.
5. Return server-confirmed mission.engine, model, output and truthful job status through the existing API. Handle timeouts/cancellation and record audits.
6. Preserve original RAVIN worker when engine is omitted.

Only when the above backend is deployed set VITE_ARRAY_HERMES_ENABLED=true in the ARRAY build to expose the selector.

This is NOT live deployment of Hermes, tool execution, GitHub writes, autonomous fixes, or production publishing. All such permissions need a separate reviewed workflow.

Run tests: npm run test and npm run build.
Official docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server