/* Calls the LIVE /mcp endpoint the way an MCP client actually would.

   scripts/test-mcp.mjs proves the tool logic is right, but it imports callTool
   and reads the datasets off local disk. It has never touched the deployed
   endpoint. Everything between the two — the Pages Function actually being
   deployed, env.ASSETS.fetch resolving, the JSON-RPC envelope, CORS, the
   published JSON being reachable from inside the Worker — is unverified, and
   every one of those breaks silently: the site keeps working, the tools keep
   passing their unit tests, and no assistant can call anything.

   That is the same shape as every other failure found in this project. So it is
   checked from outside, on a runner, against the real host.

   Run: SITE=https://thedollscout.com node scripts/mcp-live-check.mjs */

const SITE = process.env.SITE || "https://thedollscout.com";
const URL_MCP = SITE + "/mcp";
const PROTOCOL = "2025-06-18";

let failed = 0;
const t = (name, ok, detail) => {
  if (ok) console.log(`ok    ${name}`);
  else { failed++; console.log(`FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

async function rpc(method, params, id = 1) {
  const res = await fetch(URL_MCP, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", "mcp-protocol-version": PROTOCOL },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* reported by the caller */ }
  return { status: res.status, json, text, headers: res.headers };
}

console.log(`Calling ${URL_MCP} as an MCP client would.\n`);

/* ---- 1. handshake ---- */
const init = await rpc("initialize", { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: "dollscout-live-check", version: "1" } });
t("initialize returns a JSON-RPC result",
  init.status === 200 && init.json?.result,
  `status ${init.status}, body: ${init.text.slice(0, 200)}`);
t("the server declares a protocol version and identifies itself",
  !!init.json?.result?.protocolVersion && !!init.json?.result?.serverInfo?.name,
  JSON.stringify(init.json?.result || {}).slice(0, 200));

/* An assistant running in a browser page cannot call this at all without CORS,
   and the failure appears only in that assistant's console. */
t("CORS allows a browser-based client",
  init.headers.get("access-control-allow-origin") === "*",
  `access-control-allow-origin: ${init.headers.get("access-control-allow-origin")}`);

/* ---- 2. discovery ---- */
const list = await rpc("tools/list", {}, 2);
const tools = list.json?.result?.tools || [];
t("tools/list returns the tool set", tools.length > 0, `got ${tools.length}`);
t("every tool has a name, a description and an input schema",
  tools.every((x) => x.name && x.description && x.inputSchema),
  tools.filter((x) => !(x.name && x.description && x.inputSchema)).map((x) => x.name).join(", "));

/* ---- 3. the tools actually answer, reading the PUBLISHED data ----
   This is the assertion that matters most: the endpoint is built to never
   reimplement a rule, so if env.ASSETS.fetch cannot reach the datasets from
   inside the Worker, every tool degrades to an error while the site itself
   looks perfectly healthy. */
const call = async (name, args) => {
  const r = await rpc("tools/call", { name, arguments: args }, 3);
  const raw = r.json?.result?.content?.[0]?.text;
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { /* reported */ }
  return { r, parsed, raw };
};

const weight = await call("doll_weight_by_height", { heightCm: 150 });
t("doll_weight_by_height answers from the live dataset",
  weight.parsed?.found === true && weight.parsed?.sampleSize > 0,
  `raw: ${String(weight.raw).slice(0, 200)}`);
t("its answer carries the recording date and the dataset's limitations",
  !!weight.parsed?.recorded && Array.isArray(weight.parsed?.limitations) && weight.parsed.limitations.length > 0,
  JSON.stringify(weight.parsed || {}).slice(0, 200));

const recourse = await call("payment_recourse", { country: "uk", paymentMethod: "credit", priceGbp: 1749 });
t("payment_recourse reproduces the published statute reading",
  recourse.parsed?.section75 === "yes",
  JSON.stringify(recourse.parsed || {}).slice(0, 200));

/* The refusals are the reason to trust the rest. A tool that invents an answer
   for data it does not have is worse than no tool, because an assistant repeats
   it as fact and the caller cannot see what was dropped. */
const missing = await call("doll_weight_by_height", { heightCm: 999 });
t("REFUSAL survives the network: an unknown height says so rather than guessing",
  missing.parsed?.found === false && /No 999cm listing/.test(missing.parsed?.message || ""),
  JSON.stringify(missing.parsed || {}).slice(0, 200));

const narnia = await call("import_rules", { country: "narnia" });
t("SAFETY: an uncovered country still carries the childlike-doll prohibition",
  narnia.parsed?.found === false && /[Cc]hildlike dolls are prohibited/.test(narnia.parsed?.important || ""),
  JSON.stringify(narnia.parsed || {}).slice(0, 250));

/* ---- 4. the same URL answers people and machines differently ----
   /mcp.html resolves to /mcp on Cloudflare Pages, so this Function shadows the
   documentation page. A crawler following the sitemap used to get a JSON blob
   with no title and no h1 — a published page that indexed as nothing. */
const asBrowser = await fetch(URL_MCP, { headers: { accept: "text/html,application/xhtml+xml" } });
const html = await asBrowser.text();
t("a browser or crawler asking for HTML gets the documentation page",
  /<h1[\s>]/i.test(html) && /<title>[^<]{10,}</i.test(html),
  `content-type ${asBrowser.headers.get("content-type")}, ${html.length}b, starts: ${html.slice(0, 120)}`);

const asClient = await fetch(URL_MCP, { headers: { accept: "application/json" } });
const disc = await asClient.json().catch(() => null);
t("a client asking for JSON still gets the discovery document",
  Array.isArray(disc?.tools) && disc.tools.length > 0,
  JSON.stringify(disc || {}).slice(0, 160));

/* ---- 5. discovery documents agree with the running server ---- */
const srv = await fetch(SITE + "/server.json").then((r) => r.json()).catch(() => null);
t("/server.json is live and names the same server",
  !!srv && (srv.name || "").includes("dollscout"),
  JSON.stringify(srv || {}).slice(0, 160));

console.log(
  failed
    ? `\n${failed} failed. The endpoint is published but does not work as an MCP server — no assistant can use it, and nothing on the site would show that.`
    : `\nAll passed. ${tools.length} tools are callable on the live endpoint and every answer came from the published data.`
);
process.exit(failed ? 1 : 0);
