# ARRAY + Supabase integration

ARRAY uses the user's **existing RAVIN account** to save and reload mission history from the same Supabase project as Grove. ARRAY's real mission execution remains on the RAVIN API. No Supabase row itself starts, runs, or authorizes a worker.

## Backend

- Supabase project: `bzjudqhjrbwglxdfbkmj` (existing RAVIN project).
- Table: `public.array_saved_missions`.
- Auth: the existing ARRAY **Connect RAVIN** email/password form receives an authenticated Supabase access token from RAVIN's `ravin-auth` Edge Function.
- Browser access: the public publishable key and that signed-in user's short-lived JWT, **never a service-role key**.
- Storage: owner-scoped last-known mission snapshots (including explicit `isDemo` flag). RAVIN API status replaces cached live snapshots when both are available.

The migration `grove_array_owner_scoped_storage` has already been applied to the Supabase project. RLS is enabled on the new table, and policies limit SELECT/INSERT/UPDATE/DELETE to `owner_id = auth.uid()`. Anonymous SELECT is disabled.

## Using it

1. Open ARRAY, choose **LIVE RAVIN**, and sign into your existing account.
2. ARRAY will independently load your saved Supabase mission history and attempt to reach the RAVIN worker API.
3. When the RAVIN worker API is available, its live mission state takes priority over saved snapshots.
4. Test/demo missions are still **simulations**. They can be saved to cloud history while you're authenticated, but are never executed as real AI jobs.
5. Signing out clears the on-screen account history.

If cloud history fails, ARRAY shows a Supabase history error. RAVIN's worker API and Supabase can fail independently, so one being online does not imply the other is online.

### Scope and limits

Cloud history is **not** an autonomous mission scheduler, an approval/execution backend, or a cross-device command queue. The real RAVIN API controls execution. A Supabase history write does not activate a worker.

ARRAY currently uses email/password RAVIN authentication. Google sign-in would need an OAuth sign-in pathway wired to the existing RAVIN API's account/session model, as well as provider configuration.

## Code

- `src/engine/arrayCloud.ts`: REST history client with JWT and input validation.
- `src/engine/liveClient.ts`: existing RAVIN auth and live execution, plus access-token accessor for Supabase.
- `src/App.tsx`: loads cloud history and saves snapshots without changing execution status semantics.

## Verification

The database was checked after migration: RLS true, anonymous SELECT false, and four owner-only policies on `array_saved_missions`.

An authenticated end-to-end browser test and production TypeScript build have not been run in this session.
