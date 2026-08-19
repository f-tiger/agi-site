#!/usr/bin/env node
// End-to-end check of the live MCP server: initialize, tools/list, then one
// real call per tool, asserting the answer actually contains the number or
// text it promises. The deploy workflow only proves /mcp responds at all —
// this proves the tools work, which is what a directory listing claims.
//
// Runs from CI (the sandbox has no outbound network). Exit 1 on any failure.

const BASE = process.env.MCP_URL || "https://getecoback.com/mcp/v1";
const HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
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
  // 20 m² × 340 BTU/m² = 6.800, rounded up to the 7.000 the site's own
  // calculator shows — the expectation is the published number, not the raw one.
  ["btu_empfehlung", { qm: 20, sonne: "normal" }, ["7.000", "BTU"]],
  ["fensterabdichtung_laenge", { breite_cm: 60, hoehe_cm: 140, fenstertyp: "kipp" }, ["4,00 m", "400"]],
  ["hitzewelle_vorschau", {}, ["°C"]],
  ["klimaanlage_stromkosten", { watt: 1000, stunden_pro_tag: 8, strompreis_euro_kwh: 0.3, tage: 30, auslastung: 0.65 }, ["46,80"]],
  ["heizleistung_watt", { qm: 20, daemmung: "mittel", strompreis_euro_kwh: 0.3 }, ["1.600", "Watt"]],
  ["taupunkt_lueften", { aussen_temp_c: 18, aussen_luftfeuchte_prozent: 60, innen_temp_c: 16 }, ["Taupunkt", "10,1"]],
  ["balkonspeicher_foerderung", { bundesland: "Sachsen", preis_eur: 800, zuschuss_eur: 300 }, ["Sachsen", "5,0 Jahre", "ERST Antrag"]],
  ["ratgeber_suche", { frage: "Klimaanlage Kippfenster abdichten", max: 3 }, ["getecoback.com", "kippfenster"]],
  ["ratgeber_lesen", { pfad: "/guide/balkonspeicher-foerderung.html" }, ["Förder", "Quelle: https://getecoback.com"]],
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
if (names.length !== CASES.length) {
  fails.push(`tools/list returned ${names.length} tools, smoke test covers ${CASES.length}`);
}
for (const [tool] of CASES) {
  if (!names.includes(tool)) fails.push(`tool missing from tools/list: ${tool}`);
}

for (const [tool, args, expects] of CASES) {
  try {
    const result = await rpc("tools/call", { name: tool, arguments: args });
    const body = textOf(result);
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
  } catch (e) {
    fails.push(`${tool}: threw — ${e.message}`);
  }
}

if (fails.length) {
  console.error("\nFAILURES:");
  for (const f of fails) console.error(" ✗ " + f);
  process.exit(1);
}
console.log("\nAll 9 tools answered correctly against production.");
