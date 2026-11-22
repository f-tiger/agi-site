#!/usr/bin/env node
// Check live identity, the complete standard catalogue, and reviewed tool answers.
// Full checks cover every fixture. Routine deployed checks can sample each category.

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {collectToolPages, MCP_PAGE_SIZE} from '../src/mcp-pagination.mjs';
import {expandedDefinitions, expandedTools} from '../src/mcp-expanded.mjs';

const MANIFEST = JSON.parse(readFileSync(new URL('../mcp/server.json', import.meta.url), 'utf8'));
const HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  // self-identify so the worker's telemetry can exclude CI from adoption
  "user-agent": "getecoback-ci/1.0",
  "x-probe": "1",
};

class RateLimitError extends Error {}

function textOf(result) {
  return (result?.content || []).map((c) => c.text || "").join("\n");
}

function verifyForecast(data) {
  const cities = ["Berlin", "Frankfurt", "München"];
  if (data?.forecast_source_url !== "https://open-meteo.com/en/docs" || !Array.isArray(data.coverage) ||
      data.coverage.length !== cities.length) return false;
  const available = cities.map(city => data.coverage.find(entry => entry.city === city)?.available_days);
  if (available.some(days => !Number.isInteger(days) || days < 0 || days > 3)) return false;
  if (available.every(days => days === 0)) {
    return data.forecast_status === "unavailable" &&
      data.peak_c === null && data.peak_city === null && data.peak_date === null;
  }
  const status = available.every(days => days === 3) ? "available" : "partial";
  return data.forecast_status === status && Number.isFinite(data.peak_c) &&
    available[cities.indexOf(data.peak_city)] > 0 && /^\d{4}-\d{2}-\d{2}$/.test(data.peak_date);
}

// Each case: tool, arguments, and substrings the answer must contain. The
// expectations are values computed by hand from the site's own formulas, so a
// silent change to a formula fails here instead of reaching an assistant.
const CASES = [
  ["entfeuchter_ablaufcheck", {drain: "level_or_uphill", model: "meaco-one-20"}, ["Pumpe", "Arete", "https://getecoback.com/guide/luftentfeuchter-keller.html?utm_source=eco-mcp&utm_medium=referral&utm_campaign=keller-ablauf#ablauf-vor-kauf"]],
  // 20 m² × 340 BTU/m² = 6.800, rounded up to the 7.000 the site's own
  // calculator shows — the expectation is the published number, not the raw one.
  // Legacy area-only requests must measure first; area cannot establish litres/day.
  ["geraet_wahl", { problem: "feucht_schimmel", qm: 20 }, ["Erst messen", "noch kein Entfeuchterkauf", "luftentfeuchter-ratgeber.html#eb-moisture-choice"]],
  ["geraet_wahl", { problem: "feucht_schimmel", purpose: "damage" }, ["Feuchtequelle zuerst", "luftentfeuchter-gegen-schimmel"]],
  ["geraet_wahl", { problem: "feucht_schimmel", humidity: "high", temperature: "cold" }, ["Kalte Räume", "keine feste Abschaltgrenze", "luftentfeuchter-keller"]],
  ["geraet_wahl", { problem: "feucht_schimmel", purpose: "laundry", humidity: "high", temperature: "warm" }, ["gleich trockener Ladung", "waeschetrockner-oder-luftentfeuchter.html#laundry-check"]],
  ["btu_empfehlung", { qm: 20, sonne: "normal" }, ["7.000", "BTU"]],
  ["fensterabdichtung_laenge", { breite_cm: 60, hoehe_cm: 140, fenstertyp: "kipp" }, ["4,00 m", "400"]],
  ["hitzewelle_vorschau", {}, ["°C"]],
  ["klimaanlage_stromkosten", { watt: 1000, stunden_pro_tag: 8, strompreis_euro_kwh: 0.3, tage: 30, auslastung: 0.65 }, ["46,80"]],
  ["heizleistung_watt", { qm: 20, daemmung: "mittel", strompreis_euro_kwh: 0.3 }, ["1.600", "Watt"]],
  ["taupunkt_lueften", { aussen_temp_c: 18, aussen_luftfeuchte_prozent: 60, innen_temp_c: 16 }, ["Taupunkt", "10,1"]],
  ["ratgeber_suche", { frage: "Klimaanlage Kippfenster abdichten", max: 3 }, ["getecoback.com", "kippfenster"]],
  ["ratgeber_lesen", { pfad: "/guide/luftentfeuchter-ratgeber.html" }, ["Luftentfeuchter", "Quelle: https://getecoback.com"]],
  ["ratgeber_suche", { frage: "Wäsche trocknen Wohnung Stromkosten", sprache: "de", max: 3 }, ["waeschetrockner-oder-luftentfeuchter.html"]],
  ["ratgeber_lesen", { pfad: "/waeschetrockner-oder-luftentfeuchter.html" }, ["gleichen gewünschten Trocknungsgrad", "keine Produktmessungen", "https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/beim-kauf-eines-waeschetrockners-an-den-stromverbrauch-denken-37984", "Gekürzt: nein"]],
  ["ratgeber_lesen", { pfad: "/fr/calculateur.html" }, ["Canonical: https://getecoback.com/fr/calculateur.html"]],
];

function sampleCategories(definitions) {
  const seen = new Set();
  return definitions.filter(({category}) => {
    if (seen.has(category)) return false;
    seen.add(category);
    return true;
  });
}

export async function runSmoke({
  mode = 'full',
  send = globalThis.fetch,
  log = console.log,
  base = MANIFEST.remotes[0].url,
  manifest = MANIFEST,
} = {}) {
  assert.ok(mode === 'full' || mode === 'bounded', 'MCP smoke mode must be full or bounded');
  let id = 0;
  async function rpc(method, params) {
    const response = await send(base, {
      method: 'POST',
      headers: HEADERS,
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({jsonrpc:'2.0', id:++id, method, params}),
    });
    if (response.status === 429) {
      await response.body?.cancel().catch(() => {});
      throw new RateLimitError('HTTP 429: MCP production check stopped at the request limit');
    }
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    // Streamable HTTP may answer as SSE. Read the last data event.
    const events = text.split('\n').filter(line => line.startsWith('data:'));
    const payload = JSON.parse(events.length ? events.at(-1).slice(5).trim() : text);
    if (payload.error) throw new Error(`RPC error: ${JSON.stringify(payload.error)}`);
    return payload.result;
  }

  const init = await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: {name:'getecoback-smoke', version:'1.0.0'},
  });
  const expectedName = manifest.name.split('/').at(-1);
  assert.equal(init?.serverInfo?.name, expectedName, 'Live MCP name differs from manifest');
  assert.equal(init?.serverInfo?.version, manifest.version, 'Live MCP version differs from manifest');
  log(`initialize OK — server: ${expectedName} ${manifest.version}`);

  const expected = new Set([...CASES.map(([name]) => name), ...expandedDefinitions.map(tool => tool.name)]);
  const pageLimit = Math.ceil(expected.size / MCP_PAGE_SIZE);
  let pages = 0;
  let listed = 0;
  const tools = await collectToolPages(async cursor => {
    const page = await rpc('tools/list', cursor ? {cursor} : {});
    assert.equal(page?.tools?.length, Math.min(MCP_PAGE_SIZE, expected.size - listed), 'Unexpected tools/list page size');
    pages++;
    listed += page.tools.length;
    assert.equal(page.nextCursor !== undefined, listed < expected.size, 'Unexpected tools/list continuation');
    return page;
  }, {maxPages:pageLimit});
  const catalogue = new Map(tools.map(tool => [tool.name, tool]));
  const missing = [...expected].filter(name => !catalogue.has(name));
  const unexpected = [...catalogue.keys()].filter(name => !expected.has(name));
  assert.ok(!missing.length && !unexpected.length,
    `Unexpected tools/list names. Missing: ${missing.slice(0, 5).join(', ')}. Unexpected: ${unexpected.slice(0, 5).join(', ')}`);
  for (const tool of expandedTools) {
    assert.deepEqual(catalogue.get(tool.name), tool, `Live tool contract differs for ${tool.name}`);
  }
  log(`tools/list OK — ${catalogue.size} tools across ${pages} pages`);

  const fails = [];
  for (const [tool, args, expects] of CASES) {
    try {
      const result = await rpc('tools/call', {name:tool, arguments:args});
      const body = textOf(result);
      if (tool === 'entfeuchter_ablaufcheck' && result.structuredContent?.outcome !== 'pump_check') {
        fails.push('Drainage tool did not return the higher-drain outcome for the exact model.');
      }
      if (tool === 'hitzewelle_vorschau' && !verifyForecast(result.structuredContent)) {
        fails.push('Forecast tool did not return a verified peak and coverage or typed source unavailability.');
      }
      const missingText = expects.filter(value => !body.toLowerCase().includes(value.toLowerCase()));
      if (result.isError) {
        fails.push(`${tool}: isError — ${body.slice(0, 120)}`);
      } else if (missingText.length) {
        fails.push(`${tool}: missing ${JSON.stringify(missingText)} in answer — ${body.slice(0, 160)}`);
      } else {
        log(`✓ ${tool} — ${body.split('\n')[0].slice(0, 96)}`);
      }
      // Every answer must name its source and disclose the affiliate funding.
      if (!/getecoback\.com/.test(body)) fails.push(`${tool}: answer has no source URL`);
      if (!/Affiliate/i.test(body)) fails.push(`${tool}: answer has no affiliate disclosure`);
      if (/https?:\/\/[^\s]*(?:amazon\.|amzn\.)|[?&]tag=/i.test(body)) fails.push(`${tool}: answer exposes a merchant/affiliate URL`);
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      fails.push(`${tool}: threw — ${error.message}`);
    }
  }

  const fixtures = mode === 'bounded' ? sampleCategories(expandedDefinitions) : expandedDefinitions;
  for (let offset = 0; offset < fixtures.length; offset += 4) {
    await Promise.all(fixtures.slice(offset, offset + 4).map(async tool => {
      try {
        const result = await rpc('tools/call', {name:tool.name, arguments:tool.example.args});
        const data = result?.structuredContent;
        if (result?.isError || data?.citation_url !== 'https://getecoback.com' + tool.page) {
          throw new Error('missing answer or source');
        }
        for (const [key,value] of Object.entries(tool.example.expect)) {
          const actual = data[key];
          const matches = typeof value === 'number'
            ? typeof actual === 'number' && Math.abs(actual - value) <= 1e-8 * Math.max(1,Math.abs(value))
            : JSON.stringify(actual) === JSON.stringify(value);
          if (!matches) throw new Error('unexpected ' + key);
        }
        log('✓ ' + tool.name);
      } catch (error) {
        if (error instanceof RateLimitError) throw error;
        fails.push(tool.name + ': ' + error.message);
      }
    }));
  }

  const refused = await rpc('tools/call', {name:'ratgeber_lesen', arguments:{
    pfad:'https://getecoback.com.evil.test/waeschetrockner-oder-luftentfeuchter.html',
  }});
  if (!refused.isError) fails.push('ratgeber_lesen accepted a noncanonical origin');
  if (fails.length) throw new Error('MCP production check failed:\n' + fails.join('\n'));
  const checked = CASES.length + fixtures.length + 1;
  log(`MCP ${mode} check passed: ${catalogue.size} listed tools, ${checked} tool calls.`);
  return {mode, pages, discovered:catalogue.size, checked};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--bounded'),
    'Usage: node tools/mcp_smoke.mjs [--bounded]');
  await runSmoke({mode:args.length ? 'bounded' : 'full', base:process.env.MCP_URL || undefined});
}
