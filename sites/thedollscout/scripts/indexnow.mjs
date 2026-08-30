/* Pushes every published URL to the IndexNow endpoint, which Bing, Yandex,
   Seznam and Naver consume for near-instant (re)indexing. Google does not use
   IndexNow — Google discovery still comes from the sitemap in Search Console.
   The key file must be reachable at https://<host>/<key>.txt (see /indexnow-key).

   2026-08-30 REPAIR: this script referenced an undefined `urls` and threw a
   ReferenceError on EVERY deploy since the pivot. The workflow step carries
   continue-on-error, so the crash was invisible in a green run and NOT ONE URL
   of the new site was ever pushed. Two lessons encoded below:
     1. read the URL list explicitly, and fail loudly if it is empty;
     2. a step allowed to fail must still SHOUT — the ::error:: annotations
        below surface in the run summary even when the step is non-blocking. */
import { readFileSync } from "node:fs";

const HOST = "thedollscout.com";
const KEY = readFileSync("scripts/indexnow-key.txt", "utf8").trim();

/* urls.txt is the hand-maintained list of published pages. The machine
   surfaces below are deliberately NOT in it (the sitemap lists HTML pages
   only) — yet they are exactly what we want engines to fetch actively rather
   than whenever a crawler happens by. IndexNow accepts any URL on the host. */
const EXTRA = [
  "/llms.txt",
  "/llms-full.txt",
  "/.well-known/mcp.json",
  "/data/rarity-odds.json",
  "/data/labubu-fake-signals.json",
  "/data/labubu-glossary.json",
];

const pages = readFileSync("scripts/urls.txt", "utf8")
  .split("\n")
  .map((s) => s.trim())
  .filter((s) => s.startsWith("https://"));

const urls = [...new Set([...pages, ...EXTRA.map((p) => `https://${HOST}${p}`)])];

if (!/^[a-f0-9]{32,}$/i.test(KEY)) {
  console.error("::error::indexnow: key file looks wrong, nothing submitted");
  process.exit(0);
}
if (!urls.length) {
  console.error("::error::indexnow: URL list is empty — scripts/urls.txt unreadable or malformed");
  process.exit(0);
}

const res = await fetch("https://api.indexnow.org/IndexNow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls,
  }),
});
// 200 = accepted, 202 = accepted pending key validation. Both are fine.
console.log(`indexnow: submitted ${urls.length} URLs (${EXTRA.length} of them non-HTML machine surfaces) -> HTTP ${res.status}`);
if (res.status >= 400) {
  console.error(`::error::indexnow: endpoint returned ${res.status}`);
  console.error(await res.text());
}
