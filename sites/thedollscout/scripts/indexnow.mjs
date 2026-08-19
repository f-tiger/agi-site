/* Pushes every published URL to the IndexNow endpoint, which Bing, Yandex,
   Seznam and Naver consume for near-instant (re)indexing. Google does not use
   IndexNow — Google discovery still comes from the sitemap in Search Console.
   The key file must be reachable at https://<host>/<key>.txt (see /indexnow-key). */
import { readFileSync } from "node:fs";

const HOST = "thedollscout.com";
const KEY = readFileSync("scripts/indexnow-key.txt", "utf8").trim();
/* urls.txt comes from the sitemap, which lists HTML pages only — so the MCP
   endpoint, its discovery documents and the published datasets were never
   submitted to anything. They are exactly the surfaces we want found
   ACTIVELY rather than whenever a crawler happens by, and IndexNow accepts
   any URL on the host, not just pages. */
const EXTRA = [
  "/mcp",
  "/server.json",
  "/.well-known/mcp.json",
  "/data/doll-specs.json",
  "/data/payment-recourse.json",
  "/data/first-year-cost.json",
  "/data/scam-signals.json",
  "/data/import-costs.json",
  "/llms.txt",
  "/feed.xml",
].map((p) => `https://${HOST}${p}`);

const urls = [
  ...new Set([...readFileSync("scripts/urls.txt", "utf8").split("\n").filter(Boolean), ...EXTRA]),
];

if (!/^[a-f0-9]{32,}$/i.test(KEY)) {
  console.error("indexnow: key file looks wrong, skipping");
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
console.log(`indexnow: submitted ${urls.length} URLs (${EXTRA.length} of them non-HTML discovery surfaces) -> HTTP ${res.status}`);
if (res.status >= 400) console.error(await res.text());
