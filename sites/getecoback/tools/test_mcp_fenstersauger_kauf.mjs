import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/worker.js';
import {expandedCall, expandedCatalog} from '../src/mcp-expanded.mjs';
import {fenstersaugerSprossenKauf} from '../src/mcp-fenstersauger-kauf.mjs';
import {WINDOW_ENTRY_URL} from '../src/fenstersauger-entry.mjs';

const {name, example} = fenstersaugerSprossenKauf;
const canonical = 'https://getecoback.com/produkte.html';
const evidence = canonical + '#fenstersauger-belege';
const result = args => {
  const response = expandedCall(name, {...example.args, ...args});
  assert.equal(response.isError, false);
  assert.deepEqual(JSON.parse(response.content[0].text), response.structuredContent);
  return response.structuredContent;
};
const passes = value => value.nominell_passende_originalpakete.map(
  ({artikel, passende_arbeitsbreiten_mm}) => [artikel, passende_arbeitsbreiten_mm],
);

test('filters exact German original packages with symmetric side clearance', () => {
  const small = result({lichte_breite_mm:143,spiel_pro_seite_mm:5});
  assert.equal(small.nutzbreite_mm, 133);
  assert.deepEqual(passes(small), [['06008B7000',[133]]]);
  assert.match(small.nominell_passende_originalpakete[0].anleitung, /glassvac-100045834-original-pdf-396340-de-de\.pdf$/);
  assert.deepEqual(passes(result({lichte_breite_mm:190,spiel_pro_seite_mm:10})),
    [['1.633-698.0',[170]],['1.633-785.0',[170]],['06008B7000',[133]]]);
  assert.deepEqual(passes(result({lichte_breite_mm:286,spiel_pro_seite_mm:10})),
    [['1.633-698.0',[170]],['1.633-785.0',[170]],['06008B7000',[133,266]]]);
  assert.deepEqual(passes(result({lichte_breite_mm:300,spiel_pro_seite_mm:10})),
    [['1.633-662.0',[280]],['1.633-698.0',[170,280]],['1.633-785.0',[170,280]],['06008B7000',[133,266]]]);
});

test('treats rounded decimal equality as nominal fit and still excludes a genuinely wider head', () => {
  const existing = result({lichte_breite_mm:143.7,spiel_pro_seite_mm:5.2,vorhandene_duese_mm:133.3,kauf_geplant:true});
  assert.equal(existing.vorhandene_duese_nominell_passend,true);
  assert.equal(existing.folgeschritt,'vorhandene_duese_zuerst_probesetzen');
  assert.equal(Object.hasOwn(existing,'entry_url'),false);
  assert.deepEqual(passes(result({lichte_breite_mm:256.4,spiel_pro_seite_mm:61.7})), [['06008B7000',[133]]]);
  assert.deepEqual(passes(result({lichte_breite_mm:256.39999,spiel_pro_seite_mm:61.7})), []);
});

test('only a planned purchase with an evidence-backed shortlist and no usable nozzle returns the entry', () => {
  for (const args of [
    {kauf_geplant:false},
    {lichte_breite_mm:0, kauf_geplant:true},
    {lichte_breite_mm:142, kauf_geplant:true},
    {spiel_pro_seite_mm:100, kauf_geplant:true},
    {vorhandene_duese_mm:150, kauf_geplant:true},
  ]) assert.equal(Object.hasOwn(result(args),'entry_url'),false,JSON.stringify(args));
  assert.equal(result({lichte_breite_mm:0,kauf_geplant:true}).folgeschritt,'erst_lichte_breite_messen');
  assert.equal(result({vorhandene_duese_mm:150,kauf_geplant:true}).folgeschritt,'vorhandene_duese_zuerst_probesetzen');
  assert.equal(result({kauf_geplant:false}).folgeschritt,'vorhandenen_einwascher_oder_abzieher_pruefen');
  const buying = result({kauf_geplant:true});
  assert.equal(buying.entry_url,canonical+'?mcp_entry=fenstersauger-breitencheck#fenstersauger-duesenbreite');
  assert.equal(buying.entry_url,WINDOW_ENTRY_URL);
  assert.equal(result({vorhandene_duese_mm:161,kauf_geplant:true}).entry_url,WINDOW_ENTRY_URL);
  assert.match(buying.hinweis,/äußere Kopfbreite/);
});

test('guide and source remain canonical and tool inputs remain strict', () => {
  const ordinary = result({});
  assert.equal(ordinary.citation_url,canonical);
  assert.equal(ordinary.guide_url,evidence);
  assert.equal(expandedCatalog.find(tool=>tool.name===name).guide_url,evidence);
  assert.equal(Object.hasOwn(expandedCatalog.find(tool=>tool.name===name),'entry_url'),false);
  for (const [key,value] of [['lichte_breite_mm',-1],['spiel_pro_seite_mm','5'],
    ['vorhandene_duese_mm', Infinity],['kauf_geplant','true'],['extra','secret']]) {
    const invalid = expandedCall(name,{...example.args,[key]:value});
    assert.equal(invalid.isError,true);
    assert.doesNotMatch(invalid.content[0].text,/mcp_entry|secret/);
  }
});

test('natural German pane-width questions find the tool ahead of other decisions', async () => {
  let writes = 0;
  const env = {EVENTS:{prepare(){ writes++; throw new Error('Catalogue QA must not write events'); }}};
  for (const q of [
    'Welche Düse passt in mein 160 mm schmales Sprossenfenster?',
    'Welcher Fenstersauger passt zu meinen schmalen Sprossenfenstern?',
  ]) {
    const url = 'https://getecoback.com/api/mcp-tools?' + new URLSearchParams({view:'compact',q,limit:'3'});
    const headers = {'user-agent':'getecoback-ci/model-width-buying-local','x-probe':'1'};
    const response = await worker.fetch(new Request(url,{headers}),env,{});
    assert.equal(response.status,200);
    assert.equal((await response.json()).tools[0]?.name,name,q);
  }
  assert.equal(writes,0);
});
