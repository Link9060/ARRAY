import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createArrayMcp } from '../server.mjs';

test('MCP handshake exposes only public read-only ARRAY tools', async () => {
  const server = createArrayMcp();
  const client = new Client({ name: 'array-ci', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(tool => tool.name).sort(),
      ['array_builder_run', 'array_builder_runs', 'array_capabilities']);
    const answer = await client.callTool({ name: 'array_capabilities', arguments: {} });
    assert.equal(answer.isError, undefined);
    const response = JSON.parse(answer.content[0].text);
    assert.equal(response.access, 'public-read-only');
    assert.ok(response.notAvailable.includes('start workers'));
  } finally {
    await client.close().catch(() => {});
    await server.close().catch(() => {});
  }
});
