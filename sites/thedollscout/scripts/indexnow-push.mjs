/* IndexNow push — the non-Google discovery lane, made active.

   Why this exists (2026-08-25, owner: "有没有其他办法，你突破思考执行"):
   the site's three structural blocks (SafeSearch on product queries, AI
   assistants refusing product recs, domain age) all bite hardest on GOOGLE.
   The engines behind IndexNow — Bing, Yandex, Naver, Seznam — are exactly
   the lane where those blocks are weakest: Yandex is already this site's
   most frequent crawler (34 hits/28d, D1 'bot' line) and applies the laxest
   adult filtering; Naver serves the South Korea importing page's audience.
   The key file (0252657e77641154c50b39045dc829f8.txt) has been served at the
   site root since launch — there was simply no push mechanism. This is it.

   Protocol: one POST to api.indexnow.org fans out to all participating
   engines. Politeness: MODE=delta (default) submits only URLs whose sitemap
   <lastmod> is within the last N days (default 8 — a weekly schedule plus
   slack); MODE=all submits the full sitemap exactly once for the initial
   registration, meant for a manual workflow_dispatch.

   No secrets involved: the IndexNow key is public by design (it is served
   as a plain file on the site root).                                    */

import { readFileSync } from "node:fs";

const KEY = readFileSync("scripts/indexnow-key.txt", "utf8").trim();
const HOST = "thedollscout.com";
const MODE = (process.env.MODE || "delta").toLowerCase();
const WINDOW_DAYS = parseInt(process.env.WINDOW_DAYS || "8", 10);

const xml = readFileSync("sitemap.xml", "utf8");
const entries = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)]
  .map((m) => ({ loc: m[1].trim(), lastmod: (m[2] || "").trim() }));

let urls;
if (MODE === "all") {
  urls = entries.map((e) => e.loc);
} else {
  const cutoff = new Date(Date.now() - WINDOW_DAYS * 864e5);
  urls = entries.filter((e) => e.lastmod && new Date(e.lastmod) >= cutoff).map((e) => e.loc);
}

if (!urls.length) {
  /* 2026-08-30: this used to print "that is the normal quiet outcome" and exit,
     which made a PERMANENT no-op indistinguishable from a quiet week — the
     sitemap's lastmod values are static, so delta silently returns zero forever
     once the window passes them. Delta is no longer the scheduled default
     (the weekly job runs MODE=all); if delta is chosen explicitly and finds
     nothing, say plainly that it may be the static-lastmod trap. */
  console.log(`indexnow: delta found no URL with a lastmod inside ${WINDOW_DAYS} days.`);
  console.log("::warning::indexnow: delta submitted 0 URLs. If sitemap lastmod values are static, delta is a permanent no-op — use MODE=all.");
  process.exit(0);
}

const body = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: urls.slice(0, 10000),
};

const r = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(30000),
});

/* 200 = accepted; 202 = accepted, key validation pending. Anything else is
   a real failure and must fail the run loudly — a silently dead submission
   channel is one you keep believing in. */
console.log(`indexnow: submitted ${urls.length} URL(s) (${MODE}) → HTTP ${r.status}`);
if (r.status !== 200 && r.status !== 202) {
  console.error(await r.text().catch(() => ""));
  process.exit(1);
}
