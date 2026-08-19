/* Pulls Search Console data — queries, pages, impressions, clicks, position —
   and writes content/gsc.json plus a markdown summary to stdout. Read-only,
   zero dependencies; the service-account JWT is signed with node:crypto.

   This exists because the interactive GA4/GSC access this project had been
   using was a trial that expires. Search data is the one forward-looking
   signal a pre-traffic site has (impressions show which queries the site
   surfaces for BEFORE anyone clicks), so it must not depend on a paid seat.

   ── Setup (owner, once — same service account as ga4-report.mjs) ──────────
   1. In the same Google Cloud project: enable the "Google Search Console API".
   2. Search Console → thedollscout.com property → Settings → Users and
      permissions → Add user → the service account's client_email →
      "Restricted" is sufficient for reads.
   3. Secrets (GitHub → repo → Settings → Secrets and variables → Actions):
        GSC_SITE                  sc-domain:thedollscout.com   (this exact string)
        GA4_SERVICE_ACCOUNT_JSON  the same JSON key ga4-report.mjs uses
      One key, two APIs — do not create a second service account.

   Missing credentials exit 0 with an explanation: a configuration gap is a
   fact for the loop to report, not an error that should kill the run. */

import { createSign } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";

const SITE = process.env.GSC_SITE || "sc-domain:thedollscout.com";
const KEY_JSON = process.env.GA4_SERVICE_ACCOUNT_JSON;
const OUT = "content/gsc.json";

if (!KEY_JSON) {
  console.log("## Search Console\n");
  console.log("**Credentials not configured.** Missing GA4_SERVICE_ACCOUNT_JSON " +
    "(the same key serves both GA4 and Search Console). Setup instructions are " +
    "in the header of scripts/gsc-report.mjs.");
  process.exit(0);
}

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function accessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${b64url(signer.sign(key.private_key))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token exchange failed (${res.status}): ${JSON.stringify(body)}`);
  return body.access_token;
}

async function query(token, body) {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const out = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${out.error?.message || JSON.stringify(out)}`);
  return out.rows || [];
}

function table(headers, data, limit = 20) {
  if (!data.length) return "_no rows_\n";
  let out = "| " + headers.join(" | ") + " |\n";
  out += "|" + headers.map(() => "---").join("|") + "|\n";
  for (const r of data.slice(0, limit)) out += "| " + r.join(" | ") + " |\n";
  if (data.length > limit) out += `\n_… ${data.length - limit} more rows_\n`;
  return out;
}

/* GSC data lags 2–3 days; asking up to "yesterday" returns partial rows that
   later change, which would make the committed history unstable. End 3 days
   back so every committed number is final. */
const iso = (d) => d.toISOString().slice(0, 10);
const end = new Date(Date.now() - 3 * 86400000);
const start = new Date(end.getTime() - 27 * 86400000);
const range = { startDate: iso(start), endDate: iso(end) };

let token;
try {
  token = await accessToken(JSON.parse(KEY_JSON));
} catch (e) {
  console.log("## Search Console\n");
  console.log(`**Authentication failed.** No search data this run.\n`);
  console.log("```\n" + e.message + "\n```\n");
  console.log("Common causes: the service account was not added under Settings → " +
    "Users and permissions in Search Console; the Search Console API is not " +
    "enabled on the project; or the key was rotated.");
  process.exit(0);
}

try {
  const [byDate, byQuery, byPage, byCountry] = await Promise.all([
    query(token, { ...range, dimensions: ["date"], rowLimit: 30 }),
    query(token, { ...range, dimensions: ["query"], rowLimit: 50 }),
    query(token, { ...range, dimensions: ["page"], rowLimit: 50 }),
    query(token, { ...range, dimensions: ["country"], rowLimit: 20 }),
  ]);

  const tot = byDate.reduce(
    (a, r) => ({ impressions: a.impressions + r.impressions, clicks: a.clicks + r.clicks }),
    { impressions: 0, clicks: 0 }
  );

  console.log(`## Search Console — ${range.startDate} → ${range.endDate} (${SITE})\n`);
  console.log(`**Impressions: ${tot.impressions} · Clicks: ${tot.clicks}**\n`);
  console.log("_Window ends 3 days back on purpose: fresher GSC rows are provisional " +
    "and would make the committed history rewrite itself._\n");

  console.log("### Queries\n");
  console.log(table(["Query", "Impr.", "Clicks", "Avg pos."],
    byQuery.map((r) => [r.keys[0], r.impressions, r.clicks, r.position.toFixed(1)])));
  console.log("### Pages\n");
  console.log(table(["Page", "Impr.", "Clicks", "Avg pos."],
    byPage.map((r) => [r.keys[0].replace("https://thedollscout.com", ""), r.impressions, r.clicks, r.position.toFixed(1)])));
  console.log("### Days\n");
  console.log(table(["Date", "Impr.", "Clicks"],
    byDate.map((r) => [r.keys[0], r.impressions, r.clicks]), 30));

  mkdirSync("content", { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    source: "Google Search Console API (searchAnalytics.query)",
    site: SITE,
    window: range,
    note: "Impressions are the leading indicator: they show which queries the " +
          "site surfaces for before anyone clicks. Position only becomes " +
          "meaningful above ~10 impressions for a query.",
    totals: tot,
    byDate: byDate.map((r) => ({ date: r.keys[0], impressions: r.impressions, clicks: r.clicks, position: r.position })),
    byQuery: byQuery.map((r) => ({ query: r.keys[0], impressions: r.impressions, clicks: r.clicks, position: r.position })),
    byPage: byPage.map((r) => ({ page: r.keys[0], impressions: r.impressions, clicks: r.clicks, position: r.position })),
    byCountry: byCountry.map((r) => ({ country: r.keys[0], impressions: r.impressions, clicks: r.clicks })),
  }, null, 2) + "\n");
  console.log(`History written to \`${OUT}\`.`);
} catch (e) {
  console.log(`\n**Query failed.** ${e.message}`);
  process.exit(0);
}
