import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareEventCard, encodeEventPayload, decodeEventPayload, eventShareUrl, makeParticipantPayload, EVENT_PAYLOAD_VERSION, MAX_EVENT_PAYLOAD_BYTES, MAX_EVENT_FRAGMENT_LENGTH} from '../../collector-assets/event-kit-core.mjs';

const catalog = JSON.parse(fs.readFileSync(new URL('../../collector-assets/series-catalog.json', import.meta.url), 'utf8'));
const museum = catalog.series.find(s => s.id === 'smiski-museum');
const snack = catalog.series.find(s => s.id === 'sonny-angel-snack-series');
const today = {today:'2026-10-31'};
const event = {kind:'event', eventName:'Our collector meetup', eventDate:'2026-11-14', exchangeMode:'peer', rulesUrl:'https://example.com/event-rules', note:'Please bring your own preparation list.'};
const card = {...event, kind:'card', wanted:['SMISKI Museum / Smiski Dali'], offered:['Smiski Pearl Earring']};
const prepare = (args, data = catalog, options = today) => prepareEventCard(data, args, options);
const uncheckedFragment = value => '#event=' + Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

test('organizer template explicitly carries unverified rules and never invents participant demand', () => {
 const r = prepare(event);
 assert.equal(r.kind, 'event'); assert.equal(r.expired, false);
 assert.deepEqual(r.wanted, []); assert.deepEqual(r.offered, []); assert.deepEqual(r.sources, []);
 assert.equal(r.event.unverified, true); assert.equal(r.event.rulesUrl, event.rulesUrl);
 assert.match(r.markdown, /has not verified the organizer/);
 assert.equal(r.payload.v, EVENT_PAYLOAD_VERSION);
 assert.equal(r.shareUrl, eventShareUrl(r.payload));
 assert.deepEqual(decodeEventPayload(new URL(r.shareUrl).hash), r.payload);
 assert.equal(r.published, undefined); assert.equal(r.organizerId, undefined);
});

test('personal card matches exact names across real series with provenance and preserves unknowns', () => {
 assert.ok(snack);
 const snackLabel = snack.title + ' / ' + snack.names[0];
 const r = prepare({...card, wanted:[...card.wanted, snackLabel, 'Unverified special version']});
 assert.deepEqual(r.wanted, ['SMISKI Museum / Smiski Dali', snackLabel, 'Unverified special version']);
 assert.deepEqual(r.offered, ['SMISKI Museum / Smiski Pearl Earring']);
 assert.deepEqual(r.unmatchedWanted, ['Unverified special version']); assert.deepEqual(r.unmatchedOffered, []);
 assert.deepEqual(r.sources.map(s => s.seriesId), [museum.id, snack.id]);
 assert.equal(r.sources[0].source, museum.source); assert.equal(r.sources[0].checked, museum.checked);
 assert.ok(r.markdown.includes(museum.source) && r.markdown.includes(snack.source));
 assert.equal(r.matches.wanted[0].input, card.wanted[0]); assert.equal(r.catalogScope, catalog.scope);
 assert.equal(r.quantity, undefined); assert.equal(r.matchedPerson, undefined);
});

test('wanted and offered stay explicit; normalized repeats are not quantities or extra offers', () => {
 const r = prepare({...card, wanted:['  smiski\tDALI ', 'SMISKI DALI', 'SMISKI Museum / Smiski Dali'], offered:[]});
 assert.deepEqual(r.wanted, ['SMISKI Museum / Smiski Dali']); assert.deepEqual(r.offered, []);
 assert.deepEqual(r.duplicateInputs, {wanted:2, offered:0});
 const both = prepare({...card, wanted:['Smiski Dali'], offered:['Smiski Dali']});
 assert.deepEqual(both.wanted, both.offered); // Intent can be explicit in both lists.
 assert.match(both.markdown, /Repeated names are not quantities/);
 assert.match(both.markdown, /Missing or duplicate collection items are never inferred/);
});

test('ambiguous short names are unresolved while a complete series label is precise', () => {
 const one = {...museum, names:['Café']}, two = {...museum, id:'smiski-other', title:'Other series', names:['Café']};
 const data = {...catalog, series:[one, two]};
 const r = prepare({...card, wanted:['CAFE\u0301', 'SMISKI Museum / CAFE\u0301'], offered:[]}, data);
 assert.deepEqual(r.unmatchedWanted, ['CAFÉ']); assert.deepEqual(r.wanted, ['CAFÉ', 'SMISKI Museum / Café']);
 assert.equal(r.matches.wanted.length, 1); assert.equal(r.matches.wanted[0].seriesId, museum.id);
 assert.deepEqual(prepare({...card, wanted:['Cafe'], offered:[]}, data).unmatchedWanted, ['Cafe']);
});

test('peer/store/display modes preserve real event distinctions and reject contradictory offers', () => {
 const peer = prepare(card); assert.match(peer.markdown, /Participant-to-participant exchange/);
 const store = prepare({...card, exchangeMode:'store'}); assert.match(store.markdown, /Exchange with the store only/);
 assert.match(store.markdown, /does not invite participant-to-participant exchange/);
 const display = prepare({...card, exchangeMode:'display', offered:[]}); assert.match(display.markdown, /Display \/ preparation only/);
 assert.throws(() => prepare({...card, exchangeMode:'display'}), RangeError);
 assert.throws(() => prepare({...event, wanted:['Smiski Dali']}), RangeError);
 assert.throws(() => prepare({...card, wanted:[], offered:[]}), RangeError);
});

test('recipient starts a new draft containing only activity fields, not another person’s lists', () => {
 const incoming = decodeEventPayload(new URL(prepare(card).shareUrl).hash), before = JSON.stringify(incoming);
 const draft = makeParticipantPayload(incoming);
 assert.equal(draft.kind, 'card'); assert.equal(draft.v, 1); assert.equal(draft.eventName, incoming.eventName);
 assert.deepEqual(draft.wanted, []); assert.deepEqual(draft.offered, []); assert.equal(JSON.stringify(incoming), before);
 const {v, ...args} = draft;
 assert.throws(() => prepare(args), RangeError); assert.throws(() => encodeEventPayload(draft), RangeError);
 assert.deepEqual(makeParticipantPayload(prepare(event).payload), draft);
});

test('an explicit date supplies expiry; old snapshots remain readable and cannot produce a ready share link', () => {
 assert.equal(prepare({...card, eventDate:today.today}).expired, false);
 const old = prepare({...card, eventDate:'2026-10-30'});
 assert.equal(old.expired, true); assert.equal(old.shareUrl, null); assert.match(old.markdown, /historical snapshot/);
 const decoded = decodeEventPayload(encodeEventPayload(old.payload)); assert.equal(decoded.eventDate, '2026-10-30');
 assert.throws(() => prepareEventCard(catalog, card), RangeError);
 for (const value of ['2026-02-29', '2026-11-31', '2026-1-01', 'now', 20261031]) assert.throws(() => prepare({...card, eventDate:value}), RangeError);
 assert.doesNotThrow(() => prepare({...card, eventDate:'2028-02-29'}));
 assert.throws(() => prepare(card, catalog, {today:'invalid'}), RangeError);
});

test('three languages and localized URLs preserve exact names without state or input mutation', () => {
 const frozen = value => { if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); } return value; };
 const data = frozen(structuredClone(catalog)), args = frozen(structuredClone(card));
 const snapshot = JSON.stringify({data, args});
 for (const language of ['en', 'de', 'zh']) {
  const r = prepare({...args, language}, data);
  assert.equal(r.language, language); assert.equal(r.payload.language, language);
  assert.deepEqual(r.wanted, card.wanted); assert.equal(r.shareUrl.startsWith('https://thedollscout.com/' + (language === 'en' ? '' : language + '/') + 'collecting/event-kit#event='), true);
  assert.match(r.markdown, {en:/My event preparation card/, de:/Meine Veranstaltungskarte/, zh:/我的活动准备卡/}[language]);
 }
 assert.equal(JSON.stringify({data, args}), snapshot);
 assert.throws(() => eventShareUrl(prepare(event).payload, 'fr'), RangeError);
});

test('maximum schema-sized Unicode, ASCII escaping and rules links fit the bounded share format', () => {
 for (const character of ['藏', '😀', '"', '\\']) {
  const names = prefix => Array.from({length:8}, (_,i) => (prefix + i).padEnd(3, 'x') + character.repeat(117));
  const r = prepare({...card, eventName:character.repeat(80), note:character.repeat(240), rulesUrl:'https://example.com/' + 'a'.repeat(480), wanted:names('w'), offered:names('o')});
  const raw = JSON.stringify(r.payload); assert.ok(new TextEncoder().encode(raw).length <= MAX_EVENT_PAYLOAD_BYTES);
  const fragment = encodeEventPayload(r.payload); assert.ok(fragment.length <= MAX_EVENT_FRAGMENT_LENGTH);
  assert.deepEqual(decodeEventPayload(fragment), r.payload);
 }
 assert.throws(() => prepare({...card, wanted:['a'.repeat(121)]}), RangeError);
 assert.throws(() => prepare({...card, wanted:Array(9).fill('a')}), RangeError);
 assert.throws(() => prepare({...card, eventName:'a'.repeat(81)}), RangeError);
 assert.throws(() => prepare({...card, note:'a'.repeat(241)}), RangeError);
});

test('malformed and malicious fragments are rejected before being treated as a card', () => {
 const payload = prepare(card).payload;
 for (const fragment of ['', '#event=', '#event=%%%', '#event=A', '#event=YQ=', '#event=_w', '#event='+'A'.repeat(MAX_EVENT_FRAGMENT_LENGTH), uncheckedFragment('{'), uncheckedFragment({...payload,v:2}), uncheckedFragment({...payload,contact:'private'}), uncheckedFragment({...payload,wanted:[null]}), uncheckedFragment({...payload,offered:{x:'a'}})]) assert.throws(() => decodeEventPayload(fragment), RangeError, fragment.slice(0,80));
 assert.throws(() => decodeEventPayload(uncheckedFragment(' '.repeat(MAX_EVENT_PAYLOAD_BYTES+1))), RangeError);
 const withPrototype = JSON.parse(JSON.stringify(payload).replace('{', '{"__proto__":{},'));
 assert.throws(() => encodeEventPayload(withPrototype), RangeError);
 assert.throws(() => encodeEventPayload({...payload,v:'1'}), RangeError);
 assert.throws(() => encodeEventPayload({...payload,eventName:'\u202eprivate'}), RangeError);
});

test('rules URLs never accept executable, credentialed, local or overlong links; Markdown keeps input literal', () => {
 for (const rulesUrl of ['http://example.com','javascript:alert(1)','data:text/html,evil','https://user:pass@example.com','https://localhost','https://localhost.','https://127.0.0.1','https://[::1]','https://app.local','https://foo.localhost','https://example.com/a b','https://example.com/\\@evil.com','https://example.com/'+'a'.repeat(500)]) assert.throws(() => prepare({...event,rulesUrl}), RangeError, rulesUrl);
 const r = prepare({...card,eventName:'<script>alert(1)</script>',note:'[click](javascript:evil)',wanted:['<img src=x onerror=evil>'],offered:[]});
 assert.ok(!r.markdown.includes('<script>')); assert.ok(!r.markdown.includes('<img')); assert.ok(!r.markdown.includes('[click](javascript:evil)'));
 assert.ok(r.markdown.includes('&lt;script&gt;')); assert.deepEqual(r.unmatchedWanted, ['<img src=x onerror=evil>']);
 assert.match(r.markdown, /read, change or forward/); assert.match(r.markdown, /cannot be revoked/);
});

test('strict fields, sparse lists and malformed catalog facts cannot produce plausible sourced output', () => {
 for (const value of [null, [], {...card,privateId:'x'}, {...card,kind:'unknown'}, {...card,exchangeMode:'sales'}, {...card,language:'fr'}, {...card,wanted:[] ,offered:[]}, {...card,wanted:new Array(1)}, {...card,wanted:['\u200bhidden']}, {...card,eventName:'\u0000x'}, {...card,eventDate:undefined}]) assert.throws(() => prepare(value), RangeError);
 const badCatalogs = [null, {...catalog,scope:''}, {...catalog,series:new Array(1)}, {...catalog,series:[museum,museum]}, {...catalog,series:[{...museum,source:'javascript:evil'}]}, {...catalog,series:[{...museum,checked:'2026-02-30'}]}, {...catalog,series:[{...museum,names:new Array(1)}]}, {...catalog,series:[{...museum,names:['same','SAME']}]}];
 for (const value of badCatalogs) assert.throws(() => prepare(card,value), RangeError);
});
