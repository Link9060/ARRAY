/**
 * Public READ-ONLY MCP bridge.
 * No authentication because EVERY field returned comes from PUBLIC GitHub Actions metadata.
 * Never add write tools or private data here without an OAuth 2.1 authorization layer.
 */
import { createServer } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { inspectBuilderRun, listBuilderRuns, LINKS } from './github.mjs';

function wrap(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
async function guard(fn) {
  try { return wrap(await fn()); }
  catch (error) {
    return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Worker status unavailable.' }] };
  }
}
export function createArrayMcp() {
  const server = new McpServer({ name: 'resonant-array', version: '0.1.0' });
  server.registerTool('array_capabilities', {
    description: 'Discover what this public ARRAY connector can and cannot do. Read-only: no worker dispatch, retries, code edits, or private mission data.',
    inputSchema: {},
  }, async () => wrap({
    name: 'Resonant ARRAY', access: 'public-read-only',
    capabilities: ['list public Grove Builder runs', 'inspect a public Builder run and failed step names'],
    notAvailable: ['start workers', 'restart jobs', 'fetch sensitive logs', 'read private RAVIN missions', 'edit source code'],
    nextSteps: ['Review ARRAY and Grove Builder PRs', 'Configure a model on GitHub', 'Deploy a secured OAuth MCP service for write actions'],
    links: LINKS,
  }));
  server.registerTool('array_builder_runs', {
    description: 'Read real public GitHub Actions states for the Grove OpenCode Builder workflow. Does not run or restart agents.',
    inputSchema: {},
  }, async () => guard(listBuilderRuns));
  server.registerTool('array_builder_run', {
    description: 'Inspect the public state, job steps, and a cautious failure diagnosis of one Grove Builder GitHub Actions run. No raw logs are returned.',
    inputSchema: { runId: z.number().int().positive().safe().describe('GitHub Actions run ID') },
  }, async ({ runId }) => guard(() => inspectBuilderRun(runId)));
  return server;
}

async function handle(req, res) {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, service: 'resonant-array-mcp', mode: 'read-only' }));
    return;
  }
  if (pathname !== '/mcp') {
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found'); return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST', 'content-type': 'text/plain' });
    res.end('Only MCP POST supported (read-only stateless transport).'); return;
  }
  const server = createArrayMcp();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    // Body parsing and validation performed by MCP SDK; capped at its default transport limit.
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('MCP request failed:', error instanceof Error ? error.message : 'unknown');
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'MCP request failed' }));
    } else if (!res.writableEnded) res.end();
  } finally {
    if (res.writableEnded) {
      await transport.close().catch(() => {});
      await server.close().catch(() => {});
    }
  }
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const httpServer = createServer((req, res) => { void handle(req, res); });
  httpServer.listen(port, host, () => console.error('ARRAY read-only MCP listening on ' + host + ':' + port));
}
