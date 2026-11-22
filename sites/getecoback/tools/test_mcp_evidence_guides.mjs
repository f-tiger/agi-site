import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { expandedDefinitions } from '../src/mcp-expanded.mjs';
import { collectToolPages } from '../src/mcp-pagination.mjs';
import { toolGuidePath } from '../site/assets/mcp-catalog-search.mjs';

const origin = 'https://getecoback.com';
const products = '/produkte.html';
const laundry = '/guide/waesche-trocknen-wohnung.html';
const cellar = '/guide/luftentfeuchter-keller.html';
const paths = new Map([
  ['Kaffeemaschinenpflege', `${products}#kaffeevollautomat-pflege-und-kauf`],
  ['Waschmitteldosierung', `${laundry}#waschmittel-automatische-dosierung`],
  ['Spülmittel und Wasserhärte', `${products}#geschirrspueler-wasserhaerte-reiniger`],
  ['Bodenstaubsaugerpflege', `${products}#bodenstaubsauger-belege`],
  ['Dampfbügelgeräte', `${products}#philips-dampfbuegelgeraete-de-belege`],
  ['Stabmixer und Zubehör', `${products}#stabmixer-belege`],
  ['Mikrowellenbelege', `${products}#mikrowelle-bosch-bfl524-belege`],
  ['Küchenwaagen', `${products}#beurer-kuechenwaagen-gebrauch`],
  ['Wasserkocherbelege', `${products}#wasserkocher-bosch-twk8613p`],
  ['Toasterbelege', `${products}#bosch-tat8613-toaster-belege`],
  ['Fenstersauger', `${products}#fenstersauger-belege`],
]);

function offlineWorker() {
  let writes = 0;
  const env = {EVENTS:{prepare() { writes++; throw new Error('Tool-guide probes must not write business events'); }}};
  const headers = {'user-agent':'getecoback-ci/evidence-guides', 'x-probe':'1'};
  async function read(path, rpc) {
    const init = rpc ? {
      method:'POST', headers:{...headers, 'content-type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0', id:1, ...rpc}),
    } : {headers};
    const response = await worker.fetch(new Request(origin + path, init), env, {});
    assert.equal(response.status, 200);
    return response.json();
  }
  return {
    catalogue:params=>read('/api/mcp-tools?' + new URLSearchParams(params)),
    async rpc(method, params) {
      const response = await read('/mcp/v1', {method, params});
      assert.equal(response.error, undefined);
      return response.result;
    },
    assertNoWrites() { assert.equal(writes, 0); },
  };
}

test('each mapped tool publishes the same exact evidence link after a real tool call, with unchanged schema and citation', async () => {
  const h = offlineWorker();
  const standard = await collectToolPages(cursor => h.rpc('tools/list', cursor ? {cursor} : {}));
  const advertised = new Map(standard.map(tool => [tool.name, tool]));
  const compact = new Map((await h.catalogue({view:'compact'})).tools.map(tool => [tool.name, tool]));
  const mapped = expandedDefinitions.filter(tool=>paths.has(tool.category));
  assert.equal(mapped.length, 215);
  assert.equal([...compact.values()].filter(tool=>tool.guide_url).length, mapped.length);

  for (const {name, category, page, properties, example} of mapped) {
    const guidePath = paths.get(category);
    const guide = origin + guidePath;
    const citation = origin + page;
    const schema = {type:'object', properties, required:Object.keys(properties), additionalProperties:false};
    assert.deepEqual(advertised.get(name).inputSchema, schema, name);
    assert.equal(Object.hasOwn(advertised.get(name), 'guide_url'), false, name);
    assert.equal(compact.get(name).guide_url, guide, name);
    assert.equal(toolGuidePath(compact.get(name)), guidePath, name);

    const [exampleRecord] = (await h.catalogue({view:'examples', tool:name})).tools;
    assert.equal(exampleRecord.guide_url, guide, name);
    assert.equal(exampleRecord.citation_url, citation, name);
    assert.equal(exampleRecord.citation_markdown_url, citation.replace(/\.html$/, '.md'), name);
    assert.deepEqual(exampleRecord.example.arguments, example.args, name);
    assert.deepEqual(exampleRecord.example.expected_fields, example.expect, name);

    const result = await h.rpc('tools/call', {name, arguments:example.args});
    assert.equal(result.isError, false, name);
    assert.equal(result.structuredContent.guide_url, guide, name);
    assert.equal(result.structuredContent.citation_url, citation, name);
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent, name);
    for (const [key, expected] of Object.entries(example.expect)) {
      const actual = result.structuredContent[key];
      if (typeof expected === 'number') {
        assert(typeof actual === 'number' && Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${name}.${key}`);
      } else {
        assert.deepEqual(actual, expected, `${name}.${key}`);
      }
    }
  }
  h.assertNoWrites();
});

test('invalid inputs do not include a guide link and unmapped tool results keep their existing shape', async () => {
  const h = offlineWorker();
  const name = 'glassvac_schmutzwassertank_spuelen_oeffnung_ablass';
  const {example} = expandedDefinitions.find(tool=>tool.name===name);
  const {paketkennung: notSent, ...missingRequiredInput} = example.args;
  for (const args of [missingRequiredInput, {...example.args, private_note:'not part of the tool schema'}]) {
    const result = await h.rpc('tools/call', {name, arguments:args});
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent, undefined);
    assert.doesNotMatch(result.content[0].text, /guide_url|produkte\.html|private_note|not part of the tool schema/);
  }

  const unmapped = 'strommessung_hochrechnen';
  const meterArgs = expandedDefinitions.find(tool=>tool.name===unmapped).example.args;
  const meter = await h.rpc('tools/call', {name:unmapped, arguments:meterArgs});
  assert.equal(meter.isError, false);
  assert.equal(meter.structuredContent.eur_for_period, 60);
  assert.equal(meter.structuredContent.citation_url, `${origin}/strommess-protokoll.html`);
  assert.equal(Object.hasOwn(meter.structuredContent, 'guide_url'), false);
  h.assertNoWrites();
});

test('the earlier cellar tool keeps its original citation and referral link', async () => {
  const h = offlineWorker();
  const result = await h.rpc('tools/call', {
    name:'entfeuchter_ablaufcheck', arguments:{drain:'level_or_uphill', model:'meaco-one-20'},
  });
  assert.equal(result.isError, false);
  assert.equal(result.structuredContent.outcome, 'pump_check');
  const citation_url = origin + cellar;
  const guide_url = `${citation_url}?utm_source=eco-mcp&utm_medium=referral&utm_campaign=keller-ablauf#ablauf-vor-kauf`;
  assert.equal(result.structuredContent.citation_url, citation_url);
  assert.equal(result.structuredContent.guide_url, guide_url);
  assert.ok(result.content[0].text.includes(guide_url));
  assert.equal(toolGuidePath({citation_url, guide_url}), cellar);
  h.assertNoWrites();
});

test('the browser only uses a well-formed guide anchor on the canonical citation page', () => {
  const citation_url = origin + products;
  const safe = `${citation_url}#fenstersauger-belege`;
  assert.equal(toolGuidePath({citation_url, guide_url:safe}), `${products}#fenstersauger-belege`);
  for (const unsafe of [
    'https://foreign.test/produkte.html#fenstersauger-belege',
    '//foreign.test/produkte.html#fenstersauger-belege',
    'http://getecoback.com/produkte.html#fenstersauger-belege',
    'https://user:password@getecoback.com/produkte.html#fenstersauger-belege',
    `${origin}${laundry}#waschmittel-automatische-dosierung`,
    `${citation_url}?from=other#fenstersauger-belege`,
    `${citation_url}#fenstersauger%2fbelege`,
    `${citation_url}#fenstersauger@belege`,
    `${citation_url}#`,
    'javascript:alert(1)',
    null,
  ]) {
    assert.equal(toolGuidePath({citation_url, guide_url:unsafe}), products, String(unsafe));
  }
  assert.equal(toolGuidePath({citation_url:'https://foreign.test/produkte.html', guide_url:safe}), null);
});
