/* Pulls edge-measured traffic from Cloudflare's GraphQL Analytics API and
   writes content/traffic.json.

   Why this exists alongside GA4. GA4 is measured in the visitor's browser, so
   it disappears whenever the browser or the network refuses to talk to Google:
   ad blockers, privacy browsers, and national firewalls all produce an empty
   property that looks identical to "nobody came". Cloudflare counts requests at
   the edge, before any of that applies. These are raw requests/page views,
   including bots and unclassified traffic. They cannot establish people,
   qualified visits, tool completions, affiliate clicks or GA4 event counts.
   Missing GA4 data is unavailable evidence, not a measured zero.

   This separate source uses the API token already in repository secrets;
   availability here does not establish availability in another collector.

   Credentials: it TRIES EVERY token secret it can see rather than preferring
   one. That is not tidiness — the first version preferred
   CLOUDFLARE_API_TOKEN_ZONE, the owner updated CLOUDFLARE_API_TOKEN, and the
   re-run failed with the byte-identical error from the old token. The failure
   looked like "the permission still isn't there" when the truth was "the new
   token was never read". Trying both, and printing which env var carried which
   token id, makes that class of confusion impossible to repeat.

   The token needs **Zone → Analytics → Read** on thedollscout.com. The tokens
   originally issued here were for DNS and Pages, so the permission may be
   missing — if so the script says exactly that rather than failing obscurely. */

import { writeFileSync, existsSync, readFileSync } from "node:fs";

const ZONE_NAME = "thedollscout.com";
const OUT = "content/traffic.json";

const TOKEN_VARS = ["CLOUDFLARE_API_TOKEN_ZONE", "CLOUDFLARE_API_TOKEN", "CF_API_TOKEN"];
/* Dedupe by value: the same token under two names is one credential, and
   reporting it twice would suggest two things were tried when one was. */
const CANDIDATES = [];
for (const name of TOKEN_VARS) {
  const value = (process.env[name] || "").trim();
  if (!value) continue;
  const already = CANDIDATES.find((c) => c.value === value);
  if (already) already.names.push(name);
  else CANDIDATES.push({ names: [name], value });
}

function bail(reason) {
  console.log("## Cloudflare edge traffic\n");
  console.log(`**Unavailable.** ${reason}`);
  process.exit(0);
}

if (!CANDIDATES.length) bail(`No API token in the environment (looked for ${TOKEN_VARS.join(", ")}).`);

let TOKEN = CANDIDATES[0].value;

/* Anything that is not JSON is an infrastructure answer, not an API answer —
   a proxy error page, a Cloudflare 5xx, a rate-limit interstitial. Parsing it
   blindly turns those into a crash, which in an unattended run means the whole
   thing stops. Read the text first and report what actually came back. */
async function json(url, init) {
  let res, text;
  try {
    res = await fetch(url, init);
    text = await res.text();
  } catch (e) {
    throw new Error(`request to ${new URL(url).host} failed: ${e.message}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${new URL(url).host} returned ${res.status} with a non-JSON body: ` +
      text.slice(0, 200).replace(/\s+/g, " ")
    );
  }
}

const api = (path) =>
  json("https://api.cloudflare.com/client/v4" + path, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });

/* Ask Cloudflare which token this actually is. The id is the only way to tell
   "the owner rotated the secret" from "the runner is still reading the old
   one", and that distinction cost a full debugging round. */
async function tokenId() {
  try {
    const v = await api("/user/tokens/verify");
    return v?.result?.id || "unknown id";
  } catch {
    return "unverifiable";
  }
}

/* Each candidate is tried in full. A token that cannot see the zone and a
   token that can see it but may not read its analytics fail at different
   points, and the report distinguishes them. */
const attempts = [];
let rows = null;
for (const cand of CANDIDATES) {
  TOKEN = cand.value;
  const label = cand.names.join(" = ");
  const id = await tokenId();
  try {
    rows = await collect();
    attempts.push({ label, id, verdict: "worked" });
    break;
  } catch (e) {
    attempts.push({ label, id, verdict: e.message });
  }
}

if (!rows) {
  const permissionProblem = attempts.some((a) => /permission/i.test(a.verdict));
  bail(
    "no token could read this zone's analytics.\n\n" +
    "| Secret | Cloudflare token id | Result |\n|---|---|---|\n" +
    attempts.map((a) => `| \`${a.label}\` | \`${a.id}\` | ${a.verdict} |`).join("\n") +
    (permissionProblem
      ? "\n\nThe token id above is what the runner actually used — check it matches the " +
        "token you edited. Add **Zone → Analytics → Read** for thedollscout.com in " +
        "Cloudflare dashboard → My Profile → API Tokens, then re-run."
      : "")
  );
}

await write(rows);

async function collect() {
const zones = await api(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
if (!zones.success) {
  throw new Error(`could not list zones: ${JSON.stringify(zones.errors || zones)}`);
}
const zone = (zones.result || [])[0];
if (!zone) throw new Error(`zone ${ZONE_NAME} is not visible to this token`);

/* 14 whole days ending yesterday, so partial days never look like a dip. */
const day = 86400000;
const midnight = Math.floor(Date.now() / day) * day;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const since = iso(midnight - 14 * day);
const until = iso(midnight - day);

/* Two queries, not one. The breakdown fields are the interesting part but they
   are also the part a plan tier or a schema change can refuse — and the plain
   counts already work today. Asking for everything in one shot would mean a
   rejected field takes the working traffic number down with it. */
const shape = (extras) => `
query Traffic($zone: String!, $since: Date!, $until: Date!) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      httpRequests1dGroups(
        limit: 30
        filter: { date_geq: $since, date_leq: $until }
        orderBy: [date_ASC]
      ) {
        dimensions { date }
        sum {
          requests
          pageViews
          ${extras}
        }
        uniq { uniques }
      }
    }
  }
}`;

/* Preserve the API's IP-reputation, response-status and country labels.
   These describe requests; none is a verified human/customer classifier. */
const EXTRAS = `
          ipClassMap { ipType requests }
          responseStatusMap { edgeResponseStatus requests }
          countryMap { clientCountryName requests }`;

/* browserMap is a user-agent-family breakdown, including named bots, Curl
   and Unknown as well as browser-family labels. Even browser-labelled traffic
   can be automated. Response content types are a separate request breakdown,
   not corroboration of people or browser execution. */
const BROWSER_EXTRAS = `
          browserMap { uaBrowserFamily pageViews }
          contentTypeMap { edgeResponseContentTypeName requests }`;

const ask = (query) =>
  json("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { zone: zone.id, since, until } }),
  });

/* Tiered, not all-or-nothing. A field this plan will not serve must cost only
   itself: the previous version fell straight from "everything" to "nothing",
   so one unavailable breakdown would have taken the working ones down with it.
   Most detailed first, then progressively less. */
let degraded = null;
let body = null;
const TIERS = [
  { label: "browser + content type + reputation", extras: EXTRAS + BROWSER_EXTRAS },
  { label: "reputation only", extras: EXTRAS },
  { label: "plain counts only", extras: "" },
];
for (const tier of TIERS) {
  const attempt = await ask(shape(tier.extras));
  if (attempt.errors && attempt.errors.length) {
    degraded = `${attempt.errors.map((e) => e.message).join("; ")} (fell back past "${tier.label}")`;
    continue;
  }
  body = attempt;
  if (tier !== TIERS[0]) degraded = `${degraded} — served "${tier.label}"`;
  break;
}
/* Only now is it a real failure: even the plain counts were refused. */
if (!body) throw new Error(degraded || "every query tier was refused");

const days = body.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
if (!days.length) throw new Error("the API returned no rows for this zone and date range");

return {
  since,
  until,
  degraded,
  updated: iso(midnight),
  rows: days.map((d) => ({
    date: d.dimensions.date,
    requests: d.sum.requests,
    pageViews: d.sum.pageViews,
    uniques: d.uniq.uniques,
    /* IP REPUTATION, not visitor type. `clean` = good reputation, `noRecord` =
       no reputation record held — ordinary people land in both, and so do
       unrecognised bots. Neither this map nor byBrowser measures humans. */
    byIpType: Object.fromEntries(
      (d.sum.ipClassMap || []).map((c) => [c.ipType, c.requests]).sort((a, b) => b[1] - a[1])
    ),
    /* Legacy key retained: raw UA-family labels, including bots and Unknown.
       A missing/empty map does not establish zero human visits. */
    byBrowser: Object.fromEntries(
      (d.sum.browserMap || []).map((b) => [b.uaBrowserFamily, b.pageViews]).sort((a, b) => b[1] - a[1])
    ),
    byContentType: Object.fromEntries(
      (d.sum.contentTypeMap || []).map((c) => [c.edgeResponseContentTypeName, c.requests]).sort((a, b) => b[1] - a[1])
    ),
    byStatus: Object.fromEntries(
      (d.sum.responseStatusMap || []).map((s) => [s.edgeResponseStatus, s.requests]).sort((a, b) => b[1] - a[1])
    ),
    topCountries: Object.fromEntries(
      (d.sum.countryMap || [])
        .map((c) => [c.clientCountryName, c.requests])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    ),
  })),
};
}

async function write({ since, until, updated, rows, degraded }) {
/* Requests and page views add up across days. Uniques do not — the same
   crawler IP on Monday and Tuesday is one address, not two visitors, so a
   summed "total unique visitors" overstates by roughly the number of days.
   Report the daily shape instead of inventing a total that does not exist. */
const total = rows.reduce(
  (a, r) => ({ requests: a.requests + r.requests, pageViews: a.pageViews + r.pageViews }),
  { requests: 0, pageViews: 0 }
);
const uniqPerDay = rows.map((r) => r.uniques);
const uniqAvg = Math.round(uniqPerDay.reduce((a, b) => a + b, 0) / uniqPerDay.length);
const uniqPeak = Math.max(...uniqPerDay);

/* Keep history so the loop can see a trend rather than a snapshot. Merge by
   date: re-running the same day corrects rather than duplicates. */
let history = {};
if (existsSync(OUT)) {
  try { history = JSON.parse(readFileSync(OUT, "utf8")).days || {}; } catch {}
}
for (const r of rows) history[r.date] = r;
const dates = Object.keys(history).sort();

writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: "Cloudflare GraphQL Analytics API (edge-measured)",
      note: "Counted at the edge, so unaffected by ad blockers, privacy browsers " +
            "or network-level blocking of Google. Raw requests/page views include " +
            "bots and unclassified traffic. byBrowser contains reported user-agent " +
            "families, not verified browsers or people; byIpType is IP reputation. " +
            "These counts cannot measure qualified visitors or substitute for GA4 " +
            "events, first-party actions or the collector's qualified-visit gate. " +
            "Missing breakdowns are unavailable, not zero people.",
      zone: ZONE_NAME,
      updated,
      window: { since: dates[0], until: dates[dates.length - 1] },
      days: history,
    },
    null,
    2
  ) + "\n"
);

console.log("## Cloudflare edge traffic\n");
console.log(`Zone ${ZONE_NAME}, ${since} → ${until}\n`);
const used = attempts.find((a) => a.verdict === "worked");
if (used) console.log(`_Read with \`${used.label}\` (token \`${used.id}\`)._\n`);
console.log(
  `**Raw edge requests: ${total.requests} · Raw edge page views: ${total.pageViews} · ` +
  `Unique IPs: ${uniqAvg}/day avg, ${uniqPeak} peak**\n`
);
console.log(
  "_Includes bots and unclassified traffic. Unique IPs are shown per day, not " +
  "summed or treated as people, sessions or qualified visits._\n"
);
console.log("| Date | Raw requests | Raw page views | Unique IPs |");
console.log("|---|---|---|---|");
for (const r of rows) console.log(`| ${r.date} | ${r.requests} | ${r.pageViews} | ${r.uniques} |`);

/* The point of this section: stop the headline number being read as people.
   Sum the classes across the window rather than per day — day-level splits on
   a site this small are noise. */
const classes = {};
const statuses = {};
for (const r of rows) {
  for (const [k, v] of Object.entries(r.byIpType || {})) classes[k] = (classes[k] || 0) + v;
  for (const [k, v] of Object.entries(r.byStatus || {})) statuses[k] = (statuses[k] || 0) + v;
}
if (degraded) {
  console.log(
    `\n_Some breakdown fields were unavailable this run (${degraded}). ` +
    "Available counts are retained; missing breakdowns are not zero. " +
    "No query tier establishes a bot/human split._"
  );
}
const uaFamilies = {};
const types = {};
for (const r of rows) {
  for (const [k, v] of Object.entries(r.byBrowser || {})) uaFamilies[k] = (uaFamilies[k] || 0) + v;
  for (const [k, v] of Object.entries(r.byContentType || {})) types[k] = (types[k] || 0) + v;
}
const uaFamilyViews = Object.values(uaFamilies).reduce((a, b) => a + b, 0);
console.log("\n### Reported user-agent families\n");
if (!Object.keys(uaFamilies).length) {
  console.log("**No user-agent-family entries returned (unavailable or empty breakdown).** This does not establish zero browser traffic or zero people.");
} else {
  console.log(`**${uaFamilyViews} page view(s) in the returned user-agent-family breakdown**, out of ${total.pageViews} raw edge page views.\n`);
  console.log("These labels include bots, non-browser clients and Unknown/unclassified traffic. A browser-family label is a user-agent classification, not verification of a person or qualified visit.");
  console.log("| Reported UA family | Raw page views |\n|---|---|");
  for (const [k, v] of Object.entries(uaFamilies).sort((a, b) => b[1] - a[1])) console.log(`| ${k} | ${v} |`);
}
if (Object.keys(types).length) {
  console.log("\n### Reported response content types\n");
  console.log("| Content type | Raw requests |\n|---|---|");
  for (const [k, v] of Object.entries(types).sort((a, b) => b[1] - a[1])) console.log(`| ${k} | ${v} |`);
  console.log("\nHTML/CSS/JS response counts do not prove page rendering or human activity: bots can fetch assets and browsers can use cached assets.");
}

const ranked = Object.entries(classes).sort((a, b) => b[1] - a[1]);
if (ranked.length) {
  console.log("\n### Reported IP reputation classes\n");
  console.log("| Cloudflare class | Requests | Share |");
  console.log("|---|---|---|");
  for (const [k, v] of ranked) {
    console.log(`| ${k} | ${v} | ${((v / total.requests) * 100).toFixed(1)}% |`);
  }
  console.log(
    "\n`clean` describes IP reputation, not a human-request ceiling. Other classes " +
    "do not establish the absence of people or customers. A missing class is not " +
    "a measured zero; none of these classes measures qualified visits."
  );
}
const notFound = (statuses["404"] || 0) + (statuses["403"] || 0);
if (notFound > total.requests * 0.2) {
  console.log(
    `\n**${notFound} of ${total.requests} requests got a 404/403.** ` +
    "Status codes alone do not distinguish scanners from people encountering " +
    "missing or restricted pages; no human-traffic count is inferred."
  );
}

console.log("\n_Edge requests, edge page views, UA labels, qualified visits, GA4 events " +
  "and first-party actions are separate measures. This report cannot pass or fail " +
  "the collector's 100-qualified-visit gate. Zero recorded edge requests applies " +
  "only to the queried zone/window; unavailable data is not zero._");
console.log(`\nHistory written to \`${OUT}\` (${dates.length} days retained).`);
}
