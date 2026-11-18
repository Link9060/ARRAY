# ARRAY history migration to ARROW / Relay Supabase

**Shipped on main:** The owner chose an empty, fresh ARROW/Relay cloud history instead of copying old RAVIN records. Previous data was not deleted.

The new destination is the ARROW/Relay project, with a private table named public.array_saved_missions.

- Database permissions: RLS + auth.uid() owner checks. Signed-out users cannot read the table.
- Existing content: No source data was automatically copied into the new table.
- Cloud login: ARRAY cloud history now uses the *ARROW/Relay* Supabase session, separate from the old RAVIN live-mission login.
- Same-origin support: When using the GitHub Pages site, sign in through https://link9060.github.io/Resonant-Relay/ first, then return to ARRAY and choose **CONNECT ARROW HISTORY**. Session storage is origin-scoped: signing in at enterarrow.com does not automatically sign in at link9060.github.io.
- The RAVIN 1.1 live-mission server still depends on the old project's JWT, but this app disables that login by default. A replacement live-mission API would need to be built for RAVIN-CORE before restoring that feature.
- An optional owner-controlled importer is available in Resonant-Grove's `/migration/` page if old data later becomes important; this is not required for the fresh-start plan.
- The old Supabase project is not required for ARRAY cloud history. Its attempted pause was blocked by Supabase's internal hibernation state.

The new adapter requests fresh identity through Supabase Auth and does not trust a cached owner ID or reuse a legacy RAVIN token. No service-role key is shipped in the browser.

## Migration cutover note (November 2026)

The previous 1.1 live-mission backend still depends on the original RAVIN Supabase JWT. It is disabled by default in production, so users are not directed to a sign-in flow that will stop working when the old project is paused. This does not migrate the actual mission executor. `VITE_ARRAY_LEGACY_RAVIN_AUTH=true` temporarily re-enables the legacy client for a test against a running old backend, but it is not a production migration. ARROW mission history and ARRAY simulation remain available without the older database.
