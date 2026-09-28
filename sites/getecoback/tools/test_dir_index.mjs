// Directory index pages are served at their canonical slash URL (2026-09-28).
//
// Until 09-28 the worker special-cased only / and /en/. Every other slash path was
// redirected to "<dir>.html", so /it/ (the Italian hub's canonical and sitemap URL)
// answered 301 -> /it.html -> 404, and /agents/trade/ only worked because someone
// had added a copy of the page as agents/trade.html.
//
// Checks, against the real worker and the real files in site/:
//   1. DIR_INDEXES == the index.html files under site/ (a new directory index that
//      is not listed would get the old redirect again);
//   2. each index page's canonical is its slash URL;
//   3. the slash URL answers 200 with that page, the bare form 301s to the slash
//      form, and an ordinary slash path still 301s to its .html page.
//
// Run: node tools/test_dir_index.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SITE = join(ROOT, "site");
const src = readFileSync(join(ROOT, "src", "worker.js"), "utf8");

let bad = 0;
const fail = (m) => { console.error("FAIL:", m); bad++; };

const a = src.indexOf("// --- DIR INDEXES");
const b = src.indexOf("// --- /DIR INDEXES");
if (a < 0 || b < 0) {
  console.error("FAIL: DIR INDEXES block not found in src/worker.js");
  process.exit(1);
}
const { DIR_INDEXES } = await import("data:text/javascript;base64," +
  Buffer.from(src.slice(a, b) + "\nexport { DIR_INDEXES };\n").toString("base64"));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === "index.html") out.push(p);
  }
  return out;
}
const onDisk = walk(SITE).map((p) => {
  const rel = relative(SITE, p).split(sep).join("/");
  return "/" + rel.slice(0, -"index.html".length);
}).sort();

const listed = [...DIR_INDEXES].sort();
if (listed.join(",") !== onDisk.join(",")) {
  fail(`DIR_INDEXES != index.html files in site/\n  worker: ${listed.join(", ")}\n  files:  ${onDisk.join(", ")}`);
}

for (const dir of onDisk) {
  const html = readFileSync(join(SITE, dir.slice(1), "index.html"), "utf8");
  const m = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!m) { fail(`${dir}index.html has no canonical`); continue; }
  if (m[1] !== "https://getecoback.com" + dir) fail(`${dir}index.html canonical is ${m[1]}`);
}

// Route through the real worker with an ASSETS binding backed by site/.
const { default: worker } = await import(new URL("../src/worker.js", import.meta.url));
const env = {
  ASSETS: {
    async fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      const file = join(SITE, path);
      if (path.endsWith("/") || !existsSync(file) || statSync(file).isDirectory()) {
        return new Response("not found", { status: 404 });
      }
      return new Response(readFileSync(file), {
        status: 200, headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  },
};
const ctx = { waitUntil() {}, passThroughOnException() {} };
const get = (path) => worker.fetch(new Request("https://getecoback.com" + path, {
  headers: { "user-agent": "getecoback-ci", accept: "text/html" },
  redirect: "manual",
}), env, ctx);

for (const dir of onDisk) {
  const r = await get(dir);
  if (r.status !== 200) { fail(`${dir} -> ${r.status} ${r.headers.get("location") || ""}`); continue; }
  const body = await r.text();
  if (!body.includes(`<link rel="canonical" href="https://getecoback.com${dir}"`)) {
    fail(`${dir} served a page whose canonical is not ${dir}`);
  }
  if (dir !== "/") {
    const bare = dir.slice(0, -1);
    const rb = await get(bare);
    const loc = rb.headers.get("location") || "";
    if (rb.status !== 301 || loc !== "https://getecoback.com" + dir) {
      fail(`${bare} -> ${rb.status} ${loc} (want 301 to ${dir})`);
    }
  }
}

// The old rule still holds for ordinary pages.
for (const [path, want] of [
  ["/guide/klimaanlage-kippfenster/", "/guide/klimaanlage-kippfenster.html"],
  ["/guide/klimaanlage-kippfenster", "/guide/klimaanlage-kippfenster.html"],
]) {
  const r = await get(path);
  const loc = r.headers.get("location") || "";
  if (r.status !== 301 || loc !== "https://getecoback.com" + want) {
    fail(`${path} -> ${r.status} ${loc} (want 301 to ${want})`);
  }
}

if (bad) {
  console.error(`test_dir_index: ${bad} failure(s)`);
  process.exit(1);
}
console.log(`test_dir_index OK: ${onDisk.length} directory indexes (${onDisk.join(", ")}) served at their canonical URL`);
