#!/usr/bin/env node
/* Structured-data honesty gate.

   The site's own rule (CLAUDE.md): "FAQ/DefinedTerm LD 文本必须与页面可见文本
   一致(不造影子内容)". On 2026-08-30 an audit found 16 of 48 FAQ Q&A pairs —
   every one on /start and /psychology, EN and DE — existed ONLY inside JSON-LD.
   The rule was real; nothing enforced it. This does.

   Comparison is deliberately forgiving about presentation and strict about
   words: both sides are entity-decoded, NBSP-flattened, curly quotes and
   dashes folded to ASCII, tags removed, and ALL whitespace stripped before the
   substring test. That matters — an earlier naive version flagged pages that
   were actually compliant, because stripping an inline <strong> injects a
   space the JSON-LD does not have. A gate that cries wolf gets disabled, and
   a disabled gate is how the shadow content got in.

   Exits non-zero on mismatch. Runs on the publishable EN + /de/ set. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function canon(t) {
  let s = String(t)
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&ldquo;|&rdquo;|&bdquo;|&laquo;|&raquo;/g, '"')
    .replace(/&lsquo;|&rsquo;|&sbquo;/g, "'")
    .replace(/&mdash;|&ndash;/g, "-")
    .replace(/ /g, " ");
  for (const [a, b] of [["‘", "'"], ["’", "'"], ["“", '"'], ["”", '"'],
                        ["„", '"'], ["‚", "'"], ["–", "-"], ["—", "-"]]) {
    s = s.split(a).join(b);
  }
  return s.replace(/\s+/g, "");
}

function pages(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name === "de") out.push(...pages(p)); continue; }
    if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

let checked = 0, bad = 0;
for (const file of pages(".").sort()) {
  const html = readFileSync(file, "utf8");
  const body = html.replace(/<script[\s\S]*?<\/script>/g, "");
  const visible = canon(body.replace(/<[^>]+>/g, ""));
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const [, raw] of blocks) {
    let data;
    try { data = JSON.parse(raw); }
    catch (e) { console.error(`::error::${file}: JSON-LD does not parse — ${e.message}`); bad++; continue; }
    for (const node of data["@graph"] || []) {
      if (node["@type"] === "FAQPage") {
        for (const q of node.mainEntity || []) {
          checked++;
          const name = q.name, ans = (q.acceptedAnswer || {}).text || "";
          if (!visible.includes(canon(name))) {
            console.error(`::error::${file}: FAQ question is not visible on the page — "${String(name).slice(0, 90)}"`); bad++;
          }
          if (!visible.includes(canon(ans))) {
            console.error(`::error::${file}: FAQ answer is not visible on the page — "${String(ans).slice(0, 90)}..."`); bad++;
          }
        }
      }
      if (node["@type"] === "DefinedTermSet") {
        for (const t of node.hasDefinedTerm || []) {
          checked++;
          if (!visible.includes(canon(t.description || ""))) {
            console.error(`::error::${file}: DefinedTerm description is not visible — "${String(t.name)}"`); bad++;
          }
        }
      }
    }
  }
}
console.log(`structured-data gate: ${checked} FAQ/DefinedTerm entries checked, ${bad} not visible on their page.`);
process.exit(bad ? 1 : 0);
