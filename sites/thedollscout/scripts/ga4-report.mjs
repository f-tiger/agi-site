/* Pulls the numbers the growth loop needs from the GA4 Data API and prints
   them as markdown. Read-only. No dependencies — the service-account JWT is
   signed with node:crypto.

   ── Setup (owner, once) ───────────────────────────────────────────────────
   1. Google Cloud console → create a project (or reuse one) → enable the
      "Google Analytics Data API".
   2. IAM → Service Accounts → create one → Keys → Add key → JSON. Download it.
   3. GA4 → Admin → Property Access Management → add the service account's
      client_email as a **Viewer**. Without this step the API returns 403 even
      though the credentials are valid.
   4. Provide two values to whatever runs this:
        GA4_PROPERTY_ID          the numeric property ID (not "G-2SEHFY33H8")
        GA4_SERVICE_ACCOUNT_JSON the whole JSON key file, as one string
      For the scheduled loop, put them in the environment it runs in. For a
      GitHub Actions run, repository Secrets.

   Without both, this exits 0 and says so. That is deliberate: a missing
   credential is a configuration fact the loop should report, not an error
   that stops it working.

   Note: this has been written against the documented v1beta API but has not
   been exercised against live credentials. First run should be treated as a
   test — if a request shape is wrong, the API error text says which field. */

import { createSign } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";

const PROPERTY = process.env.GA4_PROPERTY_ID;
const KEY_JSON = process.env.GA4_SERVICE_ACCOUNT_JSON;

if (!PROPERTY || !KEY_JSON) {
  console.log("## GA4\n");
  console.log("**Credentials not configured.** No analytics data available this run.");
  console.log("");
  console.log("Missing: " + [!PROPERTY && "GA4_PROPERTY_ID", !KEY_JSON && "GA4_SERVICE_ACCOUNT_JSON"]
    .filter(Boolean).join(" and ") + ". Setup instructions are in the header of scripts/ga4-report.mjs.");
  process.exit(0);
}

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function accessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
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

async function runReport(token, request) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(request),
    }
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${body.error?.message || JSON.stringify(body)}`);
  return body;
}

const rows = (r) => (r.rows || []).map((row) => [
  ...(row.dimensionValues || []).map((d) => d.value),
  ...(row.metricValues || []).map((m) => m.value),
]);

function table(headers, data, limit = 15) {
  if (!data.length) return "_no data_\n";
  let out = "| " + headers.join(" | ") + " |\n";
  out += "|" + headers.map(() => "---").join("|") + "|\n";
  for (const r of data.slice(0, limit)) out += "| " + r.join(" | ") + " |\n";
  if (data.length > limit) out += `\n_… ${data.length - limit} more rows_\n`;
  return out;
}

const LAST_14 = [{ startDate: "14daysAgo", endDate: "yesterday" }];
const LAST_28 = [{ startDate: "28daysAgo", endDate: "yesterday" }];

/* Authentication can fail for reasons that are configuration, not code: a
   rotated key, revoked property access, a disabled API. This runs unattended
   every two days, so it reports the failure and exits cleanly rather than
   aborting the run — a loop that dies on an expired credential is a loop that
   silently stops working. */
let token;
try {
  token = await accessToken(JSON.parse(KEY_JSON));
} catch (e) {
  console.log("## GA4\n");
  console.log(`**Authentication failed.** No analytics data this run.\n`);
  console.log("```\n" + e.message + "\n```\n");
  console.log("Common causes: the service account was not added as a Viewer in " +
    "GA4 Admin → Property Access Management; the Google Analytics Data API is not " +
    "enabled on the project; or the key has been rotated. See the header of " +
    "scripts/ga4-report.mjs.");
  process.exit(0);
}

console.log("## GA4 — trailing 14 days (property " + PROPERTY + ")\n");

/* Headline totals first: the loop's phase decision hangs on these two numbers. */
const totals = await runReport(token, {
  dateRanges: LAST_14,
  metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }],
});
const t = rows(totals)[0] || ["0", "0", "0"];
console.log(`**Sessions: ${t[0]} · Users: ${t[1]} · Pageviews: ${t[2]}**\n`);

/* Everything the markdown shows also lands in content/ga4.json, because the
   scheduled loop reads files, not job summaries. Populated as sections run. */
const persisted = {
  source: "GA4 Data API v1beta (service account)",
  property: PROPERTY,
  window: "14daysAgo..yesterday",
  totals: { sessions: +t[0], users: +t[1], pageviews: +t[2] },
  sections: {},
};

const sections = [
  {
    title: "Events",
    headers: ["Event", "Count"],
    request: {
      dateRanges: LAST_14,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    },
  },
  {
    title: "Landing pages",
    headers: ["Landing page", "Sessions"],
    request: {
      dateRanges: LAST_14,
      dimensions: [{ name: "landingPagePlusQueryString" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
  },
  {
    title: "Where sessions come from",
    headers: ["Source / medium", "Sessions"],
    request: {
      dateRanges: LAST_14,
      dimensions: [{ name: "sessionSourceMedium" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
  },
  {
    /* Needs the `location` custom dimension registered in GA4. If it is not,
       the API errors and we say so rather than failing the run — an
       unregistered dimension is a setup gap, not a data finding. */
    title: "Affiliate clicks by page position",
    headers: ["Position", "Clicks"],
    request: {
      dateRanges: LAST_28,
      dimensions: [{ name: "customEvent:location" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: { fieldName: "eventName", stringFilter: { value: "affiliate_click" } },
      },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    },
    note: "28 days. Requires the `location` custom dimension to be registered.",
  },
  {
    title: "Daily sessions",
    headers: ["Date", "Sessions"],
    request: {
      dateRanges: LAST_14,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    },
    limit: 14,
  },
];

for (const s of sections) {
  console.log(`### ${s.title}\n`);
  if (s.note) console.log(`_${s.note}_\n`);
  try {
    const data = rows(await runReport(token, s.request));
    console.log(table(s.headers, data, s.limit ?? 15));
    persisted.sections[s.title] = data.map((r) =>
      Object.fromEntries(s.headers.map((h, i) => [h, r[i]]))
    );
  } catch (e) {
    console.log(`_query failed: ${e.message}_\n`);
    persisted.sections[s.title] = { error: e.message };
  }
}

mkdirSync("content", { recursive: true });
writeFileSync("content/ga4.json", JSON.stringify(persisted, null, 2) + "\n");
console.log("History written to `content/ga4.json`.");
