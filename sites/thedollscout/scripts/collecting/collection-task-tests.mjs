import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {searchCollectionSeries, prepareCollectionChecklist} from '../../collector-assets/collection-task-core.mjs';

const catalog = JSON.parse(fs.readFileSync(new URL('../../collector-assets/series-catalog.json', import.meta.url), 'utf8'));
const museum = catalog.series.find(s => s.id === 'smiski-museum');
const base = {seriesId: 'smiski-museum', owned: ['Smiski Dali', 'Smiski Pearl Earring']};
const remaining = ['Smiski The Source', 'Smiski Fuzin&Raijin', 'Smiski Bacchus', 'Smiski Vela’zquez'];

test('search returns real names, stable IDs and per-series source dates without inventing availability', () => {
 const r = searchCollectionSeries(catalog, {query: '  SMISKI\t Museum  '});
 assert.equal(r.found, true); assert.equal(r.totalMatches, 1); assert.equal(r.limit, 5);
 assert.equal(r.series[0].seriesId, museum.id); assert.deepEqual(r.series[0].styles, museum.names);
 assert.equal(r.series[0].source, museum.source); assert.equal(r.series[0].checked, museum.checked);
 assert.equal(r.series[0].modified, museum.modified); assert.equal(r.catalogScope, catalog.scope);
 assert.equal(r.series[0].stock, undefined); assert.equal(r.series[0].price, undefined);
 assert.equal(searchCollectionSeries(catalog, {query: 'Museum', brand: 'sonny-angel'}).found, false);
 assert.equal(searchCollectionSeries(catalog, {query: 'Museum typoo'}).totalMatches, 0);
 const limited = searchCollectionSeries(catalog, {query: 'smiski', brand: 'smiski', limit: 2});
 assert.equal(limited.series.length, 2); assert.ok(limited.totalMatches > 2);
});

test('Museum two-owned task produces four unmarked styles, with no inferred wishlist', () => {
 const r = prepareCollectionChecklist(catalog, base);
 assert.equal(r.found, true); assert.deepEqual(r.owned, base.owned);
 assert.deepEqual(r.notMarkedOwned, remaining); assert.deepEqual(r.wanted, []);
 assert.deepEqual(r.unmatchedOwned, []); assert.deepEqual(r.unmatchedWanted, []);
 assert.equal(r.counts.cataloguedStyles, 6); assert.equal(r.counts.ownedStyles, 2);
 assert.equal(r.comparisonScope, 'published_catalog_names_only');
 assert.match(r.markdown, /Not marked owned does not mean wanted/);
 assert.ok(r.markdown.includes(museum.source)); assert.ok(r.markdown.includes(museum.checked));
});

test('only explicit exact wanted names are selected; unmatched and combined names stay visible', () => {
 const r = prepareCollectionChecklist(catalog, {...base, owned: ['Dali', 'Smiski Fuzin', 'Smiski Raijin', 'Smiski Dali'], wanted: ['Smiski Bacchus', 'Smiski Dalii']});
 assert.deepEqual(r.owned, ['Smiski Dali']);
 assert.deepEqual(r.unmatchedOwned, ['Dali', 'Smiski Fuzin', 'Smiski Raijin']);
 assert.deepEqual(r.wanted, ['Smiski Bacchus']); assert.deepEqual(r.unmatchedWanted, ['Smiski Dalii']);
 assert.ok(r.notMarkedOwned.includes('Smiski Fuzin&Raijin'));
 const overlap = prepareCollectionChecklist(catalog, {...base, wanted: ['Smiski Dali']});
 assert.deepEqual(overlap.wanted, ['Smiski Dali']); assert.equal(overlap.counts.ownedStyles, 2);
});

test('case and spacing normalize; repeated names are not quantities or trade offers', () => {
 const r = prepareCollectionChecklist(catalog, {...base, owned: [' smiski\tDALI ', 'Smiski Dali', 'SMISKI DALI', 'unmatched', 'UNMATCHED'], wanted: ['SMISKI BACCHUS', 'Smiski Bacchus']});
 assert.deepEqual(r.owned, ['Smiski Dali']); assert.deepEqual(r.wanted, ['Smiski Bacchus']);
 assert.deepEqual(r.unmatchedOwned, ['unmatched']); assert.deepEqual(r.duplicateInputs, {owned: 3, wanted: 1});
 assert.equal(r.quantity, undefined); assert.equal(r.offeredForTrade, undefined);
 const accents = {...catalog, series:[{...museum, names:['Café']}]};
 assert.deepEqual(prepareCollectionChecklist(accents, {...base, owned:['CAFE\u0301']}).owned, ['Café']);
 assert.deepEqual(prepareCollectionChecklist(accents, {...base, owned:['Cafe']}).unmatchedOwned, ['Cafe']);
});

test('empty owned/wanted lists and partial catalogs never claim a complete official collection', () => {
 const empty = prepareCollectionChecklist(catalog, {seriesId: museum.id, owned: [], wanted: []});
 assert.deepEqual(empty.owned, []); assert.deepEqual(empty.notMarkedOwned, museum.names); assert.deepEqual(empty.wanted, []);
 const partial = {...catalog, series: [{...museum, names: [...base.owned]}]};
 const r = prepareCollectionChecklist(partial, base);
 assert.deepEqual(r.notMarkedOwned, []); assert.equal(r.counts.cataloguedStyles, 2);
 assert.equal(r.comparisonScope, 'published_catalog_names_only');
 assert.match(r.markdown, /does not establish a complete official series/);
 assert.equal(r.collectionComplete, undefined);
 const unknown = prepareCollectionChecklist(catalog, {...base, seriesId: 'smiski-not-published'});
 assert.equal(unknown.found, false); assert.equal(unknown.reason, 'series_not_found');
 assert.equal(unknown.owned, undefined); assert.equal(unknown.source, undefined);
});

test('three languages preserve exact source names and deterministic data without mutating inputs', () => {
 const freeze = value => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };
 const frozen = freeze(structuredClone(catalog)), args = freeze(structuredClone(base));
 const before = JSON.stringify(frozen), beforeArgs = JSON.stringify(args);
 for (const lang of ['en', 'de', 'zh']) {
  const r = prepareCollectionChecklist(frozen, {...args, language: lang});
  assert.equal(r.language, lang); assert.deepEqual(r.owned, base.owned); assert.deepEqual(r.notMarkedOwned, remaining);
  assert.match(r.markdown, {en: /Collection checklist/, de: /Sammlungscheckliste/, zh: /收藏清单/}[lang]);
  assert.deepEqual(searchCollectionSeries(frozen, {query: 'Museum', language: lang}).series[0].styles, museum.names);
 }
 assert.equal(JSON.stringify(frozen), before); assert.equal(JSON.stringify(args), beforeArgs);
});

test('unmatched input stays literal in Markdown and cannot add HTML, links or checklist items', () => {
 const payload = '<img src=x onerror=alert(1)> [click](https://evil.example)';
 const r = prepareCollectionChecklist(catalog, {...base, owned: [payload, 'line\n- [x] forged'], wanted: ['**BUY NOW**']});
 assert.deepEqual(r.unmatchedOwned, [payload, 'line - [x] forged']);
 assert.ok(r.markdown.includes('&lt;img')); assert.ok(r.markdown.includes('\\[click\\]\\('));
 assert.ok(r.markdown.includes('line \\- \\[x\\] forged')); assert.ok(r.markdown.includes('\\*\\*BUY NOW\\*\\*'));
 assert.doesNotMatch(r.markdown, /<img|\[click\]\(https|\n- \[x\] forged/);
});

test('invalid arguments, unknown fields, unsafe Unicode and size bounds fail explicitly', () => {
 for (const query of ['', '   ', 'x'.repeat(121), 'Museum\u202E', 'Museum\u200B', 'Museum\u0000', '\uD800']) {
  assert.throws(() => searchCollectionSeries(catalog, {query}), RangeError);
  assert.throws(() => prepareCollectionChecklist(catalog, {...base, owned: [query]}), RangeError);
 }
 for (const args of [null, [], {query:'Museum', limit:0}, {query:'Museum', limit:11}, {query:'Museum', limit:2.5}, {query:'Museum', brand:'labubu'}, {query:'Museum', language:'fr'}, {query:'Museum', privateData:'secret'}]) assert.throws(() => searchCollectionSeries(catalog, args), RangeError);
 for (const args of [null, [], {seriesId:museum.id}, {...base, owned:'Dali'}, {...base, owned:Array(101).fill('Smiski Dali')}, {...base, owned:Array(1)}, {...base, wanted:[false]}, {...base, wanted:null}, {...base, quantity:2}, {...base, language:'fr'}, {...base, seriesId:'../../private'}]) assert.throws(() => prepareCollectionChecklist(catalog, args), RangeError);
 assert.throws(() => prepareCollectionChecklist(catalog, JSON.parse('{"seriesId":"smiski-museum","owned":[],"__proto__":{}}')), RangeError);
});

test('bad catalog dates, ambiguous names and unsafe sources never become plausible evidence', () => {
 for (const patch of [{checked:'2026-02-30'}, {source:'javascript:alert(1)'}, {source:'https://user:password@example.com'}, {names:['Smiski Dali','smiski dali']}, {names:['Smiski\u202EDali']}]) {
  const bad = {...catalog, series:[{...museum,...patch}]};
  assert.throws(() => searchCollectionSeries(bad, {query:'Museum'}), RangeError);
  assert.throws(() => prepareCollectionChecklist(bad, base), RangeError);
 }
 const duplicate = {...catalog, series:[museum,museum]};
 assert.throws(() => prepareCollectionChecklist(duplicate, base), RangeError);
 assert.throws(() => searchCollectionSeries({...catalog, series:Array(1)}, {query:'Museum'}), RangeError);
});
