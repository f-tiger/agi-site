// agimatch price check — runs ON THE CI RUNNER ONLY.
//
// Why this exists: the site's differentiator is auditability, but 26 of its 28
// price citations are third-party comparison articles rather than the vendor's
// own page, because the session sandbox cannot reach vendor domains (egress
// blocked). The runner can. This fetches each vendor's own pricing page and
// records what it actually finds, so a later session can upgrade confirmed
// prices to first-party sources.
//
// Honesty rules baked in, matching the fleet's trends fetchers:
//  - never fabricate: a failed fetch writes ok:false plus the reason, and the
//    previous good result for that entry is carried forward untouched;
//  - never claim a price is "wrong" from a failed match. Most vendor pricing
//    pages render prices in JS, so absence of a number in the HTML is
//    INCONCLUSIVE, not a refutation. The script says which of the two it is;
//  - the output is evidence for a human/session to judge, not a verdict.

import fs from 'node:fs';
import path from 'node:path';

const ROUTES = 'sites/agimatch/site/routes.json';
const OUT = 'sites/agimatch/data/price-check.json';
const UA = 'Mozilla/5.0 (compatible; agiscorecard-price-check/1.0; +https://match.agiscorecard.com/)';
const TIMEOUT_MS = 20000;
const POLITE_DELAY_MS = 2500;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } }

// Candidate pages to try for a vendor, cheapest-first. A homepage often lacks
// prices; /pricing is the convention.
function candidates(u) {
  let base;
  try { base = new URL(u); } catch { return [u]; }
  const origin = base.origin;
  const seen = new Set();
  const out = [];
  for (const c of [base.href, `${origin}/pricing`, `${origin}/plans`, `${origin}/pricing/`]) {
    if (!seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out;
}

// Numbers we claim, pulled out of a price string like
// "Free 300 min/mo; Pro $8.33/mo billed annually" -> ["300","8.33"]
function claimedNumbers(price) {
  const nums = String(price || '').match(/\d+(?:[.,]\d+)?/g) || [];
  // drop bare small integers that match anything on a page (1, 2, 12 ...)
  return [...new Set(nums)].filter(n => n.includes('.') || Number(n) >= 20);
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

async function fetchText(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: ctl.signal, redirect: 'follow' });
    const body = res.ok ? await res.text() : '';
    return { ok: res.ok, status: res.status, text: htmlToText(body), final_url: res.url || url };
  } catch (e) {
    return { ok: false, status: 0, text: '', error: String(e.message || e).slice(0, 200), final_url: url };
  } finally { clearTimeout(t); }
}

function contextFor(text, token) {
  const i = text.indexOf(token);
  if (i < 0) return '';
  return text.slice(Math.max(0, i - 70), i + 70).trim();
}

const routes = JSON.parse(fs.readFileSync(ROUTES, 'utf8'));
let prev = { entries: [] };
try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { /* first run */ }
const prevByKey = new Map((prev.entries || []).map(e => [e.bucket + '|' + e.tool, e]));

// Every priced tool in the table, deduped by (bucket, tool).
const targets = [];
for (const b of routes.buckets || []) {
  for (const t of b.tools || []) {
    if (!t.url || !t.price) continue;
    targets.push({ bucket: b.id, tool: t.name, url: t.url, claimed: t.price });
  }
}

const entries = [];
for (const tgt of targets) {
  const nums = claimedNumbers(tgt.claimed);
  let best = null;

  // Rank candidates: ANY successful fetch beats a failed one, and among
  // successful ones more confirmed numbers wins. Comparing only on found-count
  // would let a 404 outrank a real page whenever nothing matched — which is
  // precisely the case for a price with no checkable numbers in it.
  const rank = c => (c.status >= 200 && c.status < 400 ? 1000 + c.found.length : c.status);
  for (const cand of candidates(tgt.url)) {
    const r = await fetchText(cand);
    await sleep(POLITE_DELAY_MS);
    const found = r.ok ? nums.filter(n => r.text.includes(n)) : [];
    const cur = {
      url: cand, final_url: r.final_url, status: r.status,
      found, missing: nums.filter(n => !found.includes(n)),
      page_has_any_price: r.ok ? /\$\s?\d/.test(r.text) : false,
      context: Object.fromEntries(found.map(n => [n, contextFor(r.text, n)])),
      ...(r.error ? { error: r.error } : {}),
    };
    if (!best || rank(cur) > rank(best)) best = cur;
    if (r.ok && nums.length && found.length === nums.length) break; // fully confirmed
  }

  const nothingFetched = !best || best.status === 0 || best.status >= 400;
  let verdict;
  if (nothingFetched) verdict = 'FETCH-FAILED';
  else if (!nums.length) verdict = 'NO-NUMBERS-TO-CHECK';
  else if (best.found.length === nums.length) verdict = 'CONFIRMED-ON-VENDOR-PAGE';
  else if (!best.page_has_any_price) verdict = 'INCONCLUSIVE-PAGE-HAS-NO-PRICES'; // almost always JS-rendered
  else if (best.found.length) verdict = 'PARTIAL';
  else verdict = 'NOT-FOUND-BUT-PAGE-HAS-PRICES'; // the one that may mean our figure is stale

  const key = tgt.bucket + '|' + tgt.tool;
  const entry = {
    bucket: tgt.bucket, tool: tgt.tool, vendor_host: hostOf(tgt.url),
    claimed_price: tgt.claimed, numbers_checked: nums,
    checked_at: new Date().toISOString().slice(0, 10),
    verdict, ...(best || {}),
  };

  // keep-last-good: a failed run never destroys a previous successful check
  if (verdict === 'FETCH-FAILED' && prevByKey.has(key)) {
    const old = prevByKey.get(key);
    if (old.verdict !== 'FETCH-FAILED') {
      entry.note = 'fetch failed this run; previous result retained below';
      entry.previous = old;
    }
  }
  entries.push(entry);
  console.log(`${verdict.padEnd(32)} ${tgt.tool} (${tgt.bucket}) ${best ? best.status : '-'}`);
}

const tally = entries.reduce((a, e) => (a[e.verdict] = (a[e.verdict] || 0) + 1, a), {});
const out = {
  generated_at: new Date().toISOString(),
  what_this_is: 'Automated re-check of every price in routes.json against the vendor\'s own page, run from CI because the authoring sandbox cannot reach vendor domains. Evidence for a human to judge — not a verdict, and never written back to the site automatically.',
  how_to_read: {
    'CONFIRMED-ON-VENDOR-PAGE': 'Every number we print appears on the vendor\'s own page. This source can be upgraded to first-party in routes.json.',
    PARTIAL: 'Some numbers appear. Read the context strings before changing anything.',
    'INCONCLUSIVE-PAGE-HAS-NO-PRICES': 'The page carries no price text at all, so it almost certainly renders prices in JavaScript. This says nothing about whether our figure is right.',
    'NOT-FOUND-BUT-PAGE-HAS-PRICES': 'The page shows prices and ours is not among them. This is the only verdict that suggests our figure may be stale — check it by hand.',
    'FETCH-FAILED': 'Could not reach the page this run. Previous result, if any, is retained under `previous`.',
  },
  tally,
  entries,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('\ntally:', JSON.stringify(tally));
console.log('wrote', OUT);
