import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesMonitorBudget, desiredRule, rulePlan, monitorBudget, RULE_REF, MONITORS, TARGETS, ZONES } from './mcp-monitor-budget.mjs';

const PHASE = 'http_request_firewall_custom';
const clone = value => structuredClone(value);
const other = { id: 'owner-rule', ref: 'owner', version: '1', enabled: true, action: 'block', expression: 'http.request.uri.path eq "/private"' };
const ruleset = (rules = [other]) => ({ id: 'set', version: '1', kind: 'zone', phase: PHASE, rules: clone(rules) });
const ours = zone => ({ ...desiredRule(zone), id: 'ours', version: '1', last_updated: 'before' });
const credentials = [{ token: 'first-test-token' }, { token: 'second-test-token' }];

// Independent parser for the small Cloudflare expression grammar used here. Exercise
// the actual emitted expression, not just its companion JavaScript matcher.
function evaluate(expression, request) {
  const tokens = expression.match(/"(?:\\.|[^"\\])*"|[(){}]|[\w.]+/g);
  let index = 0;
  const expect = token => assert.equal(tokens[index++], token);
  const fields = { 'http.host': request.hostname, 'http.user_agent': request.userAgent, 'http.request.uri.path': request.path, 'http.request.method': request.method };
  function atom() {
    if (tokens[index] === '(') { index++; const result = or(); expect(')'); return result; }
    const field = tokens[index++], operator = tokens[index++];
    assert(Object.hasOwn(fields, field));
    if (operator === 'eq') return fields[field] === JSON.parse(tokens[index++]);
    assert.equal(operator, 'in'); expect('{'); const values = [];
    while (tokens[index] !== '}') values.push(JSON.parse(tokens[index++]));
    expect('}'); return values.includes(fields[field]);
  }
  function and() { let result = atom(); while (tokens[index] === 'and') { index++; const next = atom(); result = result && next; } return result; }
  function or() { let result = and(); while (tokens[index] === 'or') { index++; const next = and(); result = result || next; } return result; }
  const result = or(); assert.equal(index, tokens.length); return result;
}
const agiBeatHosts = ['', 'calls.', 'compute.', 'disclosures.', 'evidence.', 'incentives.', 'mcppulse.', 'permit.', 'proof.', 'protocol.', 'reconcile.', 'route.', 'web3.'].map(prefix => `${prefix}agiscorecard.com`);
const expected = [
  ...agiBeatHosts.map(hostname => [hostname, '/mcp', MONITORS[0]]),
  ...['agiscorecard.com', 'mcppulse.agiscorecard.com', 'web3.agiscorecard.com'].map(hostname => [hostname, '/mcp', MONITORS[1]]),
  ...MONITORS.map(ua => ['source.agiscorecard.com', '/api/mcp', ua]),
  ...['/api/mcp', '/api/ai-mcp', '/api/startup-mcp', '/api/video-mcp'].map(path => ['baipiaoji.com', path, MONITORS[0]]),
  ['baipiaoji.com', '/api/mcp', MONITORS[1]],
  ...MONITORS.flatMap(ua => ['/mcp', '/mcp/', '/mcp/v1'].map(path => ['getecoback.com', path, ua])),
  ['thedollscout.com', '/mcp', MONITORS[0]],
];
const key = tuple => JSON.stringify(tuple);
const expectedSet = new Set(expected.map(key));
const zoneFor = hostname => ZONES.find(zone => hostname === zone || hostname.endsWith(`.${zone}`));

test('fixed scope is exactly the observed 30 hostname/path/full-UA tuples', () => {
  const actual = Object.values(TARGETS).flatMap(groups => groups.flatMap(target => target.hosts.flatMap(host => target.paths.flatMap(path => target.userAgents.map(ua => [host, path, ua])))));
  assert.equal(actual.length, 30);
  assert.deepEqual(new Set(actual.map(key)), expectedSet);
  for (const zone of ZONES) {
    const expression = desiredRule(zone).expression;
    assert(expression.length <= 4096);
    assert(!expression.includes('starts_with') && !expression.includes('contains'));
  }
  assert.throws(() => desiredRule('new.agiscorecard.com'), /Unsupported zone/);
});

test('emitted firewall expression and matcher preserve ordinary clients, discovery, methods and unseen combinations', () => {
  const hosts = [...new Set(expected.map(tuple => tuple[0])), 'new.agiscorecard.com', 'www.baipiaoji.com', 'agiscorecard.com.evil.test', 'evil.test', undefined];
  const paths = [...new Set(expected.map(tuple => tuple[1])), '/', '/robots.txt', '/sitemap.xml', '/.well-known/mcp.json', '/server.json', '/mcp.html', '/api/account', '/api/mcp/', '/api/mcp-extra', '/mcp/tool', '/%6dcp'];
  const uas = [...MONITORS, 'mcpbeat/0.1', 'SentinelOracle/0.1', `${MONITORS[0]} extra`, `prefix ${MONITORS[1]}`, MONITORS[0].toUpperCase(), 'node', 'python-httpx/0.28', 'Googlebot', 'ClaudeBot', 'codex-mcp-client/0.164', 'Mozilla/5.0', ''];
  for (const hostname of hosts) for (const path of paths) for (const userAgent of uas) for (const method of ['GET', 'POST', 'HEAD', 'OPTIONS']) {
    const request = { hostname, path, userAgent, method };
    const blocked = ['GET', 'POST'].includes(method) && expectedSet.has(key([hostname, path, userAgent]));
    assert.equal(matchesMonitorBudget(request), blocked, JSON.stringify(request));
    const zone = zoneFor(hostname || '');
    if (zone) assert.equal(evaluate(desiredRule(zone).expression, request), blocked, JSON.stringify(request));
  }
});

test('plan never edits its input, reserves owner rules and previews preceding enabled skips', () => {
  const set = ruleset(); const snapshot = clone(set);
  assert.equal(rulePlan(set, 'apply', ZONES[0]).operation, 'append');
  assert.deepEqual(set, snapshot);
  const skip = { ...other, id: 'skip', action: 'skip', action_parameters: { ruleset: 'current' }, expression: 'true' };
  const blocked = rulePlan(ruleset([skip]), 'apply', ZONES[0]);
  assert.equal(blocked.operation, 'blocked'); assert.equal(blocked.precedingSkips[0].id, 'skip'); assert.equal(blocked.precedingSkips[0].order, 1);
  assert.equal(rulePlan(ruleset([{ ...skip, enabled: false }]), 'apply', ZONES[0]).operation, 'append');
  assert.equal(rulePlan(ruleset([ours(ZONES[0]), skip]), 'apply', ZONES[0]).operation, 'unchanged');
  assert.equal(rulePlan(ruleset([skip, ours(ZONES[0])]), 'apply', ZONES[0]).operation, 'blocked');
  const rollback = rulePlan(ruleset([skip, ours(ZONES[0])]), 'disable', ZONES[0]);
  assert.equal(rollback.operation, 'update'); assert.deepEqual(rollback.patch, { enabled: false });
  assert.equal(rulePlan(ruleset(Array.from({ length: 5 }, (_, i) => ({ ...other, id: `rule${i}`, ref: `owner${i}` }))), 'apply', ZONES[0]).operation, 'blocked');
  assert.equal(rulePlan(ruleset([ours(ZONES[0]), { ...ours(ZONES[0]), id: 'duplicate' }]), 'apply', ZONES[0]).operation, 'blocked');
});

function mockCloudflare({ initial = () => ruleset(), readDenied = [], writeDenied = false, listDenied = false, missingEntrypoint = false, listedPhase = false, drift = false, failAfterMutation = false, verificationDenied = false, changeOtherOnWrite = false } = {}) {
  const states = new Map(ZONES.map(zone => [zone, clone(initial(zone))]));
  const reads = new Map(); const calls = [];
  const response = (result, status = 200, message = 'denied') => new Response(JSON.stringify(status < 400 ? { success: true, result } : { success: false, errors: [{ code: 10003, message }] }), { status });
  async function fetcher(url, options = {}) {
    const parsed = new URL(url), path = parsed.pathname.replace('/client/v4/', ''), method = options.method || 'GET';
    const token = options.headers.authorization.slice(7), body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path, method, token, body });
    if (path === 'zones') return response([{ id: parsed.searchParams.get('name'), name: parsed.searchParams.get('name') }]);
    const zone = path.split('/')[1], state = states.get(zone);
    assert(ZONES.includes(zone));
    if (method === 'GET') {
      if (readDenied.includes(token)) return response(null, 403, 'not permitted');
      if (path.endsWith('/entrypoint')) {
        const readCount = (reads.get(zone) || 0) + 1; reads.set(zone, readCount);
        if (verificationDenied && calls.some(call => call.method !== 'GET' && call.path.includes(zone))) return response(null, 403, 'verification denied');
        if (drift && readCount === 2 && state) { state.version = 'drift'; state.rules.push({ ...other, id: 'new-owner-rule', ref: 'new-owner-rule' }); }
        return state && !missingEntrypoint ? response(state) : response(null, 404, 'entrypoint not found');
      }
      if (path.endsWith('/rulesets')) return listDenied ? response(null, 403, 'list denied') : response(listedPhase ? [{ id: 'hidden', phase: PHASE }] : state ? [{ id: state.id, phase: PHASE }] : []);
      throw Error(`Unexpected read ${path}`);
    }
    if (writeDenied) return response(null, 403, `write denied for ${token}`);
    if (method === 'POST' && path.endsWith('/rulesets')) {
      assert.equal(state, null); assert.deepEqual(Object.keys(body).sort(), ['kind', 'name', 'phase', 'rules']);
      states.set(zone, { ...body, id: 'new-set', version: '1', rules: body.rules.map(rule => ({ ...rule, id: 'ours', version: '1', last_updated: 'after' })) });
    } else if (method === 'POST' && path.endsWith('/rules')) {
      assert.equal(body.ref, RULE_REF); assert(!Object.hasOwn(body, 'rules')); assert(!Object.hasOwn(body, 'position'));
      state.rules.push({ ...body, id: 'ours', version: '1', last_updated: 'after' }); state.version = '2';
    } else if (method === 'PATCH' && path.includes('/rules/')) {
      const own = state.rules.find(rule => rule.id === path.split('/').at(-1)); assert.equal(own.ref, RULE_REF);
      assert(!Object.hasOwn(body, 'position')); Object.assign(own, body, { version: '2', last_updated: 'after' }); state.version = '2';
    } else throw Error(`Forbidden write ${method} ${path}`);
    if (changeOtherOnWrite) states.get(zone).rules[0].description = 'changed concurrently';
    if (failAfterMutation) throw Error('Connection closed after server accepted request');
    return response(states.get(zone));
  }
  return { fetcher, calls, states, writes: () => calls.filter(call => call.method !== 'GET') };
}
const run = (mock, mode = 'apply') => monitorBudget({ candidates: credentials, mode, fetcher: mock.fetcher });

test('inspect is read-only and preserves private preview IDs, versions, order and skip details', async () => {
  const skip = { ...other, id: 'skip', action: 'skip', action_parameters: { ruleset: 'current' } };
  const mock = mockCloudflare({ initial: () => ruleset([other, skip]) });
  const result = await run(mock, 'inspect'); assert.equal(mock.writes().length, 0);
  for (const receipt of result) {
    assert.equal(receipt.operation, 'blocked'); assert.equal(receipt.before.id, 'set'); assert.equal(receipt.before.version, '1');
    assert.deepEqual(receipt.before.rules.map(rule => [rule.id, rule.version, rule.order]), [['owner-rule', '1', 1], ['skip', '1', 2]]);
    assert.deepEqual(receipt.precedingSkips[0].action_parameters, { ruleset: 'current' });
  }
});

test('apply appends only our ref and repeated apply is idempotent without modifying owner rules', async () => {
  const mock = mockCloudflare(); const first = await run(mock);
  assert.equal(mock.writes().length, 4);
  for (const receipt of first) { assert.equal(receipt.applied, true); assert.equal(receipt.verified, true); assert.equal(receipt.ruleId, 'ours'); }
  for (const state of mock.states.values()) assert.deepEqual(state.rules[0], other);
  const second = await run(mock); assert.equal(mock.writes().length, 4);
  assert(second.every(receipt => receipt.operation === 'unchanged' && !receipt.applied));
  assert(mock.writes().every(call => call.method === 'POST' && call.path.endsWith('/rules')));
});

test('disable patches enabled only, preserves ID/order/expression and tolerates preceding skip', async () => {
  const skip = { ...other, id: 'skip', ref: 'skip', action: 'skip' };
  const mock = mockCloudflare({ initial: zone => ruleset([skip, { ...ours(zone), expression: 'old exact expression', description: 'retain description' }, other]) });
  const before = clone(mock.states); const result = await run(mock, 'disable');
  assert(result.every(receipt => receipt.applied && receipt.verified));
  assert(mock.writes().every(call => call.method === 'PATCH' && call.path.endsWith('/rules/ours') && JSON.stringify(call.body) === '{"enabled":false}'));
  for (const [zone, state] of mock.states) { assert.equal(state.rules[1].expression, before.get(zone).rules[1].expression); assert.deepEqual(state.rules[0], skip); assert.deepEqual(state.rules[2], other); }
  const again = await run(mock, 'disable'); assert(again.every(receipt => receipt.operation === 'unchanged')); assert.equal(mock.writes().length, 4);
});

test('apply updates or re-enables only the managed rule in its existing position', async () => {
  const trailing = { ...other, id: 'trailing-rule', ref: 'trailing' };
  const mock = mockCloudflare({ initial: zone => ruleset([other, { ...ours(zone), enabled: false, expression: 'old expression' }, trailing]) });
  const result = await run(mock);
  assert(result.every(receipt => receipt.operation === 'update' && receipt.verified));
  assert(mock.writes().every(call => call.method === 'PATCH' && call.path.endsWith('/rules/ours') && call.body.ref === RULE_REF));
  for (const [zone, state] of mock.states) {
    assert.deepEqual(state.rules[0], other); assert.deepEqual(state.rules[2], trailing);
    assert.equal(state.rules[1].id, 'ours'); assert.equal(state.rules[1].enabled, true);
    assert.equal(state.rules[1].expression, desiredRule(zone).expression);
  }
});

test('disable absent rules, apply with skips, full slots and duplicate managed refs perform no writes', async () => {
  for (const options of [
    { initial: () => ruleset([{ ...other, action: 'skip' }]) },
    { initial: () => ruleset(Array.from({ length: 5 }, (_, i) => ({ ...other, id: `other${i}`, ref: `other${i}` }))) },
    { initial: zone => ruleset([ours(zone), { ...ours(zone), id: 'duplicate' }]) },
  ]) {
    const mock = mockCloudflare(options); const result = await run(mock);
    assert.equal(mock.writes().length, 0); assert(result.every(receipt => receipt.operation === 'blocked'));
  }
  const absent = mockCloudflare(); assert((await run(absent, 'disable')).every(receipt => receipt.operation === 'absent')); assert.equal(absent.writes().length, 0);
});

test('read permission fallback selects one authorized identity; write permission failures never retry and redact tokens', async () => {
  const denied = mockCloudflare({ readDenied: credentials.map(item => item.token) });
  assert((await run(denied)).every(receipt => receipt.error)); assert.equal(denied.writes().length, 0);
  const fallback = mockCloudflare({ readDenied: [credentials[0].token] });
  assert((await run(fallback)).every(receipt => receipt.verified)); assert(fallback.writes().every(call => call.token === credentials[1].token));
  const noWrite = mockCloudflare({ writeDenied: true }); const result = await run(noWrite);
  assert.equal(noWrite.writes().length, 4); assert(noWrite.writes().every(call => call.token === credentials[0].token));
  assert(result.every(receipt => !receipt.applied && receipt.writeOutcome === 'rejected'));
  for (const candidate of credentials) assert(!JSON.stringify(result).includes(candidate.token));
});

test('missing entrypoint requires a successful phase listing before create', async () => {
  const absent = mockCloudflare({ initial: () => null }); const result = await run(absent);
  assert(result.every(receipt => receipt.operation === 'create' && receipt.verified)); assert.equal(absent.writes().length, 4);
  for (const option of [{ listDenied: true }, { listedPhase: true }]) {
    const denied = mockCloudflare({ initial: () => null, ...option });
    assert((await run(denied)).every(receipt => receipt.error)); assert.equal(denied.writes().length, 0);
  }
  const hidden = mockCloudflare({ missingEntrypoint: true });
  assert((await run(hidden)).every(receipt => receipt.error)); assert.equal(hidden.writes().length, 0);
});

test('pre-write ruleset drift blocks every mutation and preserves the new owner rule', async () => {
  const mock = mockCloudflare({ drift: true }); const result = await run(mock);
  assert.equal(mock.writes().length, 0); assert(result.every(receipt => receipt.operation === 'blocked' && /changed since/.test(receipt.blockedReason)));
  assert([...mock.states.values()].every(state => state.rules.at(-1).ref === 'new-owner-rule'));
});

test('ambiguous write outcome is reported unknown without retry, even if server applied it', async () => {
  const mock = mockCloudflare({ failAfterMutation: true }); const result = await run(mock);
  assert.equal(mock.writes().length, 4); assert(result.every(receipt => receipt.writeOutcome === 'unknown' && receipt.applied === null && receipt.error));
  assert([...mock.states.values()].every(state => state.rules.filter(rule => rule.ref === RULE_REF).length === 1));
});

test('post-write verification failures report acknowledged but unverified, without overwriting or rolling back owner rules', async () => {
  for (const options of [{ verificationDenied: true }, { changeOtherOnWrite: true }]) {
    const mock = mockCloudflare(options); const result = await run(mock);
    assert.equal(mock.writes().length, 4); assert(result.every(receipt => receipt.applied && receipt.verified === false && receipt.error));
    if (options.changeOtherOnWrite) assert([...mock.states.values()].every(state => state.rules[0].description === 'changed concurrently'));
  }
});

test('invalid mode and no credentials cannot mutate any zone', async () => {
  const mock = mockCloudflare(); await assert.rejects(() => run(mock, 'replace'), /Unsupported rule mode/);
  assert.equal(mock.calls.length, 0);
  const result = await monitorBudget({ candidates: [], mode: 'apply', fetcher: mock.fetcher });
  assert(result.every(receipt => /No configured credential/.test(receipt.error))); assert.equal(mock.calls.length, 0);
});
