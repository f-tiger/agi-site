import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {decide} from '../site/assets/moisture-decision.mjs';

async function rpc(method, params = {}, env = {}, ua = 'getecoback-ci/1.0') {
  const response = await worker.fetch(new Request('https://getecoback.com/mcp/v1', {
    method: 'POST', headers: {'content-type': 'application/json', 'user-agent': ua},
    body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params}),
  }), env, {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.error, undefined);
  return payload.result;
}
const call = (args, env, ua) => rpc('tools/call', {name: 'geraet_wahl', arguments: args}, env, ua);
const body = result => result.content.map(item => item.text || '').join('\n');
const heading = {
  measure: 'Erst messen, dann entscheiden.',
  wait: 'Vorerst keinen Entfeuchter ableiten.',
  cause: 'Die Feuchtequelle zuerst klären.',
  cold: 'Kalte Räume: Leistung bei deiner Temperatur vergleichen.',
  laundry: 'Zuerst Kosten pro gleich trockener Ladung vergleichen.',
  compare: 'Kandidaten gezielt prüfen.',
};

test('all 27 moisture choices return the same next step as the browser rules, without a merchant destination', async () => {
  const seen = new Set();
  for (const purpose of ['room', 'laundry', 'damage']) {
    for (const humidity of ['unknown', 'normal', 'high']) {
      for (const temperature of ['unknown', 'warm', 'cold']) {
        const choices = {purpose, humidity, temperature};
        const expected = decide(choices);
        const result = await call({problem: 'feucht_schimmel', ...choices});
        const text = body(result);
        assert.equal(result.isError, false, JSON.stringify(choices));
        assert.ok(text.startsWith(heading[expected]), JSON.stringify(choices));
        assert.ok(text.includes('https://getecoback.com/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice'));
        assert.ok(text.includes('keine Ferndiagnose'));
        assert.ok(text.includes('Affiliate'));
        assert.ok(!/https?:\/\/[^\s]*(?:amazon\.|amzn\.)|[?&]tag=/i.test(text));
        assert.ok(!/real ≈|fehlt Schimmel die Grundlage|Faustregel für|\d+[–-]\d+ Liter\/Tag/.test(text));
        seen.add(expected);
      }
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(heading).sort());
});

test('legacy calls stay valid but floor area cannot infer capacity, and missing conditions stay unknown', async () => {
  const legacy = await call({problem: 'feucht_schimmel', qm: 20});
  for (const qm of [4, 120, 10000]) {
    assert.deepEqual(await call({problem: 'feucht_schimmel', qm}), legacy);
  }
  assert.equal(legacy.isError, false);
  assert.ok(body(legacy).startsWith(heading.measure));
  assert.ok(body(await call({problem: 'feucht_schimmel', humidity: 'high'})).startsWith(heading.measure));
  assert.ok(body(await call({problem: 'feucht_schimmel', purpose: 'damage'})).startsWith(heading.cause));
  assert.ok(body(await call({problem: 'feucht_schimmel', humidity: 'normal'})).startsWith(heading.wait));
});

test('invalid optional values are fixed tool errors, never coercion or reflected caller text', async () => {
  for (const field of ['purpose', 'humidity', 'temperature']) {
    for (const value of [null, true, 0, {}, [], 'constructor', '<script>private-household-detail</script>']) {
      const result = await call({problem: 'feucht_schimmel', [field]: value});
      assert.equal(result.isError, true, field + ': ' + JSON.stringify(value));
      assert.ok(body(result).startsWith('Ungültige Auswahl:'));
      assert.ok(!body(result).includes('private-household-detail'));
    }
  }
});

test('tool schema keeps legacy inputs optional and documents bounded choices and their limits', async () => {
  const {tools} = await rpc('tools/list');
  assert.equal(tools.length, 9);
  const schema = tools.find(tool => tool.name === 'geraet_wahl').inputSchema;
  assert.deepEqual(schema.required, ['problem']);
  assert.deepEqual(schema.properties.purpose.enum, ['room', 'laundry', 'damage']);
  assert.deepEqual(schema.properties.humidity.enum, ['unknown', 'normal', 'high']);
  assert.deepEqual(schema.properties.temperature.enum, ['unknown', 'warm', 'cold']);
  assert.ok(schema.properties.humidity.description.includes('keine Schimmelfrei-Garantie'));
  assert.ok(schema.properties.temperature.description.includes('keine allgemeine Betriebsgrenze'));
  assert.ok(schema.properties.qm.description.includes('heating/cooling only'));
  const init = await rpc('initialize');
  assert.equal(init.serverInfo.version, '1.3.2');
  assert.ok(init.instructions.includes('keine Affiliate-Kauflinks'));
});

test('router telemetry stores fixed outcomes only, excludes QA, and leaves other tool audits unchanged', async () => {
  const rows = [];
  const env = {EVENTS: {prepare: () => ({bind: (...args) => ({run: async () => rows.push(args)})})}};
  const args = {problem: 'feucht_schimmel', purpose: 'damage', humidity: 'high', temperature: 'cold', qm: 37,
    note: 'PRIVATE-ADDRESS-AND-HOUSEHOLD', secret: {nested: 'PRIVATE-NESTED'}};
  await call(args, env);
  assert.equal(rows.length, 0, 'self-tests are not adoption');
  await call(args, env, 'ExampleDesktop/1.0');
  assert.equal(rows[0][0], 'mcp_call');
  assert.deepEqual(JSON.parse(rows[0][1]), {tool: 'geraet_wahl', outcome: 'cause', ua: 'ExampleDesktop/1.0'});
  await call({...args, temperature: 'PRIVATE-BAD-VALUE'}, env, 'ExampleDesktop/1.0');
  assert.equal(rows[1][0], 'mcp_probe');
  assert.deepEqual(JSON.parse(rows[1][1]), {tool: 'geraet_wahl', outcome: 'invalid', ua: 'ExampleDesktop/1.0'});
  await call({problem: 'zu_heiss', qm: 37, note: 'PRIVATE-OTHER-CHOICE'}, env, 'ExampleDesktop/1.0');
  assert.equal(JSON.parse(rows[2][1]).outcome, 'zu_heiss');
  assert.ok(!JSON.stringify(rows).includes('PRIVATE'));
  assert.ok(!JSON.stringify(rows).includes('37'));
  await rpc('tools/call', {name: 'btu_empfehlung', arguments: {qm: 20, sonne: 'normal'}}, env, 'ExampleDesktop/1.0');
  assert.equal(JSON.parse(rows[3][1]).args, '{"qm":20,"sonne":"normal"}');
});

test('heating, cooling and stale-air routes retain their existing calculations and guides', async () => {
  for (const [problem, expected] of [
    ['zu_heiss', ['7.000 BTU', 'klimaanlage-20-qm.html']],
    ['zu_kalt', ['1.200–2.000 W', 'heizung-20-qm.html']],
    ['stickige_luft', ['erst richtig lüften', 'luftentfeuchter-oder-luftreiniger.html']],
  ]) {
    const result = await call({problem, qm: 20});
    assert.equal(result.isError, false);
    for (const text of expected) assert.ok(body(result).includes(text), problem + ': ' + text);
  }
});
