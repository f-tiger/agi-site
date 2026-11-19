import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

async function rpc(method, params, events, ua = 'getecoback-ci/drain-release') {
  const response = await worker.fetch(new Request('https://getecoback.com/mcp/v1', {
    method: 'POST', headers: {'content-type': 'application/json', 'user-agent': ua},
    body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params}),
  }), {EVENTS: {prepare: () => ({bind: (...args) => ({run: async () => events.push(args)})})}}, {});
  assert.equal(response.status, 200);
  const message = await response.json();
  assert.equal(message.error, undefined);
  return message.result;
}

const name = 'entfeuchter_ablaufcheck';
const args = {drain: 'level_or_uphill', model: 'meaco-one-20'};

test('a client discovers the read-only tool and gets the documented decision through the published endpoint', async () => {
  const events = [];
  const {tools} = await rpc('tools/list', {}, events);
  const tool = tools.find(t => t.name === name);
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.equal(tool.inputSchema.additionalProperties, false);
  const result = await rpc('tools/call', {name, arguments: args}, events);
  assert.equal(result.isError, false);
  assert.equal(result.structuredContent.outcome, 'pump_check');
  const text = result.content.map(part => part.text).join('\n');
  assert.ok(text.includes('utm_source=eco-mcp&utm_medium=referral&utm_campaign=keller-ablauf#ablauf-vor-kauf'));
  assert.doesNotMatch(JSON.stringify(result), /amazon\.|amzn\.|getecoback-21/i);
  assert.equal(events.length, 0);
});

test('valid and invalid non-QA calls retain only a fixed outcome and never household inputs', async () => {
  const events = [];
  const ua = 'DesktopClient/1.0';
  await rpc('tools/call', {name, arguments: args}, events, ua);
  const invalid = await rpc('tools/call', {name, arguments: {...args, note: 'PRIVATE-HOUSEHOLD'}}, events, ua);
  assert.equal(invalid.isError, true);
  assert.deepEqual(events.map(row => [row[0], JSON.parse(row[1])]), [
    ['mcp_call', {tool: name, outcome: 'pump_check', ua}],
    ['mcp_probe', {tool: name, outcome: 'invalid', ua}],
  ]);
  assert.doesNotMatch(JSON.stringify([events, invalid]), /PRIVATE-HOUSEHOLD|meaco-one-20|level_or_uphill/);
});
