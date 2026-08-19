/* Pulls edge-measured traffic from Cloudflare's GraphQL Analytics API and
   writes content/traffic.json.

   Why this exists alongside GA4. GA4 is measured in the visitor's browser, so
   it disappears whenever the browser or the network refuses to talk to Google:
   ad blockers, privacy browsers, and national firewalls all produce an empty
   property that looks identical to "nobody came". Cloudflare counts requests at
   the edge, before any of that applies. It cannot see events, tools completed
   or affiliate clicks — but it can always answer "did anyone arrive", which is
   the question GA4 currently cannot answer for this owner.

   It also unblocks the growth loop. GA4 needs a service account the owner has
   not created yet; this uses the API token already in the repository secrets,
   so the loop gets a real traffic number with no further setup.

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

/* Without ipClassMap the headline number is a lie by omission: an unpromoted
   site's "unique visitors" are overwhelmingly crawlers and scanners, and one
   undifferentiated figure invites reading bots as people. ipType splits
   searchEngine / scanner / clean at the edge. A wave of 404s means a
   vulnerability scanner walking wp-admin paths — same requests, opposite
   meaning — so responseStatusMap earns its place too. */
const EXTRAS = `
          ipClassMap { ipType requests }
          responseStatusMap { edgeResponseStatus requests }
          countryMap { clientCountryName requests }`;

/* The field that actually answers "was anyone here a person".
   ipClassMap does NOT: `clean` means "this IP has a good reputation" and
   `noRecord` means "Cloudflare holds no reputation record for it" — ordinary
   residential visitors land in either, so a zero in `clean` is not a zero in
   humans, and reading it that way overstates what the edge can see.
   browserMap is different in kind. Cloudflare only assigns a browser family
   when the request looks like a browser rendering a page, so its pageViews are
   the closest thing this plan offers to a human count. contentTypeMap is the
   corroborating signal: a browser that renders a page also fetches the CSS and
   the JavaScript, and a crawler taking only the HTML does not. */
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
       unrecognised bots. Do not read a zero in `clean` as a zero in humans;
       that is what byBrowser is for. */
    byIpType: Object.fromEntries(
      (d.sum.ipClassMap || []).map((c) => [c.ipType, c.requests]).sort((a, b) => b[1] - a[1])
    ),
    /* Page views Cloudflare could attribute to a browser family. The nearest
       thing to a human count this plan exposes. */
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
            "or network-level blocking of Google. Includes bot and crawler traffic, " +
            "which on a new site is most of it — read it as a floor, not as humans.",
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
  `**Requests: ${total.requests} · Page views: ${total.pageViews} · ` +
  `Unique IPs: ${uniqAvg}/day avg, ${uniqPeak} peak**\n`
);
console.log(
  "_Unique IPs are shown per day, not summed. Summing them would count the " +
  "same crawler returning tomorrow as a second visitor._\n"
);
console.log("| Date | Requests | Page views | Uniques |");
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
    `\n_No bot/human breakdown this run — the API refused those fields (${degraded}). ` +
    "The counts above are still real; they just cannot be split into crawlers and people._"
  );
}
/* ---- the question the other numbers cannot answer ---- */
const browsers = {};
const types = {};
for (const r of rows) {
  for (const [k, v] of Object.entries(r.byBrowser || {})) browsers[k] = (browsers[k] || 0) + v;
  for (const [k, v] of Object.entries(r.byContentType || {})) types[k] = (types[k] || 0) + v;
}
const browserViews = Object.values(browsers).reduce((a, b) => a + b, 0);
if (Object.keys(browsers).length || Object.keys(types).length) {
  console.log("\n### Was anyone a person?\n");
  if (!Object.keys(browsers).length) {
    console.log("**No page view in this window was attributed to any browser family.**");
    console.log("Cloudflare assigns a browser only to requests that look like a browser rendering a page.");
  } else {
    console.log(`**${browserViews} page view(s) attributed to a browser**, out of ${total.pageViews} total.\n`);
    console.log("| Browser | Page views |\n|---|---|");
    for (const [k, v] of Object.entries(browsers).sort((a, b) => b[1] - a[1])) console.log(`| ${k} | ${v} |`);
  }
  /* Corroboration. A browser that renders a page also fetches the stylesheet
     and the script; a crawler that takes the HTML and leaves does not. If the
     HTML count is large and the CSS/JS counts are near zero, the visitors were
     not running a browser, whatever their IP reputation says. */
  const html = types["text/html"] || 0;
  const assets = (types["text/css"] || 0) + (types["application/javascript"] || 0) + (types["text/javascript"] || 0);
  if (html || assets) {
    console.log(`\nHTML responses: **${html}** · CSS+JS responses: **${assets}**`);
    console.log(
      assets < html * 0.1
        ? "\nAlmost nothing fetched the stylesheet or the script. Requests took the HTML and left, " +
          "which is what a crawler does and not what a browser does."
        : "\nThe stylesheet and script were fetched alongside the HTML, which is what a real browser does."
    );
  }
}

const ranked = Object.entries(classes).sort((a, b) => b[1] - a[1]);
if (ranked.length) {
  console.log("\n### Who those requests were\n");
  console.log("| Cloudflare class | Requests | Share |");
  console.log("|---|---|---|");
  for (const [k, v] of ranked) {
    console.log(`| ${k} | ${v} | ${((v / total.requests) * 100).toFixed(1)}% |`);
  }
  const clean = classes.clean || 0;
  console.log(
    `\n\`clean\` (${clean}) is the **ceiling** on human requests, not a count of them — ` +
    "unrecognised bots are classified clean too. Everything else on that list is " +
    "definitionally not a customer."
  );
}
const notFound = (statuses["404"] || 0) + (statuses["403"] || 0);
if (notFound > total.requests * 0.2) {
  console.log(
    `\n**${notFound} of ${total.requests} requests got a 404/403.** That is the ` +
    "signature of vulnerability scanners walking paths that were never here " +
    "(wp-admin, .env, phpmyadmin), not of people failing to find pages. " +
    "Discount it from any read of the traffic."
  );
}

console.log("\n_Edge-measured, so this includes crawlers and bots — on a new site that is " +
  "most of the traffic. Its value is that it cannot be zeroed by an ad blocker or a " +
  "firewall, so a zero here means genuinely nobody arrived._");
console.log(`\nHistory written to \`${OUT}\` (${dates.length} days retained).`);
}
