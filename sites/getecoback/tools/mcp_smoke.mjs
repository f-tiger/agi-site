#!/usr/bin/env node
// End-to-end check of the live MCP server: initialize, tools/list, then one
// real call per tool, asserting the answer actually contains the number or
// text it promises. The deploy workflow only proves /mcp responds at all —
// this proves the tools work, which is what a directory listing claims.
//
// Runs from CI (the sandbox has no outbound network). Exit 1 on any failure.

import {expandedDefinitions} from "../src/mcp-expanded.mjs";

const BASE = process.env.MCP_URL || "https://getecoback.com/mcp/v1";
const HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  // self-identify so the worker's telemetry can exclude CI from adoption
  "user-agent": "getecoback-ci/1.0",
};

let id = 0;
async function rpc(method, params) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  // Streamable HTTP may answer as SSE; take the last data: line if so.
  let payload = text;
  if (/^\s*event:|^\s*data:/m.test(text)) {
    const lines = text.split("\n").filter((l) => l.startsWith("data:"));
    payload = lines.length ? lines[lines.length - 1].slice(5).trim() : text;
  }
  const json = JSON.parse(payload);
  if (json.error) throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
  return json.result;
}

function textOf(result) {
  return (result?.content || []).map((c) => c.text || "").join("\n");
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

const fails = [];

const init = await rpc("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "getecoback-smoke", version: "1.0.0" },
});
console.log(`initialize OK — server: ${init?.serverInfo?.name} ${init?.serverInfo?.version || ""}`);

const list = await rpc("tools/list", {});
const names = (list?.tools || []).map((t) => t.name);
console.log(`tools/list OK — ${names.length} tools: ${names.join(", ")}`);
const coveredNames = [...new Set([...CASES.map(([tool]) => tool), ...expandedDefinitions.map(tool => tool.name)])];
if (names.length !== coveredNames.length) {
  fails.push(`tools/list returned ${names.length} tools, smoke test covers ${coveredNames.length}`);
}
for (const [tool] of CASES) {
  if (!names.includes(tool)) fails.push(`tool missing from tools/list: ${tool}`);
}

for (const [tool, args, expects] of CASES) {
  try {
    const result = await rpc("tools/call", { name: tool, arguments: args });
    const body = textOf(result);
    if (tool === 'entfeuchter_ablaufcheck' && result.structuredContent?.outcome !== 'pump_check') {
      fails.push('Drainage tool did not return the higher-drain outcome for the exact model.');
    }
    const missing = expects.filter((e) => !body.toLowerCase().includes(String(e).toLowerCase()));
    if (result.isError) {
      fails.push(`${tool}: isError — ${body.slice(0, 120)}`);
    } else if (missing.length) {
      fails.push(`${tool}: missing ${JSON.stringify(missing)} in answer — ${body.slice(0, 160)}`);
    } else {
      console.log(`✓ ${tool} — ${body.split("\n")[0].slice(0, 96)}`);
    }
    // Every answer must name its source and disclose the affiliate funding;
    // that promise is what makes the server safe to cite.
    if (!/getecoback\.com/.test(body)) fails.push(`${tool}: answer has no source URL`);
    if (!/Affiliate/i.test(body)) fails.push(`${tool}: answer has no affiliate disclosure`);
    if (/https?:\/\/[^\s]*(?:amazon\.|amzn\.)|[?&]tag=/i.test(body)) fails.push(`${tool}: answer exposes a merchant/affiliate URL`);
  } catch (e) {
    fails.push(`${tool}: threw — ${e.message}`);
  }
}

// At most four network calls are in flight during the publication gate.
for (let offset = 0; offset < expandedDefinitions.length; offset += 4) {
  await Promise.all(expandedDefinitions.slice(offset, offset + 4).map(async tool => {
    try {
      if (!names.includes(tool.name)) throw new Error("missing from tools/list");
      const result = await rpc("tools/call", {name:tool.name, arguments:tool.example.args});
      const data = result?.structuredContent;
      if (result?.isError || data?.citation_url !== "https://getecoback.com" + tool.page) {
        throw new Error("missing answer or source");
      }
      for (const [key,value] of Object.entries(tool.example.expect)) {
        const actual = data[key];
        const matches = typeof value === "number"
          ? typeof actual === "number" && Math.abs(actual - value) <= 1e-8 * Math.max(1,Math.abs(value))
          : JSON.stringify(actual) === JSON.stringify(value);
        if (!matches) throw new Error("unexpected " + key);
      }
      console.log("✓ " + tool.name);
    } catch (error) {
      fails.push(tool.name + ": " + error.message);
    }
  }));
}

const refused = await rpc('tools/call', {name: 'ratgeber_lesen', arguments: {
  pfad: 'https://getecoback.com.evil.test/waeschetrockner-oder-luftentfeuchter.html',
}});
if (!refused.isError) fails.push('ratgeber_lesen accepted a noncanonical origin');

if (fails.length) {
  console.error("\nFAILURES:");
  for (const f of fails) console.error(" ✗ " + f);
  process.exit(1);
}
console.log(`\nAll ${coveredNames.length} tools answered correctly in ${CASES.length + expandedDefinitions.length} production checks.`);
