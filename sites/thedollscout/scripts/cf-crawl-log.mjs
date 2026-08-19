/* What did the search crawlers actually FETCH, path by path, and what did they
   get back?

   Why this exists. The daily traffic script answers "did anyone arrive" from
   httpRequests1dGroups, which has no path and no user-agent dimension — so it
   can say 277 Googlebot page views and cannot say which pages, or with what
   status. That left one question needing Search Console, which needs a Google
   service account this project does not have: is Googlebot hitting the URLs we
   publish, and what does it get?

   httpRequestsAdaptiveGroups does carry clientRequestPath, edgeResponseStatus
   and userAgent. It is not a substitute for Search Console — Cloudflare cannot
   know whether Google chose to INDEX a page, only what it requested — but it
   answers the mechanical half directly, from data we already own.

   The specific thing worth knowing right now: until 2026-08-14 every published
   URL was the .html form and Cloudflare 308'd it to the extensionless path. If
   the log shows Googlebot repeatedly fetching .html URLs and collecting 308s,
   that is the redirect diagnosis confirmed from the server side rather than
   inferred from a probe we sent ourselves.

   Adaptive datasets have a short retention on lower plans — days, not weeks —
   so this reports the recent window and says so rather than pretending to
   history it cannot see.

   Runs on a runner; the editing sandbox has no egress.
   Needs Zone → Analytics → Read, the same token the traffic job uses. */

import { writeFileSync, readFileSync, existsSync } from "node:fs";

const ZONE_NAME = "thedollscout.com";
const DAYS = Number(process.env.CRAWL_DAYS || 3);
const OUT = "content/crawl-log.json";

const TOKEN_VARS = ["CLOUDFLARE_API_TOKEN_ZONE", "CLOUDFLARE_API_TOKEN", "CF_API_TOKEN"];
const TOKENS = [...new Set(TOKEN_VARS.map((n) => (process.env[n] || "").trim()).filter(Boolean))];

const bail = (why) => {
  console.log("## Crawler fetch log\n");
  console.log(`**Unavailable.** ${why}`);
  process.exit(0);
};

if (!TOKENS.length) bail(`No API token in the environment (looked for ${TOKEN_VARS.join(", ")}).`);

let TOKEN = TOKENS[0];

async function json(url, init) {
  const res = await fetch(url, init);
  const body = await res.text();
  try { return JSON.parse(body); } catch {
    throw new Error(`${new URL(url).host} returned ${res.status} non-JSON: ${body.slice(0, 160).replace(/\s+/g, " ")}`);
  }
}

const gql = (query, variables) =>
  json("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

/* Resolve the zone with whichever token can see it. */
let zoneId = null;
for (const t of TOKENS) {
  TOKEN = t;
  try {
    const z = await json(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(ZONE_NAME)}`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    if (z.success && z.result?.[0]) { zoneId = z.result[0].id; break; }
  } catch { /* try the next token */ }
}
if (!zoneId) bail(`No token could see the zone ${ZONE_NAME}.`);

const now = new Date();
const since = new Date(now.getTime() - DAYS * 86400000).toISOString();
const until = now.toISOString();

/* The adaptive dataset refuses any window wider than one day:
     "cannot request a time range wider than 1d, but your query time range spans 1w"
   So the window is walked one day at a time and merged. Each day is
   independent — a day outside retention fails on its own instead of taking the
   whole report with it. */
const DAY_WINDOWS = Array.from({ length: DAYS }, (_, i) => {
  const end = new Date(now.getTime() - i * 86400000);
  const start = new Date(end.getTime() - 86400000);
  return { since: start.toISOString(), until: end.toISOString() };
});

/* One query per crawler. Grouping by userAgent as a dimension would explode the
   cardinality and burn the row limit on browser strings; filtering to one bot
   at a time keeps every row relevant. */
const BOTS = [
  ["Googlebot", "%Googlebot%"],
  ["Bingbot", "%bingbot%"],
  ["GPTBot", "%GPTBot%"],
  ["ClaudeBot", "%ClaudeBot%"],
  ["PerplexityBot", "%PerplexityBot%"],
];

/* verifiedBotCategory is the field that separates the real crawler from anything
   wearing its name. A user-agent string is self-declared and trivially forged;
   Cloudflare verifies the requesting IP against the operator's published ranges.
   Requested as a separate dimension so that if this plan will not serve it, the
   path/status report still works — see the fallback below. */
const shape = (extra) => `
query Crawl($zone: String!, $since: Time!, $until: Time!, $ua: String!) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      httpRequestsAdaptiveGroups(
        limit: 500
        filter: { datetime_geq: $since, datetime_leq: $until, userAgent_like: $ua }
        orderBy: [count_DESC]
      ) {
        count
        dimensions { clientRequestPath edgeResponseStatus ${extra} }
      }
    }
  }
}`;
const QUERY = shape("verifiedBotCategory");
const QUERY_PLAIN = shape("");

console.log("## Crawler fetch log\n");
console.log(`Zone ${ZONE_NAME}, last ${DAYS} day(s) — ${since.slice(0, 16)}Z → ${until.slice(0, 16)}Z\n`);
console.log("_Adaptive analytics retention is short on lower plans, so this is a recent window, not history._\n");

const report = {};
let anyData = false;
let verifiedUnavailable = false;

for (const [name, like] of BOTS) {
  /* Merge the per-day windows, keyed by path+status. */
  const merged = new Map();
  const refusals = [];
  let daysWithData = 0;
  for (const w of DAY_WINDOWS) {
    try {
      let body = await gql(QUERY, { zone: zoneId, since: w.since, until: w.until, ua: like });
      if (body.errors?.length) {
        /* Lose the verification field rather than the whole day. */
        body = await gql(QUERY_PLAIN, { zone: zoneId, since: w.since, until: w.until, ua: like });
        if (!verifiedUnavailable) { verifiedUnavailable = true; }
      }
      if (body.errors?.length) { refusals.push(`${w.since.slice(0, 10)}: ${body.errors.map((e) => e.message).join("; ")}`); continue; }
      const day = body.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];
      if (day.length) daysWithData++;
      for (const r of day) {
        const key = `${r.dimensions.clientRequestPath}\u0000${r.dimensions.edgeResponseStatus}\u0000${r.dimensions.verifiedBotCategory || ""}`;
        const prev = merged.get(key);
        if (prev) prev.count += r.count;
        else merged.set(key, { count: r.count, dimensions: { ...r.dimensions } });
      }
    } catch (e) {
      refusals.push(`${w.since.slice(0, 10)}: ${e.message}`);
    }
  }
  const rows = [...merged.values()].sort((a, b) => b.count - a.count);
  if (refusals.length && !rows.length) {
    console.log(`### ${name}\n\nNo data. ${refusals.length} of ${DAY_WINDOWS.length} day-window(s) refused:\n`);
    for (const r of [...new Set(refusals)].slice(0, 3)) console.log(`- ${r}`);
    console.log("");
    continue;
  }
  if (refusals.length) {
    console.log(`_${refusals.length} of ${DAY_WINDOWS.length} day-windows for ${name} returned nothing usable (likely outside retention)._\n`);
  }

  if (!rows.length) {
    console.log(`### ${name}\n\nNo requests in this window.\n`);
    report[name] = { total: 0, paths: [] };
    continue;
  }
  anyData = true;

  const total = rows.reduce((a, r) => a + r.count, 0);
  const byStatus = {};
  const redirected = [];
  for (const r of rows) {
    const s = String(r.dimensions.edgeResponseStatus);
    byStatus[s] = (byStatus[s] || 0) + r.count;
    if (s.startsWith("3")) redirected.push({ path: r.dimensions.clientRequestPath, status: s, count: r.count });
  }

  const verifiedCounts = {};
  for (const r of rows) {
    const v = r.dimensions.verifiedBotCategory || "(unclassified)";
    verifiedCounts[v] = (verifiedCounts[v] || 0) + r.count;
  }

  console.log(`### ${name} — ${total} request(s)\n`);

  if (!verifiedUnavailable) {
    const ranked = Object.entries(verifiedCounts).sort((a, b) => b[1] - a[1]);
    console.log(`Cloudflare bot verification: ${ranked.map(([k, n]) => `**${k}** ×${n}`).join(" · ")}\n`);
    const unverified = total - (verifiedCounts["Search Engine Crawler"] || 0) - (verifiedCounts["AI Crawler"] || 0) - (verifiedCounts["Page Preview"] || 0);
    if (unverified > total * 0.3) {
      console.log(
        `**${unverified} of ${total} (${Math.round((unverified / total) * 100)}%) were NOT verified as ${name}.** ` +
        `The user-agent is self-declared; Cloudflare checks the source IP against the operator's published ranges. ` +
        `Traffic that claims this name and fails that check is something else wearing it.\n`
      );
    }
  }
  console.log(`Status codes: ${Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([s, n]) => `**${s}** ×${n}`).join(" · ")}\n`);

  /* The line that matters: a crawler spending its budget on redirects is a
     crawler that never reached the page. */
  const redirCount = redirected.reduce((a, r) => a + r.count, 0);
  if (redirCount) {
    console.log(`**${redirCount} of ${total} (${Math.round((redirCount / total) * 100)}%) were redirects.** Top redirected paths:\n`);
    console.log("| Path | Status | Requests |\n|---|---|---|");
    for (const r of redirected.sort((a, b) => b.count - a.count).slice(0, 12)) {
      console.log(`| \`${r.path}\` | ${r.status} | ${r.count} |`);
    }
    console.log("");
  }

  /* The discovery surfaces, called out by name. "Has Google re-read the
     sitemap since we changed it" is the question lastmod depends on — Google
     removed the ping endpoint in 2023 and now schedules re-crawls from lastmod,
     which it can only act on after re-fetching the file. A sitemap Google has
     not re-read cannot be helping yet, and that is invisible in a totals row. */
  const discovery = rows.filter((r) => /^\/(sitemap\.xml|robots\.txt|llms\.txt|feed\.xml|server\.json|mcp)$/.test(r.dimensions.clientRequestPath));
  if (discovery.length) {
    console.log(`Discovery surfaces fetched: ${discovery.map((r) => `\`${r.dimensions.clientRequestPath}\` (${r.dimensions.edgeResponseStatus}) ×${r.count}`).join(" · ")}\n`);
  } else {
    console.log(`_No discovery surface (sitemap.xml, robots.txt, llms.txt, feed.xml) fetched in this window._\n`);
  }

  console.log(`Most-fetched paths:\n`);
  console.log("| Path | Status | Requests |\n|---|---|---|");
  for (const r of rows.slice(0, 15)) {
    console.log(`| \`${r.dimensions.clientRequestPath}\` | ${r.dimensions.edgeResponseStatus} | ${r.count} |`);
  }
  console.log("");

  report[name] = {
    total,
    byStatus,
    verified: verifiedUnavailable ? null : verifiedCounts,
    redirectShare: total ? Math.round((redirCount / total) * 100) : 0,
    paths: rows.slice(0, 60).map((r) => ({
      path: r.dimensions.clientRequestPath,
      status: Number(r.dimensions.edgeResponseStatus),
      count: r.count,
    })),
  };
}

if (!anyData) {
  console.log(
    "\nNo crawler rows came back at all. Either this plan does not serve " +
    "`httpRequestsAdaptiveGroups`, or the window is outside its retention. The daily " +
    "`httpRequests1dGroups` numbers in content/traffic.json are unaffected."
  );
} else {
  /* History, merged by run date. The single number worth watching is the
     redirect share for VERIFIED Googlebot: it was the whole site until
     2026-08-14 and should converge on zero as Google's queue drains. A
     snapshot cannot show convergence; a series can. */
  let history = {};
  if (existsSync(OUT)) {
    try { history = JSON.parse(readFileSync(OUT, "utf8")).days || {}; } catch { /* start fresh */ }
  }
  const day = until.slice(0, 10);
  history[day] = Object.fromEntries(
    Object.entries(report).map(([bot, r]) => [bot, { total: r.total, redirectShare: r.redirectShare, verified: r.verified }])
  );

  writeFileSync(
    OUT,
    JSON.stringify({ zone: ZONE_NAME, updated: day, window: { since, until }, days: history, latest: report }, null, 2) + "\n"
  );

  const dates = Object.keys(history).sort();
  if (dates.length > 1) {
    console.log("\n### Redirect share over time\n");
    console.log("_The number that should fall to zero as each crawler's queue drains of the old .html URLs._\n");
    const bots = [...new Set(dates.flatMap((d) => Object.keys(history[d])))];
    console.log(`| Date | ${bots.join(" | ")} |`);
    console.log(`|---|${bots.map(() => "---").join("|")}|`);
    for (const d of dates) {
      console.log(`| ${d} | ${bots.map((b) => (history[d][b] ? `${history[d][b].redirectShare}%` : "—")).join(" | ")} |`);
    }
  }

  console.log(`\nWritten to \`${OUT}\` (${dates.length} day(s) retained).`);
  console.log(
    "\n_What this can and cannot say: Cloudflare sees every request a crawler made and the " +
    "status it received. It cannot see whether Google chose to INDEX any of it — that lives " +
    "only in Search Console. This answers the mechanical half._"
  );
}
