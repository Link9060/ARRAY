# Resonant ARRAY MCP (read-only foundation)

This service connects public Grove Builder GitHub Actions status to an MCP client (including ChatGPT where custom MCP connections are supported). It does not route requests to a GPT model, expose RAVIN account information, launch agents, or use GitHub secrets.

## Tools

- array_capabilities: explains currently supported actions.
- array_builder_runs: lists real recent Grove Builder runs from public GitHub API.
- array_builder_run: inspects one Builder run and identifies GitHub-reported failing steps.

All tools are read-only. There are no token-backed tools or arbitrary URLs in arguments. The only GitHub repository queried is Link9060/Resonant-Grove. Raw Actions logs may contain sensitive values and are deliberately excluded.

## Local setup

Requires Node.js 22 or newer. From the services/array-mcp folder run:

1. npm install
2. npm test
3. npm run check
4. npm start

Local endpoints are GET http://127.0.0.1:3000/health and POST http://127.0.0.1:3000/mcp (MCP Streamable HTTP, JSON response mode).

For remote hosting, deploy this folder as a Node service. Set HOST=0.0.0.0 and the host-provided PORT, with HTTPS terminated by the hosting provider. GitHub Pages cannot run Node services.

NOT DEPLOYED BY THIS PR. There is no public MCP URL yet.

## Connecting to ChatGPT

If the account or workspace supports Add custom MCP server, use the resulting HTTPS /mcp URL with no authentication. This is safe only for PUBLIC repository metadata. ChatGPT plan and workspace permissions vary; custom MCP creation or write tools may be unavailable. The existing connected GitHub plugin is a practical way to inspect and operate repositories now.

Never add write actions to an unauthenticated public MCP service.

## Future write layer (not implemented)

Before allowing GPT to dispatch or restart workers:

1. Implement OAuth 2.1 authentication and owner-specific authorizations.
2. Verify bearer tokens on every request and enforce per-tool read/write scopes.
3. Restrict command targets to approved repositories and workflow IDs and allowlisted objectives.
4. Require explicit approval for dispatch and retry; cap retries at two per run.
5. Add durable audit records, idempotency keys, and rate limits.
6. Keep code changes on draft PRs. Never automate production merges.
7. Security-test authorization, replay attacks, and secret leak defenses.

This connector does not grant unlimited GPT-6/API tokens or turn a chat into a perpetual model process. Scheduled ChatGPT supervision is a separate integration requiring supported product access.

## Validation

Run npm test and npm run check. ARRAY CI also validates the bridge files when enabled. Check the remote endpoint with an MCP inspector after deployment.
