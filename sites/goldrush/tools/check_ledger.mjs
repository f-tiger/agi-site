#!/usr/bin/env node
// Apply the registry's own admission rules to our own ledger before every deploy (2026-09-22).
//
// The protocol page tells other sites: "/claimledger.json parses and every entry carries all
// five fields; flip conditions are actually written (an empty flip fails validation)". Until
// today the deploy gate only ran JSON.parse on ledger.json — we demanded of others what we
// never asserted about ourselves. Zero dependencies (the schema file is the reference; this
// mirrors its hard rules so the gate needs no validator package).
//
// Run: node tools/check_ledger.mjs [--selftest]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TIERS = new Set(["verified", "reported", "self-reported"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ASOF = /^\d{4}(-\d{2})?(-\d{2})?$/;
const SRC = /^https?:\/\/.+\..+/;

export function checkLedger(l) {
  const errs = [];
  if (!l || typeof l !== "object") return ["ledger is not an object"];
  for (const k of ["name", "url", "dateModified", "entries"]) if (!l[k]) errs.push(`missing top-level ${k}`);
  if (l.dateModified && !DATE.test(l.dateModified)) errs.push(`dateModified must be YYYY-MM-DD, got ${l.dateModified}`);
  const seen = new Set();
  const all = [...(Array.isArray(l.entries) ? l.entries : []), ...(Array.isArray(l.archive) ? l.archive : [])];
  if (!all.length) errs.push("no entries");
  all.forEach((e, i) => {
    const id = (e && e.id) || `#${i}`;
    if (!e || typeof e !== "object") { errs.push(`${id}: not an object`); return; }
    if (e.id) { if (seen.has(e.id)) errs.push(`${id}: duplicate id`); seen.add(e.id); }
    for (const k of ["claim", "tier", "verdict", "asOf", "flip", "source"]) if (!e[k]) errs.push(`${id}: missing ${k}`);
    if (e.tier && !TIERS.has(e.tier)) errs.push(`${id}: tier must be verified|reported|self-reported, got ${e.tier}`);
    if (e.asOf && !ASOF.test(e.asOf)) errs.push(`${id}: asOf must be a date, got ${e.asOf}`);
    if (typeof e.flip === "string" && e.flip.length < 15) errs.push(`${id}: flip under 15 chars — a verdict without a written flip condition is an opinion`);
    if (e.source && !SRC.test(e.source)) errs.push(`${id}: source must be an http(s) URL a stranger can check`);
    // A corrected flip must keep its predecessor visible (ledger rule 1: never a silent rewrite).
    if (e.correction && !Object.keys(e).some((k) => /^flip_v\d/.test(k))) errs.push(`${id}: has a correction but no flip_v<N>_<date> field keeping the old text`);
  });
  return errs;
}

export function checkFetchlogStatic(f) {
  const errs = [];
  if (!f || typeof f !== "object") return ["fetchlog is not an object"];
  const c = f.counts || {};
  for (const k of ["outside_fetches_of_our_claimledger", "outside_fetches_crawler_ua", "outside_fetches_browser_ua", "outside_fetches_other_ua", "as_of"]) if (c[k] === undefined) errs.push(`counts.${k} missing`);
  if (c.outside_fetches_of_our_claimledger !== (c.outside_fetches_crawler_ua | 0) + (c.outside_fetches_browser_ua | 0) + (c.outside_fetches_other_ua | 0)) errs.push("static counts: headline ≠ crawler + browser + other");
  if (f.live !== false) errs.push("the static file must say live:false — it is the fallback, and a fallback that claims to be live is the exact failure this rewrite fixes");
  if (!f.definitions || !f.definitions.outside_fetches_of_our_claimledger) errs.push("definitions.outside_fetches_of_our_claimledger missing");
  return errs;
}

function selftest() {
  const ok = { name: "x", url: "https://x.example/", dateModified: "2026-09-22", entries: [{ id: "a", claim: "abc", tier: "verified", verdict: "no", asOf: "2026-09", flip: "a written flip condition here", source: "https://x.example/p" }] };
  const cases = [
    ["valid ledger passes", checkLedger(ok).length === 0],
    ["missing flip fails", checkLedger({ ...ok, entries: [{ ...ok.entries[0], flip: "" }] }).length > 0],
    ["short flip fails", checkLedger({ ...ok, entries: [{ ...ok.entries[0], flip: "later" }] }).length > 0],
    ["bad tier fails", checkLedger({ ...ok, entries: [{ ...ok.entries[0], tier: "trust me" }] }).length > 0],
    ["non-http source fails", checkLedger({ ...ok, entries: [{ ...ok.entries[0], source: "ask me" }] }).length > 0],
    ["duplicate id fails", checkLedger({ ...ok, entries: [ok.entries[0], ok.entries[0]] }).length > 0],
    ["archive entries are checked too", checkLedger({ ...ok, archive: [{ ...ok.entries[0], id: "b", flip: "" }] }).length > 0],
    ["correction without kept old flip fails", checkLedger({ ...ok, entries: [{ ...ok.entries[0], correction: "tightened" }] }).length > 0],
    ["correction with flip_v1 kept passes", checkLedger({ ...ok, entries: [{ ...ok.entries[0], correction: "tightened", "flip_v1_2026-08-30": "old text" }] }).length === 0],
    ["static fetchlog: sum mismatch fails", checkFetchlogStatic({ live: false, definitions: { outside_fetches_of_our_claimledger: "d" }, counts: { outside_fetches_of_our_claimledger: 31, outside_fetches_crawler_ua: 22, outside_fetches_browser_ua: 8, outside_fetches_other_ua: 0, as_of: "2026-09-22" } }).length > 0],
    ["static fetchlog: live:true fails", checkFetchlogStatic({ live: true, definitions: { outside_fetches_of_our_claimledger: "d" }, counts: { outside_fetches_of_our_claimledger: 0, outside_fetches_crawler_ua: 0, outside_fetches_browser_ua: 0, outside_fetches_other_ua: 0, as_of: "2026-09-22" } }).length > 0],
  ];
  let bad = 0;
  for (const [name, pass] of cases) { console.log(`${pass ? "✅" : "❌"} ${name}`); if (!pass) bad++; }
  return bad;
}

const argv = process.argv.slice(2);
if (argv.includes("--selftest")) process.exit(selftest() ? 1 : 0);

const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, "site", "ledger.json"), "utf8"));
const fetchlog = JSON.parse(fs.readFileSync(path.join(ROOT, "site", "fetchlog.json"), "utf8"));
const errs = [...checkLedger(ledger).map((e) => `ledger.json: ${e}`), ...checkFetchlogStatic(fetchlog).map((e) => `fetchlog.json: ${e}`)];
if (errs.length) { for (const e of errs) console.error(`❌ ${e}`); process.exit(1); }
console.log(`✅ check_ledger: ${ledger.entries.length} entries + ${(ledger.archive || []).length} archived carry all five fields, written flips, checkable sources; fetchlog static fallback is consistent and says live:false`);
