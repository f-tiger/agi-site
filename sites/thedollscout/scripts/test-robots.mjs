/* One invariant: a page may be Disallowed in robots.txt, or carry a noindex
   meta tag, but never both.

   They look like belt and braces. They are not — they cancel out. A crawler
   forbidden from FETCHING a page never receives its HTML, so it never sees the
   noindex. It keeps the URL it found from a link elsewhere on the site and
   indexes it URL-only, with no title and no description. The page you most
   wanted out of the index becomes the one page that is in it.

   That is not hypothetical here. robots.txt carried "Disallow: /legal/" in all
   nineteen user-agent groups while the three files under /legal/ each carried
   <meta name="robots" content="noindex, follow">, and every one of the site's
   43 pages links to them from the footer. Bing Webmaster Tools showed, for this
   domain: Indexed 3 — against exactly three files in /legal/ — with "legal" as
   the only subfolder in its tree. The only URLs Bing had indexed were the three
   we had told it not to, while the 40 real pages were absent.

   The correct combination is: crawlable + noindex + absent from sitemap.xml.
   Let the crawler in so it can read the instruction.

   Run: node scripts/test-robots.mjs */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { canonicalPath } from "./canonical-url.mjs";

let failed = 0;
const t = (name, ok, detail) => {
  if (ok) console.log(`ok    ${name}`);
  else { failed++; console.log(`FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

const robots = readFileSync("robots.txt", "utf8");

/* Directives only. A "Disallow" inside a comment is documentation, and the
   comment in robots.txt explaining this very bug contains the word. */
const directives = robots
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

const disallowed = directives
  .filter((l) => /^Disallow:/i.test(l))
  .map((l) => l.replace(/^Disallow:\s*/i, "").trim())
  .filter(Boolean); /* "Disallow:" with an empty value means allow everything */

/* Every HTML page that declares noindex. */
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (["node_modules", "dist", "scripts", "content", "functions"].includes(e) || e.startsWith(".")) continue;
    const full = dir === "." ? e : `${dir}/${e}`;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".html")) out.push(full);
  }
  return out;
}

const noindexPages = walk(".").filter((f) =>
  /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(readFileSync(f, "utf8"))
);

/* THE INVARIANT. */
const conflicted = noindexPages.filter((f) => {
  const url = canonicalPath(f);
  return disallowed.some((d) => url === d || url.startsWith(d));
});

t("no page is both Disallowed and noindex",
  conflicted.length === 0,
  conflicted.length
    ? `${conflicted.join(", ")} cannot be crawled, so the noindex on them is unreachable — ` +
      `they will be indexed URL-only. Remove the Disallow and keep the noindex.`
    : "");

/* CANARY: prove the check can fail, or a parsing slip would read as a clean
   site — the same shape of false confidence this file exists to prevent. */
{
  const fakeDisallow = ["/legal/"];
  const wouldCatch = ["legal/privacy.html"].some((f) => {
    const url = canonicalPath(f);
    return fakeDisallow.some((d) => url === d || url.startsWith(d));
  });
  t("canary: the conflict detector still detects a conflict", wouldCatch);
}

t("robots.txt still names a sitemap", /^Sitemap:\s*https?:\/\/\S+/im.test(robots));
t("robots.txt still allows the site at all", directives.some((l) => /^Allow:\s*\/$/i.test(l)));

/* noindex pages must also be out of the sitemap — asking a crawler to index a
   URL and then telling it not to is a different contradiction, and it wastes
   the crawl budget of a domain that has very little. */
if (existsSync("sitemap.xml")) {
  const sitemap = readFileSync("sitemap.xml", "utf8");
  const inSitemap = noindexPages.filter((f) => sitemap.includes(canonicalPath(f) + "<"));
  t("no noindex page is listed in sitemap.xml", inSitemap.length === 0, inSitemap.join(", "));
}

console.log(failed ? `\n${failed} failed.` : `\nAll passed. ${noindexPages.length} noindex page(s), all crawlable.`);
process.exit(failed ? 1 : 0);
