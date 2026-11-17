# ARRAY history migration to ARROW / Relay Supabase

**Development branch only. Do not merge into a production release until the old cloud data has been copied and checked.**

The new destination is the ARROW/Relay project, with a private table named public.array_saved_missions.

- Database permissions: RLS + auth.uid() owner checks. Signed-out users cannot read the table.
- Existing content: No source data was automatically copied into the new table.
- Cloud login: ARRAY cloud history now uses the *ARROW/Relay* Supabase session, separate from the old RAVIN live-mission login.
- Same-origin support: When using the GitHub Pages site, sign in through https://link9060.github.io/Resonant-Relay/ first, then return to ARRAY and choose **CONNECT ARROW HISTORY**. Session storage is origin-scoped: signing in at enterarrow.com does not automatically sign in at link9060.github.io.
- The RAVIN live-mission server still authenticates against the old project. This branch intentionally leaves its live-worker authentication unchanged. That dependency must be separately migrated or retired before the old RAVIN project can be paused.
- Existing ARRAY cloud data can be copied with the owner-controlled migration tool staged in the Resonant-Grove repository's migration branch. It rewrites owner_id to the verified ARROW user rather than copying old Auth credentials.
- The original Supabase project must remain active until you have tested the transfer and verified the destination records.

The new adapter requests fresh identity through Supabase Auth and does not trust a cached owner ID or reuse a legacy RAVIN token. No service-role key is shipped in the browser.
