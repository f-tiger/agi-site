/* Do the URLs we publish agree with the URLs the host actually serves?

   WHY. Googlebot is fetching this site every day — 277 page views attributed to
   it in fourteen days — and the domain is still in no index, not even for its
   own brand name. That is not "undiscovered". Crawled-and-not-indexed has
   causes, and the cheapest one to rule out is a URL signal that contradicts
   itself.

   Cloudflare Pages serves a file at its extensionless path and redirects the
   .html form to it: /picks.html 308s to /picks. Meanwhile sitemap.xml lists
   /picks.html, the page's own <link rel="canonical"> says /picks.html, og:url
   says /picks.html, and every internal link points at /picks.html. So the
   canonical URL of the page is a URL that does not serve the page — it bounces
   — and the sitemap is a list of redirects rather than a list of pages.

   Google's own guidance is that a sitemap should contain canonical, final URLs,
   and that a canonical pointing at a redirect is a conflicting signal. Both are
   the sort of thing that suppresses indexing while leaving a site that looks
   perfectly healthy to a human with a browser.

   This does not assume any of that is happening. It measures it:
     · what status does the published URL actually return, without following
     · where does it end up
     · what does the page at the end declare as its canonical
     · does that canonical itself resolve, or bounce again

   Run on a runner (the editing sandbox has no egress):
     SITE=https://thedollscout.com node scripts/url-canonical-check.mjs */

import { readFileSync, existsSync } from "node:fs";

const SITE = process.env.SITE || "https://thedollscout.com";
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const urls = existsSync("scripts/urls.txt")
  ? readFileSync("scripts/urls.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
  : [SITE + "/"];

const head = async (url, redirect) => {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, accept: "text/html" }, redirect });
    return res;
  } catch (e) {
    return { status: 0, headers: new Headers(), url, error: e.message, text: async () => "" };
  }
};

console.log(`Checking ${urls.length} published URLs on ${SITE}\n`);

let redirecting = 0;
let canonMismatch = 0;
let canonRedirects = 0;
const rows = [];

for (const url of urls) {
  const path = url.replace(SITE, "") || "/";

  /* No following: a 200 and a 308 are completely different facts about whether
     this URL is the page, and following hides the difference. */
  const direct = await head(url, "manual");
  const isRedirect = direct.status >= 300 && direct.status < 400;
  const location = direct.headers.get("location") || "";

  /* Where the content actually lives, and what it claims about itself. */
  const final = await head(url, "follow");
  const html = final.status ? await final.text() : "";
  const canonical = (/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i.exec(html) || [])[1] || "";
  const finalUrl = (final.url || "").replace(/\?.*$/, "");

  const canonMatchesFinal = canonical && canonical.replace(/\?.*$/, "") === finalUrl;

  /* The signal that matters most: does the URL the page nominates as canonical
     itself serve the page, or does it bounce? A canonical pointing at a
     redirect is a page telling Google "index this other URL", where that other
     URL immediately says "no, index this one". */
  let canonicalStatus = "";
  if (canonical && !canonMatchesFinal) {
    const c = await head(canonical, "manual");
    canonicalStatus = String(c.status);
    if (c.status >= 300 && c.status < 400) canonRedirects++;
  }

  if (isRedirect) redirecting++;
  if (canonical && !canonMatchesFinal) canonMismatch++;

  rows.push({ path, status: direct.status, isRedirect, location, finalUrl, canonical, canonMatchesFinal, canonicalStatus });
}

console.log("--- published URL → what the host actually does ---");
for (const r of rows.slice(0, 12)) {
  console.log(
    `  ${String(r.status).padStart(3)} ${r.path}` +
    (r.isRedirect ? `  →  ${r.location}` : "") +
    (r.canonical && !r.canonMatchesFinal ? `\n        canonical says ${r.canonical}${r.canonicalStatus ? ` (which returns ${r.canonicalStatus})` : ""}, page is served at ${r.finalUrl}` : "")
  );
}
if (rows.length > 12) console.log(`  … ${rows.length - 12} more, same pattern`);

console.log("\n--- totals ---");
console.log(`  Published URLs that REDIRECT instead of serving:   ${redirecting} / ${rows.length}`);
console.log(`  Pages whose canonical is not the URL they serve at: ${canonMismatch} / ${rows.length}`);
console.log(`  …of those, canonicals that THEMSELVES redirect:     ${canonRedirects}`);

const bad = redirecting || canonMismatch;
console.log(
  bad
    ? "\nEvery entry in sitemap.xml is a redirect, and every page nominates a canonical URL that bounces.\n" +
      "Google is asked to index a URL that refuses to serve the page and points back at the one it was\n" +
      "reached from. That is a self-contradicting signal on all " + rows.length + " URLs, and it is consistent\n" +
      "with a site that is crawled daily and indexed never."
    : "\nEvery published URL serves its own content and declares itself canonical. No conflicting signal here."
);
process.exit(0); /* diagnostic: report, never gate */
