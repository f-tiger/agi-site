/* Regenerates sitemap.xml from the HTML actually present in the repo, so new
   pages are always discoverable without anyone remembering to edit XML.
   Runs in the deploy workflow before publishing. */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { canonicalPath } from "./canonical-url.mjs";

const SITE = "https://thedollscout.com";
/* Anything not published to visitors. The dot-directories matter: the installed
   marketing skills ship HTML assets of their own, and without this the crawler
   found one and submitted it to Google at priority 1.0. */
const SKIP_DIRS = new Set([
  ".git", ".github", ".claude", ".agents",
  "node_modules", "dist", "scripts", "content", "img", "css", "js",
]);

// Higher = more important. Matched longest-prefix-first. The home page is an
// exact match, not a prefix — as a prefix "/" matches every URL on the site,
// which silently gave every unlisted page priority 1.0.
const PRIORITY = [
  ["/quiz.html", "0.9"],
  ["/scam-check.html", "0.9"],
  ["/cost-calculator.html", "0.9"],
  ["/payment-protection.html", "0.9"],
  ["/after-you-order.html", "0.9"],
  ["/checklist.html", "0.8"],
  ["/faq.html", "0.8"],
  ["/for-creators.html", "0.8"],
  ["/picks.html", "0.8"],
  ["/vendors/", "0.8"],
  ["/data/", "0.9"],
  ["/weight/", "0.9"],
  ["/brands/", "0.8"],
  ["/guides/disposal.html", "0.8"],
  ["/guides/height-weight.html", "0.8"],
  ["/guides/torso-vs-full-size.html", "0.8"],
  ["/guides/", "0.8"],
  ["/importing/", "0.7"],
  ["/trust.html", "0.6"],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".html")) out.push(full);
  }
  return out;
}

/* The keys above are written as file paths for readability, but the URLs they
   are matched against are canonical now (/quiz, not /quiz.html). Normalising
   here rather than rewriting the table keeps one place to edit and stops the
   two drifting — silently, since a missed match just yields the default. */
const PRIORITY_CANON = PRIORITY.map(([p, v]) => [canonicalPath(p), v]);

function priorityFor(url) {
  if (url === "/") return "1.0";
  const hit = PRIORITY_CANON.filter(([p]) => url === p || url.startsWith(p.endsWith("/") ? p : p + "/")).sort((a, b) => b[0].length - a[0].length)[0];
  return hit ? hit[1] : "0.6";
}

/* lastmod, from the file's actual last commit rather than the build clock.

   Every URL used to carry the build date, so all 40 claimed to have changed on
   every deploy — including pages untouched since 26 July. Once a sitemap has
   been submitted, lastmod is the only signal it carries beyond the URL list,
   and a sitemap where everything is always "today" teaches Google to ignore
   the field entirely. An honest date on 40 URLs is worth more than a fresh
   one on all of them. */
const today = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);

const shallow = (() => {
  try { return execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8" }).trim() === "true"; }
  catch { return true; }
})();

const gitDate = (file) => {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { encoding: "utf8" }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch { return null; }
};

/* A shallow clone gives every file the same single commit, which would put us
   straight back to one uniform date while looking like it worked. Say so. */
if (shallow) {
  console.log("::warning::build-sitemap: shallow clone — per-file git dates are unavailable, " +
              "falling back to file mtime. Set fetch-depth: 0 on actions/checkout for real lastmod values.");
}

/* Monorepo migration (2026-08-19): this tree was imported into f-tiger/agi-site
   as a fresh snapshot, so for any file untouched since then `git log -1` returns
   the import commit and every URL would collapse onto one uniform date — the
   exact bug this block exists to prevent. content/lastmod-baseline.json carries
   each file's real last-modified date harvested from the old repo's history.
   A file edited after the import has >1 commit touching it, and its real git
   date wins again; the baseline only ever answers for never-touched files. */
const BASELINE = (() => {
  try { return JSON.parse(readFileSync("content/lastmod-baseline.json", "utf8")).files || null; }
  catch { return null; }
})();

const commitCount = (file) => {
  try {
    const out = execFileSync("git", ["rev-list", "--count", "HEAD", "--", file], { encoding: "utf8" }).trim();
    return /^\d+$/.test(out) ? Number(out) : null;
  } catch { return null; }
};

const lastmodFor = (file) => {
  if (!shallow && BASELINE && BASELINE[file] && commitCount(file) === 1) return BASELINE[file];
  const g = shallow ? null : gitDate(file);
  if (g) return g;
  try { return statSync(file).mtime.toISOString().slice(0, 10); } catch { return today; }
};

const urls = [];
for (const file of walk(".")) {
  const rel = "/" + file.replace(/^\.\//, "");
  if (rel.startsWith("/legal/") || rel === "/404.html") continue;      // noindex pages
  const html = readFileSync(file, "utf8");
  if (/<meta\s+name="robots"[^>]*noindex/i.test(html)) continue;
  /* Cloudflare Pages 308s the .html form to the extensionless path, so
     publishing the .html form here would fill this file with redirects. */
  const url = canonicalPath(rel);
  urls.push({ loc: SITE + url, priority: priorityFor(url), lastmod: lastmodFor(file) });
}
urls.sort((a, b) => Number(b.priority) - Number(a.priority) || a.loc.localeCompare(b.loc));

writeFileSync(
  "sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`)
      .join("\n") +
    "\n</urlset>\n"
);
writeFileSync("scripts/urls.txt", urls.map((u) => u.loc).join("\n") + "\n");
console.log(`sitemap.xml: ${urls.length} URLs`);
