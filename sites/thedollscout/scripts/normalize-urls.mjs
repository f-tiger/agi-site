/* Rewrites every URL the site publishes about itself into the form the host
   actually serves — see scripts/canonical-url.mjs for the measurement that
   prompted this.

   Covers, in every HTML file:
     · <link rel="canonical">
     · og:url and any other absolute self-reference in a meta content=
     · JSON-LD "@id" and "url" values
     · internal href= links, all 688 of them
     · data-share-url, which is what a visitor pastes elsewhere

   Idempotent: canonicalizeHref only touches paths ending in .html, so a second
   run finds nothing left to change. The files on disk keep their .html names —
   that is how Pages resolves them — only what we say about them changes.

   Run: node scripts/normalize-urls.mjs */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { canonicalizeHref, canonicalPath, SITE } from "./canonical-url.mjs";

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".github", ".claude", ".agents", "scripts", "content", "functions"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const full = dir === "." ? entry : `${dir}/${entry}`;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".html")) out.push(full);
  }
  return out;
}

const files = walk(".");
let changedFiles = 0;
let rewrites = 0;
let problems = 0;

for (const file of files) {
  const before = readFileSync(file, "utf8");
  let html = before;

  const sub = (re, group = 1) => {
    html = html.replace(re, (whole, ...groups) => {
      const href = groups[group - 1];
      const next = canonicalizeHref(href);
      if (next === href) return whole;
      rewrites++;
      return whole.replace(href, next);
    });
  };

  sub(/href="([^"]+)"/g);
  /* Bare URLs in visible TEXT, not just in attributes. /for-creators hands out
     copy-paste snippets — plain text in <textarea>, and escaped anchors people
     paste into their own pages — and those were still the .html form after the
     hrefs around them had been normalised, so a snippet showed one URL and
     linked another. These are the URLs the site asks OTHER people to publish,
     which makes them the most expensive ones to leave pointing at a redirect. */
  html = html.replace(/thedollscout\.com(\/[A-Za-z0-9/_-]+)\.html\b/g, (whole, path) => {
    const next = canonicalizeHref(path + ".html");
    if (next === path + ".html") return whole;
    rewrites++;
    return `thedollscout.com${next}`;
  });
  sub(/content="(https:\/\/thedollscout\.com[^"]*)"/g);
  sub(/"@id":\s*"([^"]+)"/g);
  sub(/"url":\s*"([^"]+)"/g);
  sub(/"item":\s*"([^"]+)"/g);
  sub(/data-share-url="([^"]+)"/g);

  if (html !== before) {
    writeFileSync(file, html);
    changedFiles++;
  }

  /* A page that ends up declaring no canonical, or one pointing at a different
     page, is worse than the redirect this replaces. Check rather than trust. */
  const canon = (/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i.exec(html) || [])[1];
  const expected = SITE + canonicalPath(file);
  if (file !== "404.html" && !/name="robots"[^>]*noindex/i.test(html)) {
    if (!canon) {
      console.log(`FAIL  ${file}: no <link rel="canonical"> at all.`);
      problems++;
    } else if (canon !== expected) {
      console.log(`FAIL  ${file}: canonical is ${canon}, but the host serves it at ${expected}.`);
      problems++;
    }
  }
}

/* Nothing internal may still point at a .html URL. Every one of those is a
   redirect hop for a crawler and a diluted signal for the page it lands on.
   /404.html is the one exception: Pages serves it as the 404 body, so it is
   never requested as a page and rewriting it would invent a URL. */
for (const file of files) {
  const html = readFileSync(file, "utf8");
  const stragglers = [...html.matchAll(/(?:href|data-share-url)="((?:\/|https:\/\/thedollscout\.com\/)[^"]*\.html(?:[?#][^"]*)?)"/g)]
    .map((m) => m[1])
    .filter((h) => !h.endsWith("/404.html"));
  if (stragglers.length) {
    console.log(`FAIL  ${file}: still links to ${[...new Set(stragglers)].join(", ")}`);
    problems++;
  }
}

console.log(`${rewrites} URL(s) rewritten across ${changedFiles} of ${files.length} file(s).`);
console.log(
  problems
    ? `\n${problems} page(s) do not declare the URL they are served at. Fix before deploying.`
    : `Every indexable page now declares the URL the host actually serves it at.`
);
process.exit(problems ? 1 : 0);
