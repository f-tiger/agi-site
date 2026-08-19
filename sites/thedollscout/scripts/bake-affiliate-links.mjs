/* Bakes the affiliate links into the static HTML.

   Until now every <a data-yd> / <a data-amzn> anchor shipped as href="#" and
   relied on js/main.js to inject the real URL at DOMContentLoaded. Two groups
   never saw those links work: visitors who don't execute JS, and every crawler
   — including the AI answer engines this site is betting on, which therefore
   saw neither the links nor the rel="sponsored" disclosure on them. This
   script writes the final URL, rel and target into the HTML itself (the
   getecoback服务端直出 model); js/main.js keeps its wiring as a fallback but
   no longer rewrites an anchor that already carries a valid affiliate href.

   The URL construction below deliberately mirrors js/main.js line for line
   (WHATWG URL + searchParams.set, so spaces serialise as "+"), and the config
   values are read from js/config.js at run time — one source of truth, the
   baked links and the JS-built links can never disagree.

   Safety, inherited from main.js and kept here:
     · hosts are compared EXACTLY against the vendor host. A review-site URL
       that merely mentions the vendor in its path
       (trustpilot.com/review/yourdoll.com) is a plain href, has no data-yd,
       and is never touched — this script only ever rewrites anchors that
       carry data-yd / data-amzn, i.e. anchors that are ours by construction.
     · <script> blocks are skipped entirely, so the quiz's JS template string
       ('<a data-yd="' + r.cta + '" …') is left alone.

   Idempotent: a second run recomputes the same URLs and finds every attribute
   already in place — byte-stable.

   Run: node scripts/bake-affiliate-links.mjs */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";

/* ---------- config, read from the same file the browser reads ---------- */
const configSrc = readFileSync("js/config.js", "utf8");
function cfg(key) {
  const m = configSrc.match(new RegExp(`${key}:\\s*"([^"]*)"`));
  if (!m) {
    console.error(`FAIL  js/config.js: could not read "${key}".`);
    process.exit(1);
  }
  return m[1];
}
const YD_BASE = cfg("yourdollBase");
const YD_PARAM = cfg("yourdollRefParam");
const YD_REF = cfg("yourdollRef");
const AMZN_TAG = cfg("amazonTag");

const vendorHost = new URL(YD_BASE).hostname.replace(/^www\./, "");
function isVendorHost(h) {
  h = h.replace(/^www\./, "");
  return h === vendorHost || h.endsWith("." + vendorHost);
}

/* ---------- HTML plumbing ---------- */
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

const decode = (s) => s
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const encode = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

function setAttr(tag, name, value) {
  const re = new RegExp(`(\\s${name}=")[^"]*(")`);
  if (re.test(tag)) return tag.replace(re, `$1${value}$2`);
  return tag.replace(/\s*\/?>$/, (end) => ` ${name}="${value}"${end.trim()}`);
}

/* URL construction — a line-for-line port of wireAffiliateLinks() in main.js. */
function ydHref(raw) {
  let url;
  try {
    url = raw && raw.indexOf("http") === 0 ? new URL(raw) : new URL(raw || "", YD_BASE);
  } catch (e) { return null; }
  if (!isVendorHost(url.hostname)) url = new URL(YD_BASE);
  url.searchParams.set(YD_PARAM, YD_REF);
  return url.toString();
}
function amznHref(raw) {
  let url;
  try { url = new URL(raw); } catch (e) { return null; }
  url.searchParams.set("tag", AMZN_TAG);
  return url.toString();
}

function bakeTag(tag) {
  const yd = /\sdata-yd="([^"]*)"/.exec(tag);
  const amzn = /\sdata-amzn="([^"]*)"/.exec(tag);
  if (!yd && !amzn) return tag;
  const href = yd ? ydHref(decode(yd[1])) : amznHref(decode(amzn[1]));
  if (!href) return tag; // unparseable — leave it for the JS path, same as main.js
  let out = setAttr(tag, "href", encode(href));
  out = setAttr(out, "rel", "sponsored nofollow noopener");
  out = setAttr(out, "target", "_blank");
  return out;
}

function bakeFile(html) {
  /* Never rewrite inside <script> — the quiz builds anchors from JS strings. */
  return html
    .split(/(<script\b[\s\S]*?<\/script>)/i)
    .map((seg, i) => (i % 2 ? seg : seg.replace(/<a\b[^>]*>/g, bakeTag)))
    .join("");
}

/* ---------- run ---------- */
let changedFiles = 0;
let baked = 0;
let problems = 0;
const files = walk(".");

for (const file of files) {
  const before = readFileSync(file, "utf8");
  const html = bakeFile(before);
  if (html !== before) { writeFileSync(file, html); changedFiles++; }

  /* Verify rather than trust: outside scripts, every affiliate anchor must now
     carry a real href + the disclosure attributes. */
  html.split(/(<script\b[\s\S]*?<\/script>)/i).forEach((seg, i) => {
    if (i % 2) return;
    for (const m of seg.matchAll(/<a\b[^>]*\sdata-(?:yd|amzn)="[^"]*"[^>]*>/g)) {
      const tag = m[0];
      baked++;
      if (/\shref="#"/.test(tag) || !/\shref="https?:/.test(tag)) {
        console.log(`FAIL  ${file}: still no real href on ${tag}`);
        problems++;
      }
      if (!/\srel="sponsored nofollow noopener"/.test(tag)) {
        console.log(`FAIL  ${file}: missing sponsored rel on ${tag}`);
        problems++;
      }
    }
  });
}

console.log(`${baked} affiliate anchor(s) verified baked across ${files.length} file(s); ${changedFiles} file(s) rewritten this run.`);
process.exit(problems ? 1 : 0);
