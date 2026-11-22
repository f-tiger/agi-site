import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../data/dehum-catalog.json' with {type: 'json'};
import {drainDecision, drainTool} from '../src/mcp-drain.mjs';

const expectedCitation = 'https://getecoback.com/guide/luftentfeuchter-keller.html';
const expectedGuide = 'https://getecoback.com/guide/luftentfeuchter-keller.html?utm_source=eco-mcp&utm_medium=referral&utm_campaign=keller-ablauf#ablauf-vor-kauf';

test('the hose route determines the next check without a model or purchase assumption', () => {
  const expected = {
    downhill: ['gravity_check', /durchgehend mit Gefälle/],
    level_or_uphill: ['pump_check', /zulässige Förderhöhe/],
    no_drain: ['tank', /Tankalarm aktiv/],
    unknown: ['inspect_route', /ganze Schlauchstrecke/],
  };
  for (const [drain, [outcome, advice]] of Object.entries(expected)) {
    const result = drainDecision({drain});
    assert.equal(result.isError, false);
    assert.equal(result.structuredContent.outcome, outcome);
    assert.match(result.structuredContent.answer, advice);
    if (drain === 'level_or_uphill') assert.match(result.structuredContent.answer, /kurze Schwelle.*Zielablauf tiefer/);
    assert.equal(result.structuredContent.model_evidence, null);
    assert.equal(result.structuredContent.citation_url, expectedCitation);
    assert.ok(result.content[0].text.split('\n\n').includes('EcoBack-Ratgeber zitieren: ' + expectedCitation));
    assert.equal(result.structuredContent.guide_url, expectedGuide);
    assert.ok(result.content[0].text.includes(expectedGuide));
    assert.match(result.content[0].text, /Miss zuerst/);
    assert.match(result.content[0].text, /Affiliate/);
    assert.doesNotMatch(JSON.stringify(result), /(?:amazon\.|amzn\.|[?&]tag=)/i);
  }
});

test('selected exact variant and evidence market qualify any pump or hose example', () => {
  for (const product of catalog.products.filter(p => p.status === 'verified')) {
    const evidence = drainDecision({drain: 'level_or_uphill', model: product.id}).structuredContent.model_evidence;
    assert.equal(evidence.name, product.name);
    assert.equal(evidence.variant, product.variant);
    if (product.id !== 'meaco-one-20') assert.equal(evidence.source_url, product.source);
    assert.match(evidence.checked, /^\d{4}-\d{2}-\d{2}$/);
  }
  const read = model => drainDecision({drain: 'level_or_uphill', model}).structuredContent.model_evidence;
  const lukas = read('stadler-lukas');
  assert.equal(lukas.source_market, 'DE');
  assert.match(lukas.note, /100-cm-Schlauch/);
  assert.match(lukas.note, /Ende muss tiefer liegen/);
  const one = read('meaco-one-20');
  assert.equal(one.source_market, 'DE');
  assert.equal(one.source_url, 'https://www.meaco.de/produkt/meaco-dry-arete-one-pumpe/');
  assert.equal(one.checked, '2026-11-22');
  assert.match(one.note, /separat erhältliche Pumpe/);
  assert.match(one.note, /bis zu 2,5 m Förderhöhe.*mitgelieferten 3-m-Schlauch/);
  assert.match(one.note, /6 m am Boden und weiteren 1,5 m Anstieg ist damit nicht bestätigt/);
  assert.match(one.note, /Lieferumfang des Grundgeräts separat klären/);
  const two = read('meaco-two-12');
  assert.equal(two.source_market, 'DE');
  assert.match(two.note, /keine Eignung für diese 12-Liter-Variante/);
  assert.doesNotMatch(read('meaco-one-25').note, /separat erhältliche Pumpe/);
});

test('the moisture finding remains independent of the drainage option', () => {
  for (const drain of drainTool.inputSchema.properties.drain.enum) {
    const advice = moisture => drainDecision({drain, moisture}).structuredContent.moisture_advice;
    assert.match(advice('normal'), /kein Bedarf/);
    assert.match(advice('damage'), /Ursache fachlich klären/);
    assert.match(advice('persistently_high'), /vergleichbarer Temperatur und Luftfeuchte/);
    assert.match(advice('unknown'), /mehrere Tage/);
  }
});

test('invalid or additional inputs return fixed tool errors and never reach the output', () => {
  for (const args of [undefined, null, [], {}, {drain: null}, {drain: 'constructor'}, {drain: 1},
    {drain: 'unknown', model: 'meaco-one-12'}, {drain: 'unknown', moisture: true},
    {drain: 'downhill', privateDetails: 'private-household'}, {drain: 'unknown', model: 'private-household'},
    JSON.parse('{"drain":"unknown","__proto__":"private-household"}')]) {
    const result = drainDecision(args);
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent, undefined);
    assert.doesNotMatch(result.content[0].text, /private-household/);
  }
  assert.match(drainTool.description, /^Prüft .* — Check .*exact model\./);
  assert.equal(drainTool.annotations.readOnlyHint, true);
  assert.equal(drainTool.inputSchema.additionalProperties, false);
  assert.deepEqual(drainTool.inputSchema.required, ['drain']);
});
