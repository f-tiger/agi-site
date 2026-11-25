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
const toolPaths = new Map([
  ['luftreiniger_ersatzfilter_zuordnung', '/ersatzfilter.html#finder'],
  ['philips_verdunsterfilter_zuordnung', '/guide/luftbefeuchter-ratgeber.html#philips-verdunsterfilter'],
  ['heizdecke_stromkosten_nennleistung', '/guide/heizdecke-stromverbrauch.html#waerme-rechner'],
  ['hygrometer_messbereiche', '/guide/luftfeuchtigkeit-richtig-messen.html#hygrometer-vergleichen'],
  ['luftentfeuchter_waesche_einzelkosten', '/waeschetrockner-oder-luftentfeuchter.html#luftentfeuchter-waesche-kosten'],
  ['keller_lueften_taupunkt_messwerte', '/guide/keller-lueften-sommer.html#taupunkt'],
  ['kellerentfeuchter_pruefpunkt_abgleichen', cellar + '#kalter-keller'],
  ['midea_portasplit_fensterhalterung_pruefen', '/guide/midea-portasplit-ausverkauft-alternativen.html#kaufpruefung'],
  ['kaffeevollautomat_intenza_aquaclean_filterfamilie_modellpruefung', products + '#kaffee-wasserfilter'],
  ['trotec_ttk70_hepa_filter_generation', '/guide/trotec-luftentfeuchter-test.html#ttk70-hepa-filter'],
  ['trotec_ttk75_eco_pruefpunkt', '/guide/trotec-luftentfeuchter-test.html#ttk75-pruefpunkt'],
  ['tesamoll_fensterdichtung_profil_pruefen', '/guide/fenster-zugluft-mietwohnung.html#dichtungsprofil'],
  ['midea_portasplit_fensterfalz_pruefen', '/guide/midea-portasplit-ausverkauft-alternativen.html#fensterfalz'],
  ['fritz_302_danfoss_adapter', '/guide/smarte-heizkoerperthermostate-lohnen-sich.html#fritz-302-danfoss-adapter'],
  ['tado_x_oventrop_ventiladapter_pruefen', '/guide/smarte-heizkoerperthermostate-lohnen-sich.html#tado-x-oventrop'],
  ['pac_n90_energielabel_zu_stromkosten', '/guide/delonghi-pac-n90-test.html#n90-energielabel'],
  ['pac_n90_ean_abgleichen', '/guide/delonghi-pac-n90-test.html#testlage'],
  ['klimaanlage_geraeusch_vergleich', '/guide/delonghi-pac-n90-test.html#lautstaerke'],
  ['waesche_trocknungswechsel_kaufschwelle', '/waeschetrockner-oder-luftentfeuchter.html#waesche-saisonwechsel'],
  ['befeuchter_nennwatt_abgabeleistung_bezug', '/guide/luftbefeuchter-stromverbrauch.html#effizienz-vergleichen'],
  ['glassvac_kalt_lagern_einschalten_laden_getrennt', products + '#bosch-glassvac-einsatz-und-pflege'],
  ['miele_hyclean_beutel_vollstaendige_modellzeile', products + '#miele-staubsaugerbeutel'],
  ['miele_zwei_sauger_vorrat_beutel_abluftfilter_getrennt', products + '#miele-staubsaugerbeutel'],
  ['fenstersauger_170mm_saugduese_geraetezuordnung', products + '#kaercher-170mm-saugduese'],
  ['fenstersauger_wv3_wv8_led_muster_einordnen', products + '#kaercher-fenstersauger-einsatz-und-hinweise'],
  ['fenster_oberflaeche_taucheck', '/guide/fenster-beschlagen-innen.html#fenstersauger-gegen-kondenswasser'],
  ['lueften_messwirkung', '/guide/richtig-lueften-im-winter.html#lueften-vorher-nachher'],
  ['thermovorhang_bahnenbedarf', '/guide/thermovorhang-ratgeber.html#thermovorhang-bahnenbedarf'],
]);
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

test('cooling offer budget and confirmed time stay independent', async () => {
  const worker = offlineWorker();
  const call = args => worker.rpc('tools/call', {name:'klima_kaufzeitpunkt_eigenbedarf', arguments:args});
  const quote = {tage_bis_bedarf:6,lieferdauer_tage:5,einrichten_tage:2,preis_eur:380,deckel_eur:420,frist_belegt:true};
  for (const [overrides, budget, reserve, timing] of [
    [{}, true, -1, 'zu_spaet_geplant'],
    [{einrichten_tage:1}, true, 0, 'ins_zeitfenster_geplant'],
    [{frist_belegt:false}, true, null, 'lieferfrist_pruefen'],
    [{einrichten_tage:0,deckel_eur:350}, false, 1, 'ins_zeitfenster_geplant'],
  ]) {
    const {isError, structuredContent:data} = await call({...quote,...overrides});
    assert.equal(isError,false);
    assert.equal(data.budget_eingehalten,budget);
    assert.equal(data.reserve_tage,reserve);
    assert.equal(data.zeitlich,timing);
    assert.equal(data.citation_url,origin + '/guide/klimaanlage-wann-kaufen.html');
  }
  assert.equal((await call({...quote,preis_eur:null})).isError,true);
  worker.assertNoWrites();
});

test('each mapped tool publishes the same exact evidence link after a real tool call, with unchanged schema and citation', async () => {
  const h = offlineWorker();
  const standard = await collectToolPages(cursor => h.rpc('tools/list', cursor ? {cursor} : {}));
  const advertised = new Map(standard.map(tool => [tool.name, tool]));
  const compact = new Map((await h.catalogue({view:'compact'})).tools.map(tool => [tool.name, tool]));
  const mapped = expandedDefinitions.filter(tool=>paths.has(tool.category) || toolPaths.has(tool.name));
  assert.equal(mapped.length, 238);
  assert.equal([...compact.values()].filter(tool=>tool.guide_url && tool.name!=='entfeuchter_ablaufcheck').length, mapped.length);

  for (const {name, category, page, properties, required, oneOf, example} of mapped) {
    const guidePath = toolPaths.get(name) ?? paths.get(category);
    const guide = origin + guidePath;
    const citation = origin + page;
    const schema = {type:'object', properties, required:required ?? Object.keys(properties), additionalProperties:false, ...(oneOf ? {oneOf} : {})};
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

test('curtain panel count rounds genuine shortfalls up without over-ordering exact decimal fits', async () => {
  const h = offlineWorker();
  const args = {oeffnung_cm:80, ueberstand_links_cm:2, ueberstand_rechts_cm:6.4, stofffaktor:1.5, bahn_flach_cm:66.3};
  const call = arguments_ => h.rpc('tools/call', {name:'thermovorhang_bahnenbedarf', arguments:arguments_});
  const fit = (await call(args)).structuredContent;
  assert.equal(fit.stoff_flach_cm,132.6);
  assert.equal(fit.bahnen,2);
  assert.equal((await call({...args,bahn_flach_cm:66.29})).structuredContent.bahnen,3);
  h.assertNoWrites();
});

test('PortaSplit checks the original German EAN, window type and the correct bracket evidence independently', async () => {
  const h = offlineWorker();
  const name = 'midea_portasplit_fensterhalterung_pruefen';
  const standard = {angebot_ean:4048164116478,fenster:'dreh_kippfenster',standardhalterung:'im_angebot',universalhalterung:'fehlt'};
  const check = async (input, expected) => {
    const result = await h.rpc('tools/call', {name, arguments:{...standard, ...input}});
    assert.equal(result.isError, false);
    for (const [key,value] of Object.entries(expected)) assert.equal(result.structuredContent[key], value, key);
    assert.match(result.structuredContent.grenze, /Fenstermaße.*Befestigung/);
    assert.equal(result.structuredContent.guide_url, origin + toolPaths.get(name));
    assert.equal(result.structuredContent.entry_url, origin + '/guide/midea-portasplit-ausverkauft-alternativen.html?mcp_entry=portasplit-fensterhalterung#kaufpruefung');
    assert.equal(result.structuredContent.quellen_geprueft_am, '2026-11-20');
  };
  await check({}, {status:'halterungsbeleg_vorhanden',halterung_im_herstellerbeispiel:'standardhalterung',universalhalterung_ean:null});
  await check({standardhalterung:'offen',universalhalterung:'ean_im_angebot'}, {status:'lieferumfang_klaeren'});
  await check({fenster:'dachfenster'}, {status:'passende_halterung_vor_kauf_klaeren',universalhalterung_ean:4048164118687});
  await check({fenster:'franzoesischer_balkon',universalhalterung:'ean_separat_vorhanden'}, {status:'halterungsbeleg_vorhanden',halterung_im_herstellerbeispiel:'universalhalterung'});
  await check({fenster:'dachfenster',universalhalterung:'offen'}, {status:'lieferumfang_klaeren'});
  await check({fenster:'anders_oder_offen'}, {status:'fenstertyp_mit_anleitung_abgleichen',halterung_im_herstellerbeispiel:null});
  await check({angebot_ean:0}, {status:'modellnummer_abgleichen',angebot_ean_passt:null});
  await check({angebot_ean:4048164122424}, {status:'modellnummer_abgleichen',angebot_ean_passt:false,halterung_im_herstellerbeispiel:null});
  for (const invalid of [{angebot_ean:1234},{angebot_ean:4048164116478.5},{fenster:'balkon'}, {standardhalterung:true}]) {
    const result = await h.rpc('tools/call', {name, arguments:{...standard, ...invalid}});
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent, undefined);
  }
  h.assertNoWrites();
});

test('tado X requires proof of the exact Oventrop valve and pitch before an adapter decision', async () => {
  const h = offlineWorker();
  const name = 'tado_x_oventrop_ventiladapter_pruefen';
  const {example} = expandedDefinitions.find(tool => tool.name === name);
  const call = changes => h.rpc('tools/call', {name, arguments:{...example.args, ...changes}});
  for (const ventilmodell of ['unidh','unil']) {
    const result = (await call({ventilmodell})).structuredContent;
    assert.equal(result.status, 'separater_adapter_erforderlich');
    assert.equal(result.adapter_artikelnummer, '1011445');
    assert.equal(result.adapter_ean, '4026755228717');
    assert.equal(result.adapter_im_x_lieferumfang, false);
    assert.equal(result.quellenmarkt, 'DE');
    assert.equal(result.quellen_geprueft_am, '2026-11-20');
    assert.match(result.quellen_url, /\.pdf#page=7$/);
  }
  const direct = (await call({ventilmodell:'vindo_th',gewinde:'m30_1_5'})).structuredContent;
  assert.equal(direct.status, 'direktmontage_dokumentiert');
  assert.equal(direct.adapter_artikelnummer, null);
  assert.equal(direct.adapter_ean, null);
  assert.match(direct.quellen_url, /\.pdf#page=6$/);
  for (const [changes,status] of [
    [{gewinde:'unbekannt'}, 'ventilbeleg_fehlend'],
    [{ventilmodell:'anders_oder_unbekannt'}, 'ventilbeleg_fehlend'],
    [{ventilzustand:'unbekannt'}, 'ventilbeleg_fehlend'],
    [{gewinde:'m30_1_5'}, 'modell_gewinde_widerspruch'],
    [{ventilzustand:'manuell'}, 'manuelles_ventil_nicht_kompatibel'],
    [{ventilzustand:'beschaedigt_oder_undicht'}, 'zustand_klaeren'],
  ]) {
    const result = (await call(changes)).structuredContent;
    assert.equal(result.status, status);
    assert.equal(result.adapter_artikelnummer, null);
    assert.equal(result.adapter_ean, null);
    assert.equal(result.adapter_im_x_lieferumfang, null);
  }
  for (const changes of [{gewinde:'30mm'},{ventilmodell:'danfoss_ra'},{ventilzustand:true},{produkte:'tado-v3'}]) {
    const invalid = await call(changes);
    assert.equal(invalid.isError, true);
    assert.equal(invalid.structuredContent, undefined);
  }
  h.assertNoWrites();
});

test('N90 costs separate label data from the actual measured electricity and require the exact model', async () => {
  const h = offlineWorker();
  const name = 'pac_n90_energielabel_zu_stromkosten';
  const {example} = expandedDefinitions.find(tool => tool.name === name);
  const call = changes => h.rpc('tools/call', {name, arguments:{...example.args, ...changes}});
  const check = async (changes, expected) => {
    const result = await call(changes);
    assert.equal(result.isError, false);
    for (const [key,value] of Object.entries(expected)) assert.equal(result.structuredContent[key], value, key);
    assert.equal(result.structuredContent.guide_url, origin + toolPaths.get(name));
    assert.match(result.structuredContent.energielabel_url, /\?assetId=209150&download=true$/);
    assert.match(result.structuredContent.grenze, /keine Prognose/);
  };
  const complete = {messung_vollstaendig:true,messenergie_kwh:1.8,messdauer_min:180,arbeitspreis_eur_kwh:0.35};
  await check({}, {label_eu_kwh_je_60_min:0.9,label_kuehlleistung_kw:2.5,label_referenz_eur_je_60_min:0.27,messzeitraum_eur:null});
  await check(complete, {label_referenz_eur_je_60_min:0.32,messung_auswertbar:true,messzeitraum_kwh:1.8,messzeitraum_min:180,
    messzeitraum_eur:0.63,messwert_eur_je_stunde:0.21});
  await check({...complete, messenergie_kwh:0}, {messung_auswertbar:true,messzeitraum_eur:0,messwert_eur_je_stunde:0});
  await check({...complete, messdauer_min:0}, {label_referenz_eur_je_60_min:0.32,messung_auswertbar:false,messzeitraum_eur:null});
  await check({...complete, messung_vollstaendig:false}, {messung_auswertbar:false,messzeitraum_eur:null});
  await check({...complete, arbeitspreis_eur_kwh:-1}, {tarif_bekannt:false,label_eu_kwh_je_60_min:0.9,label_referenz_eur_je_60_min:null,
    messzeitraum_eur:null,messzeitraum_kwh:1.8});
  for (const [changes,status] of [[{ean:0},'ean_fehlt'],[{ean:8004399512352},'ean_abweicht'],
    [{modell:'abweichend'},'modellbezeichnung_klaeren'],[{modell:'unbekannt'},'modellbezeichnung_klaeren']]) {
    await check({...complete, ...changes}, {status,label_eu_kwh_je_60_min:null,label_referenz_eur_je_60_min:null,messzeitraum_eur:null});
  }
  for (const changes of [{ean:12345},{ean:8004399512351.5},{arbeitspeis:0.30},{arbeitspreis_eur_kwh:35},
    {arbeitspreis_eur_kwh:-0.5},{messdauer_min:0.1},{messenergie_kwh:-1}]) {
    const invalid = await call(changes);
    assert.equal(invalid.isError, true);
    assert.equal(invalid.structuredContent, undefined);
  }
  const identity = await h.rpc('tools/call', {name:'pac_n90_ean_abgleichen', arguments:{ean:8004399512351,modell:'PAC N90 ECO Silent'}});
  assert.equal(identity.structuredContent.status, 'modellangaben_passen');
  assert.equal(identity.structuredContent.label_eu_kwh_je_60_min, undefined);
  h.assertNoWrites();
});

test('German cellar conditions match only reviewed model test points, with cause and no-purchase exits', async () => {
  const h = offlineWorker();
  const name = 'kellerentfeuchter_pruefpunkt_abgleichen';
  const args = expandedDefinitions.find(tool => tool.name === name).example.args;
  const call = changes => h.rpc('tools/call', {name, arguments:{...args, ...changes}});
  for (const [temp, litres, watts] of [[10, 3.4, 180], [20, 8.5, 216]]) {
    const r = (await call({temperatur_c:temp})).structuredContent;
    assert.equal(r.status, 'hersteller_pruefpunkt');
    assert.equal(r.liter_pro_tag, litres);
    assert.equal(r.leistungsaufnahme_w, watts);
    assert.equal(r.quellenmarkt, 'DE');
    assert.equal(r.quellenpruefung, '2026-11-23');
    assert.equal(r.guide_url, origin + cellar + '#kalter-keller');
    assert.equal(r.quelle, 'https://eu.meaco.com/products/meacodry-arete-one-20l-luftentfeuchter-luftreiniger');
    const unknown = (await call({modell:'comfee-mddf20', temperatur_c:temp})).structuredContent;
    assert.equal(unknown.status, 'wertepaar_offen');
    assert.equal(unknown.liter_pro_tag, null);
    assert.equal(unknown.leistungsaufnahme_w, null);
    assert.match(unknown.quelle, /comfee-MDDF-20DEN7-Datenblatt\.pdf#page=2$/);
    assert.match(unknown.modell, /ohne WF/);
  }
  for (const [changes, status] of [
    [{temperatur_c:10.01}, 'wertepaar_offen'],
    [{relative_feuchte_pct:59.9}, 'wertepaar_offen'],
    [{temperatur_c:30, relative_feuchte_pct:80}, 'wertepaar_offen'],
    [{wiederholt_gemessen:false}, 'zuerst_messen'],
    [{befund:'unauffaellig'}, 'kein_kaufbedarf_belegt'],
    [{befund:'wassereintritt_oder_schaden', wiederholt_gemessen:false}, 'ursache_klaeren'],
  ]) {
    const r = (await call(changes)).structuredContent;
    assert.equal(r.status, status);
    assert.equal(r.liter_pro_tag, null);
    assert.equal(r.leistungsaufnahme_w, null);
  }
  const twoSource = 'https://eu.meaco.com/products/meacodry-arete-two-12l-luftentfeuchter-luftreiniger';
  for (const [temperatur_c, litres, watts] of [[10, 1.97, 111], [20, 5.4, 136]]) {
    const exact = (await call({modell:'meaco-two-12', temperatur_c})).structuredContent;
    assert.equal(exact.status, 'hersteller_pruefpunkt');
    assert.equal(exact.liter_pro_tag, litres);
    assert.equal(exact.leistungsaufnahme_w, watts);
    assert.equal(exact.quelle, twoSource);
    assert.equal(exact.model_guide_url, origin + cellar + '#modell-meaco-two-12');
  }
  for (const [changes, status] of [
    [{relative_feuchte_pct:61}, 'wertepaar_offen'],
    [{wiederholt_gemessen:false}, 'zuerst_messen'],
    [{befund:'unauffaellig'}, 'kein_kaufbedarf_belegt'],
    [{befund:'wassereintritt_oder_schaden'}, 'ursache_klaeren'],
  ]) {
    const result = (await call({modell:'meaco-two-12', ...changes})).structuredContent;
    assert.equal(result.status, status);
    assert.equal(result.liter_pro_tag, null);
    assert.equal(result.model_guide_url, undefined);
  }
  assert.equal((await call({modell:'comfee-mddf20-wf'})).isError, true);
  const lookup = async model => (await h.rpc('tools/call', {
    name:'entfeuchter_kalt_modellbeleg', arguments:{model},
  })).structuredContent;
  const one = await lookup('meaco-one-20');
  assert.match(one.source_url, /^https:\/\/eu\.meaco\.com\/products\/.*one-20l/);
  assert.match(one.cold_evidence, /10 °C und 60 % relative Feuchte: 3,4 L\/Tag bei 180 W/);
  const two = await lookup('meaco-two-12');
  assert.equal(two.source_url, twoSource);
  assert.equal(two.source_checked, '2026-11-23');
  assert.match(two.cold_evidence, /10 °C und 60 % relative Feuchte: 1,97 L\/Tag bei 111 W/);
  assert.equal(two.model_guide_url, origin + cellar + '#modell-meaco-two-12');
  h.assertNoWrites();
});

test('laundry purchase payback counts only changed loads and requires complete comparable measurements', async () => {
  const h = offlineWorker();
  const name = 'waesche_trocknungswechsel_kaufschwelle';
  const {example} = expandedDefinitions.find(tool => tool.name === name);
  const call = input => h.rpc('tools/call', {name, arguments:{...example.args, ...input}});
  const check = async (input, expected) => {
    const result = await call(input);
    assert.equal(result.isError, false);
    for (const [key,value] of Object.entries(expected)) assert.equal(result.structuredContent[key], value, key);
  };
  await check({anschaffung_eur:84}, {kostendeckung_saisons:5, stromersparnis_saison_eur:16.8});
  await check({anschaffung_eur:0}, {kostendeckung_saisons:0, status:'vorhandene_option_stromguenstiger'});
  await check({ladungen_ersetzbar:0}, {trocknerladungen_weiter:100, status:'kein_stromkostenvorteil', gemischt_saison_eur:49, kostendeckung_saisons:null});
  await check({entfeuchter_kwh:1.6}, {status:'kein_stromkostenvorteil', stromersparnis_saison_eur:-4.2, kostendeckung_saisons:null});
  for (const input of [{ladungen_vergleichbar:false}, {zusatzstrom_erfasst:false}]) {
    await check(input, {status:'erst_vergleichbar_messen', bisher_saison_eur:null, gemischt_saison_eur:null,
      stromersparnis_saison_eur:null, kostendeckung_saisons:null});
  }
  for (const input of [{ladungen_ersetzbar:101}, {ladungen_ersetzbar:60.5}, {ladungen_saison:100.5}, {tarif_eur_kwh:-1}]) {
    const result = await call(input);
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent, undefined);
  }
  h.assertNoWrites();
});

test('laundry payback uses the measured decimal amounts before presentation rounding', async () => {
  const h = offlineWorker();
  const name = 'waesche_trocknungswechsel_kaufschwelle';
  const {example} = expandedDefinitions.find(tool => tool.name === name);
  const calculate = async input => {
    const args = {...example.args, ladungen_ersetzbar:50, tarif_eur_kwh:0.33, ...input};
    const result = await h.rpc('tools/call', {name, arguments:args});
    assert.equal(result.isError, false);
    return result.structuredContent;
  };
  // Both readings save exactly €16.665 per season. After six seasons only €99.99 is recovered.
  for (const [dryer, dehumidifier] of [[1.50, 0.49], [1.41, 0.40]]) {
    const readings = {trockner_kwh:dryer, entfeuchter_kwh:dehumidifier};
    const justShort = await calculate({...readings, anschaffung_eur:100});
    assert.equal(justShort.stromersparnis_saison_eur, 16.67);
    assert.equal(justShort.kostendeckung_saisons, 7);
    assert.equal((await calculate({...readings, anschaffung_eur:99.99})).kostendeckung_saisons, 6);
  }
  const subCent = await calculate({ladungen_ersetzbar:1, trockner_kwh:0.001, entfeuchter_kwh:0,
    tarif_eur_kwh:0.5, anschaffung_eur:0.01});
  assert.equal(subCent.stromersparnis_saison_eur, 0);
  assert.equal(subCent.kostendeckung_saisons, 20);
  const outOfRange = await calculate({ladungen_ersetzbar:1, trockner_kwh:5e-324, entfeuchter_kwh:0,
    tarif_eur_kwh:1e-20, anschaffung_eur:100});
  assert.equal(outOfRange.status, 'kostendeckung_ausserhalb_zahlenbereich');
  assert.equal(outOfRange.kostendeckung_saisons, null);
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
