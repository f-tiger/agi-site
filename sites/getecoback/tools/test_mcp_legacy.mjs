import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';
import {legacyCatalogueExample} from '../src/mcp-legacy-examples.mjs';

const origin = 'https://getecoback.com';
const site = new URL('../site/', import.meta.url);
const env = {ASSETS: {fetch: async request => {
  const path = new URL(request.url).pathname;
  try {
    const body = readFileSync(new URL(path.slice(1), site), 'utf8');
    return new Response(body, {headers:{'content-type':path.endsWith('.json') ? 'application/json' : 'text/markdown'}});
  } catch { return new Response('missing', {status:404}); }
}}};
const dates = ['2026-11-20', '2026-11-21', '2026-11-22'];
const weather = (...temps) => Response.json({daily: {temperature_2m_max:temps, time:dates}});

async function rpc(method, params) {
  const response = await worker.fetch(new Request(origin + '/mcp/v1', {
    method:'POST',
    headers:{'content-type':'application/json', 'user-agent':'getecoback-ci/legacy-contract'},
    body:JSON.stringify({jsonrpc:'2.0', id:1, method, params}),
  }), env, {});
  assert.equal(response.status, 200);
  const message = await response.json();
  assert.equal(message.error, undefined);
  return message.result;
}

const call = (name, args) => rpc('tools/call', {name, arguments:args});

test('all ten legacy names have callable published examples with canonical source mirrors', async t => {
  t.mock.method(globalThis, 'fetch', async () => weather(19, 21, 23));
  const {tools} = await rpc('tools/list');
  const names = tools.slice(0,10).map(tool => tool.name);
  assert.equal(names.length, 10);
  for (const name of names) {
    const expected = legacyCatalogueExample(name);
    assert.ok(expected, name);
    const response = await worker.fetch(
      new Request(origin + '/api/mcp-tools?view=examples&tool=' + name), env, {});
    assert.equal(response.status, 200);
    const {tools:[published]} = await response.json();
    assert.equal(published.name, name);
    const {example, citation_url, citation_markdown_url, guide_url} = published;
    const {guide_url:expectedGuide,...expectedExample} = expected;
    assert.deepEqual({example, citation_url, citation_markdown_url}, expectedExample);
    if (expectedGuide) assert.equal(guide_url, expectedGuide);
    const html = readFileSync(new URL(new URL(citation_url).pathname.slice(1), site), 'utf8');
    const markdown = readFileSync(new URL(new URL(citation_markdown_url).pathname.slice(1), site), 'utf8');
    assert.ok(html.includes('href="' + citation_url + '"'), citation_url);
    assert.ok(markdown.includes(citation_url), citation_markdown_url);
    assert.ok(example.conditions.length > 30, name);
    const result = await call(name, example.arguments);
    assert.equal(result.isError, false, name);
    for (const [key, value] of Object.entries(example.expected_fields ?? {})) {
      assert.deepEqual(result.structuredContent[key], value, name + ': ' + key);
    }
    for (const part of example.expected_text) assert.ok(result.content[0].text.includes(part), name + ': ' + part);
  }
  assert.equal(legacyCatalogueExample('unknown'), null);
});

test('missing Open-Meteo data gives a typed unknown with no invented peak', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('unavailable', {status:503}));
  const result = await call('hitzewelle_vorschau', {});
  assert.equal(result.isError, false);
  const data = result.structuredContent;
  assert.equal(data.forecast_status, 'unavailable');
  assert.deepEqual(data.coverage.map(({available_days}) => available_days), [0,0,0]);
  assert.deepEqual([data.peak_c, data.peak_city, data.peak_date], [null,null,null]);
  assert.match(result.content[0].text, /Ob 28 °C erreicht werden, ist unbekannt/);
});

test('partial coverage preserves the observed peak and the unknown locations or days', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    const latitude = new URL(url).searchParams.get('latitude');
    if (latitude === '52.52') return weather(18, null, 22);
    if (latitude === '50.11') return weather(17, 19, 26.5);
    return new Response('unavailable', {status:503});
  });
  const result = await call('hitzewelle_vorschau', {});
  assert.equal(result.isError, false);
  const data = result.structuredContent;
  assert.equal(data.forecast_status, 'partial');
  assert.deepEqual(data.coverage, [
    {city:'Berlin',available_days:2},
    {city:'Frankfurt',available_days:3},
    {city:'München',available_days:0},
  ]);
  assert.deepEqual([data.peak_c,data.peak_city,data.peak_date], [26.5,'Frankfurt',dates[2]]);
  assert.match(result.content[0].text, /Für die fehlenden Tage oder Städte ist die Temperaturlage unbekannt/);
});

test('complete weather coverage reports the actual regional peak and threshold', async t => {
  t.mock.method(globalThis, 'fetch', async url => new URL(url).searchParams.get('latitude') === '48.14'
    ? weather(25, 32, 29) : weather(24, 27, 26));
  const result = await call('hitzewelle_vorschau', {});
  assert.equal(result.isError, false);
  assert.equal(result.structuredContent.forecast_status, 'available');
  assert.equal(result.structuredContent.peak_c, 32);
  assert.equal(result.structuredContent.peak_city, 'München');
  assert.match(result.content[0].text, /Hitzehinweis ab 32 °C/);
});

test('the browser heat endpoint retains its original warm and cold keys', async t => {
  t.mock.method(globalThis, 'fetch', async url => new URL(url).searchParams.get('daily') === 'temperature_2m_min'
    ? Response.json({daily:{temperature_2m_min:[-3,-6,-2],time:dates}})
    : weather(25, 32, 29));
  const response = await worker.fetch(new Request(origin + '/api/heat'), env, {});
  assert.equal(response.status, 200);
  const {level, region, temp, day, cold, forecast_status, coverage} = await response.json();
  assert.deepEqual({level,region,temp,day}, {level:2, region:'Berlin', temp:32, day:dates[1]});
  assert.deepEqual(cold, {level:2, region:'Berlin', temp:-6, day:dates[1]});
  assert.equal(forecast_status, 'available');
  assert.deepEqual(coverage.map(({available_days}) => available_days), [3,3,3]);
});

test('explicit zero hours, tariff, days or duty is preserved in legacy electricity results', async () => {
  const name = 'klimaanlage_stromkosten';
  const args = {watt:1000, stunden_pro_tag:8, strompreis_euro_kwh:0.3};
  for (const key of ['watt', 'stunden_pro_tag', 'strompreis_euro_kwh', 'tage', 'auslastung']) {
    const result = await call(name, {...args,[key]:0});
    assert.equal(result.isError, false, key);
    assert.equal(result.structuredContent.eur_for_period, 0, key);
  }
  const heat = await call('heizleistung_watt', {qm:20, strompreis_euro_kwh:0});
  assert.equal(heat.isError, false);
  assert.equal(heat.structuredContent.eur_per_full_load_hour, 0);
});

test('invalid legacy electricity settings return an error rather than using defaults or emitting NaN', async () => {
  const name = 'klimaanlage_stromkosten';
  const args = {watt:1000, stunden_pro_tag:8, strompreis_euro_kwh:0.3};
  for (const [key,value] of [['auslastung','abc'], ['auslastung',1.01], ['strompreis_euro_kwh',null],
    ['stunden_pro_tag',25], ['tage',-1], ['watt',undefined]]) {
    const result = await call(name, {...args,[key]:value});
    assert.equal(result.isError, true, key);
    assert.doesNotMatch(result.content[0].text, /NaN|abc/);
  }
  for (const heat of [{qm:20, strompreis_euro_kwh:'0.30'}, {qm:20, daemmung:'abc'}, {qm:0}]) {
    assert.equal((await call('heizleistung_watt', heat)).isError, true);
  }
  const excessive = await call(name, {...args,watt:Number.MAX_VALUE,strompreis_euro_kwh:Number.MAX_VALUE});
  assert.equal(excessive.isError, true);
  assert.doesNotMatch(JSON.stringify(excessive), /NaN|Infinity/);
  const heatExcessive = await call('heizleistung_watt', {qm:100,strompreis_euro_kwh:Number.MAX_VALUE});
  assert.equal(heatExcessive.isError, true);
  assert.doesNotMatch(JSON.stringify(heatExcessive), /NaN|Infinity/);
});

test('the cooling device chooser and BTU estimate hand large rooms to the load check', async () => {
  const highLoadUrl = origin + '/guide/btu-rechner.html#hohe-kuehllast';
  for (const [qm, estimated] of [[40,'13.500'],[45,'15.500'],[60,'20.500']]) {
    const chooser = await call('geraet_wahl', {problem:'zu_heiss', qm});
    const sizing = await call('btu_empfehlung', {qm, sonne:'normal'});
    for (const result of [chooser,sizing]) {
      assert.equal(result.isError, false);
      const answer = result.content[0].text;
      assert.ok(answer.includes(estimated + ' BTU/h'), answer);
      if (qm === 40) {
        assert.ok(answer.includes(origin + '/guide/klimaanlage-40-qm.html'), answer);
      } else {
        assert.ok(answer.includes(highLoadUrl), answer);
        assert.doesNotMatch(answer, /\/guide\/klimaanlage-\d+-qm\.html/);
      }
    }
  }
  for (const [sonne, estimated] of [['wenig','6.000'],['normal','7.000'],['viel','8.000']]) {
    const result = await call('btu_empfehlung', {qm:20, sonne});
    assert.ok(result.content[0].text.includes(estimated + ' BTU/h'), sonne);
  }
});

test('the cooling chooser labels a missing-area example and rejects explicit invalid areas', async () => {
  const example = await call('geraet_wahl', {problem:'zu_heiss'});
  assert.equal(example.isError, false);
  assert.match(example.content[0].text, /Beispiel/i);
  assert.match(example.content[0].text, /20\s*m²/);
  assert.doesNotMatch(example.content[0].text, /\/guide\/klimaanlage-\d+-qm\.html/);
  for (const qm of [null,'20',0,3,121]) {
    const result = await call('geraet_wahl', {problem:'zu_heiss', qm});
    assert.equal(result.isError, true, JSON.stringify(qm));
    assert.match(result.content[0].text, /4\D+120/);
    assert.doesNotMatch(result.content[0].text, /\/guide\/klimaanlage-\d+-qm\.html/);
  }
});

test('a large BTU scenario does not point to a small-room product', async () => {
  const result = await call('btu_empfehlung', {qm:120});
  assert.equal(result.isError, false);
  assert.match(result.content[0].text, /41\.000 BTU\/h/);
  assert.match(result.content[0].text, /Kühllastberechnung/);
  assert.doesNotMatch(result.content[0].text, /Klarstein|klimaanlage-40-qm/);
  assert.equal((await call('btu_empfehlung', {qm:'20'})).isError, true);
  for (const qm of [10,15,20,25,30,40,50]) {
    const example = await call('btu_empfehlung', {qm,sonne:'wenig'});
    const link = example.content[0].text.match(/https:\/\/getecoback\.com\/guide\/klimaanlage-\d+-qm\.html/);
    if (link) {
      const page = new URL(link[0]).pathname.slice(1);
      const html = readFileSync(new URL(page, site), 'utf8');
      assert.ok(html.includes('href="' + link[0] + '"'), link[0]);
    } else {
      assert.match(example.content[0].text, /Kühllastberechnung/);
    }
  }
});

test('an invalid routing problem does not become stale-air advice', async () => {
  const result = await call('geraet_wahl', {problem:'bad_value'});
  assert.equal(result.isError, true);
  assert.doesNotMatch(result.content[0].text, /bad_value|Luftentfeuchter/);
});

test('legacy dew point compares estimated surface temperatures without a drying verdict', async () => {
  const name = 'taupunkt_lueften';
  const args = {aussen_temp_c:18,aussen_luftfeuchte_prozent:60,innen_temp_c:16};
  const result = await call(name, args);
  assert.equal(result.isError, false);
  assert.match(result.content[0].text, /geschätzten Wandtemperatur von 14,0 °C/);
  assert.match(result.content[0].text, /keine Aussage, ob Lüften trocknet/);
  assert.doesNotMatch(result.content[0].text, /Lüften ist jetzt sinnvoll|nichts nieder/);
  assert.equal((await call(name, {...args,aussen_temp_c:-243.12})).isError, true);
});

test('the 560 cm stock example remains a candidate for a 540 cm sash', async () => {
  const result = await call('fensterabdichtung_laenge', {breite_cm:130,hoehe_cm:140});
  assert.equal(result.isError, false);
  assert.match(result.content[0].text, /5,40 m/);
  assert.match(result.content[0].text, /Beispielgröße zum Prüfen: 560 cm/);
  assert.match(result.content[0].text, /Messvorgaben des konkreten Sets/);
  assert.equal(result.structuredContent.rectangular_perimeter_cm,540);
  assert.equal(result.structuredContent.example_size_cm,560);
  const guide='/guide/fensterabdichtung-klimaanlage.html';
  assert.equal(result.structuredContent.guide_url,origin+guide+'#messweg-vor-kauf');
  const html=readFileSync(new URL(guide.slice(1),site),'utf8');
  assert.equal((html.match(/id="messweg-vor-kauf"/g)||[]).length,1);
});

test('window seal rejects invalid measurements and separates roof and oversized sash decisions', async()=>{
  const name='fensterabdichtung_laenge';
  for(const args of [
    {breite_cm:0,hoehe_cm:140},{breite_cm:301,hoehe_cm:140},{breite_cm:60},
    {breite_cm:'60',hoehe_cm:140},{breite_cm:60,hoehe_cm:140,fenstertyp:'andere'},
  ]){
    const result=await call(name,args);
    assert.equal(result.isError,true);
    assert.equal(result.structuredContent,undefined);
  }
  const roof=await call(name,{breite_cm:60,hoehe_cm:140,fenstertyp:'dachfenster'});
  assert.equal(roof.structuredContent.rectangular_perimeter_cm,400);
  assert.equal(roof.structuredContent.example_size_cm,null);
  assert.match(roof.content[0].text,/Montagezeichnung des Sets/);
  const oversized=await call(name,{breite_cm:150,hoehe_cm:140,fenstertyp:'drehkipp'});
  assert.equal(oversized.structuredContent.rectangular_perimeter_cm,580);
  assert.equal(oversized.structuredContent.example_size_cm,null);
});

test('legacy heating watts keep numeric estimates and cite their limits for supplementary warmth', async () => {
  const citation = origin + '/guide/infrarotheizung-watt-rechner.html';
  for (const [qm,daemmung,watts,cost] of [
    [20,'mittel',1600,0.48],
    [18,'schlecht',1800,0.54],
    [30,'schlecht',3000,0.90],
  ]) {
    const result = await call('heizleistung_watt',{qm,daemmung,strompreis_euro_kwh:0.30});
    assert.equal(result.isError,false);
    assert.deepEqual(result.structuredContent,{
      estimated_watts:watts,eur_per_full_load_hour:cost,citation_url:citation,
    });
    const text = result.content[0].text;
    assert.match(text,/grob\w*\s+Schätzung/iu);
    assert.match(text,/punktuell\w*\s+Zusatzwärme/iu);
    assert.ok(text.includes(citation + '#watt-rechner-raumgroesse-und-daemmung-eingeben'));
    assert.doesNotMatch(text,/(?:zwei|2)\s+(?:Infrarot[- ]?)?Panels?\s+verteilen/iu);
  }
});
