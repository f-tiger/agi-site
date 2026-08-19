/* Generates feed.xml (Atom) from the published pages' own dates.

   Why a feed on a static guide site: feed readers, aggregators and several AI
   crawlers consume Atom directly, and it is the one syndication channel that
   requires nobody's permission and no account anywhere. For a site whose
   distribution problem is "no one references us yet", a machine-readable "what
   changed" endpoint is cheap surface area.

   Entry dates come from each page's Article JSON-LD (datePublished /
   dateModified). Pages without a dated Article node are skipped rather than
   stamped with today — a feed that re-dates everything on each deploy is the
   same freshness lie the sitemap generator refuses to tell. */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalPath } from "./canonical-url.mjs";

const SITE = "https://thedollscout.com";
const SKIP_DIRS = new Set([
  ".git", ".github", ".claude", ".agents",
  "node_modules", "dist", "scripts", "content", "img", "css", "js",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".html")) out.push(full);
  }
  return out;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const entries = [];
for (const file of walk(".")) {
  const rel = "/" + file.replace(/^\.\//, "");
  if (rel.startsWith("/legal/") || rel === "/404.html") continue;
  const html = readFileSync(file, "utf8");
  if (/<meta\s+name="robots"[^>]*noindex/i.test(html)) continue;

  /* Find any JSON-LD node carrying dates. Regex-per-block then JSON.parse, so
     a malformed block on one page cannot take the whole feed down. */
  let published, modified;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const doc = JSON.parse(m[1]);
      for (const node of doc["@graph"] || [doc]) {
        if (node.datePublished) { published = node.datePublished; modified = node.dateModified || published; }
      }
    } catch { /* one bad block should not kill the feed */ }
  }
  if (!published) continue;

  /* Cloudflare Pages 308s the .html form to the extensionless path, so
     publishing the .html form here would fill this file with redirects. */
  const url = canonicalPath(rel);
  entries.push({
    url: SITE + url,
    title: ((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || url).trim(),
    desc: (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "",
    published,
    modified,
  });
}

entries.sort((a, b) => b.modified.localeCompare(a.modified));
const updated = entries.length ? entries[0].modified : "2026-07-26";

const xml =
  `<?xml version="1.0" encoding="utf-8"?>\n` +
  `<feed xmlns="http://www.w3.org/2005/Atom">\n` +
  `  <title>DollScout — buyer-protection guides and data</title>\n` +
  `  <subtitle>Independent adult-doll buying guide: scam checks, import rules, recorded price and weight data. 18+.</subtitle>\n` +
  `  <link href="${SITE}/feed.xml" rel="self"/>\n` +
  `  <link href="${SITE}/"/>\n` +
  `  <id>${SITE}/</id>\n` +
  `  <updated>${updated}T00:00:00Z</updated>\n` +
  entries
    .map(
      (e) =>
        `  <entry>\n` +
        `    <title>${esc(e.title)}</title>\n` +
        `    <link href="${e.url}"/>\n` +
        `    <id>${e.url}</id>\n` +
        `    <published>${e.published}T00:00:00Z</published>\n` +
        `    <updated>${e.modified}T00:00:00Z</updated>\n` +
        `    <summary>${esc(e.desc)}</summary>\n` +
        `  </entry>`
    )
    .join("\n") +
  `\n</feed>\n`;

writeFileSync("feed.xml", xml);
console.log(`feed.xml: ${entries.length} dated entries (undated pages skipped by design)`);
