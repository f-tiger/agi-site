/* Builds the cross-distributor price comparison — or refuses to, and says why.

   This is the page the whole positioning was chosen for. Distributors cannot
   publish it, because it shows when they are not cheapest. Affiliate sites
   will not, because an honest table routes the reader to a shop they earn
   nothing from. We are an affiliate too; the difference is that we already
   publish criticism of our own vendor with the conflict disclosed first.

   Which means the gates below are the product. A comparison page that quietly
   drops the rows where our vendor loses is worth less than no page at all, and
   a comparison between two things that are not the same doll is a fabricated
   finding wearing a table. So every row must clear all of these:

     1. Same model      — height, cup and head code agree; factory does not
                          contradict; no build qualifier on one side only.
     2. Same currency    — with a real number on both sides, not a string.
     3. Known inclusions — if one distributor bundles standing feet, a gel
                          bust and an upgraded skeleton and the other bills
                          for them, the cheaper sticker is the dearer doll.
                          Unknown inclusions on either side is a refusal, not
                          a footnote.
     4. Comparable dates — prices recorded far apart are not a comparison.

   Rows that fail are not silently dropped: they are printed with the reason,
   because "we could not compare these honestly" is itself a finding, and
   because a silent drop is indistinguishable from a suppressed one. */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { VENDORS } from "./vendors.mjs";

const MAX_DAY_GAP = 21;
const SRC = "content/model-matches.json";

if (!existsSync(SRC)) {
  console.error(`${SRC} not found. Run scripts/match-models.mjs first.`);
  process.exit(1);
}

/* Recording dates come from each vendor's own collected file, so a stale
   distributor cannot be presented as current by borrowing another's date. */
const recordedBy = {};
for (const v of VENDORS) {
  for (const f of [`content/doll-specs-${v.id}.json`, v.id === "yourdoll" ? "content/doll-specs.json" : null]) {
    if (f && existsSync(f)) {
      const d = JSON.parse(readFileSync(f, "utf8"));
      recordedBy[v.id] = d.recorded || null;
    }
  }
}

const vendorMeta = Object.fromEntries(VENDORS.map((v) => [v.id, v]));
const { matched } = JSON.parse(readFileSync(SRC, "utf8"));

const dayGap = (a, b) => (a && b ? Math.abs((new Date(a) - new Date(b)) / 86400000) : Infinity);

const publishable = [];
const refused = [];

for (const m of matched) {
  const reasons = [];
  for (const r of m.rows) {
    if (typeof r.price !== "number") reasons.push(`${r.vendor}: price is not a number (${JSON.stringify(r.price)}) — re-scrape with the current parser`);
    if (!r.inclusionsClaimed || !r.inclusionsClaimed.length) reasons.push(`${r.vendor}: no inclusions captured, so like-for-like cannot be established`);
    if (!recordedBy[r.vendor]) reasons.push(`${r.vendor}: no recording date`);
  }
  const currencies = [...new Set(m.rows.map((r) => r.priceCurrency).filter(Boolean))];
  if (currencies.length > 1) reasons.push(`prices are in different currencies (${currencies.join(", ")}) and we do not convert`);
  const dates = m.rows.map((r) => recordedBy[r.vendor]);
  if (dayGap(dates[0], dates[1]) > MAX_DAY_GAP) {
    reasons.push(`recorded ${Math.round(dayGap(dates[0], dates[1]))} days apart — beyond the ${MAX_DAY_GAP}-day window`);
  }

  if (reasons.length) refused.push({ key: m.key, factory: m.factory, reasons: [...new Set(reasons)], rows: m.rows });
  else publishable.push({ ...m, dates });
}

console.log(`Matched models: ${matched.length}`);
console.log(`Publishable after gates: ${publishable.length}`);
console.log(`Refused: ${refused.length}`);
for (const r of refused) {
  console.log(`\n  ${r.key}${r.factory ? ` (${r.factory})` : ""} — NOT published:`);
  for (const why of r.reasons) console.log(`      · ${why}`);
}

if (!publishable.length) {
  console.log(
    `\nNothing clears the gates, so no comparison page is written. That is the ` +
    `correct outcome, not a failure — the gates exist because a wrong price here ` +
    `is the one error this site's positioning cannot survive.\n` +
    `Do not relax a gate to produce a page.`
  );
  process.exit(0);
}

/* ---- only reached when something genuinely compares ---- */
/* content/, not compare/. What this writes is a reviewable fragment with no
   doctype, head or navigation, and scripts/build-sitemap.mjs walks every
   .html outside its skip list — so writing it into the site root would have
   published a headless fragment as a real page, and submitted it to search
   engines, the first time a row qualified. content/ is excluded from the
   published site, which is the correct home for something a human still has
   to decide about. */
mkdirSync("content", { recursive: true });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const usd = (n) => "$" + n.toLocaleString("en-US");

const rowsHtml = publishable
  .map((m) => {
    const sorted = [...m.rows].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];
    const cells = sorted
      .map((r) => {
        const v = vendorMeta[r.vendor] || {};
        const flags = [
          v.affiliate ? "we earn a commission here" : "we earn nothing here",
          v.vetted ? "passed our 10-point check" : "not vetted by us",
        ].join("; ");
        const inc = r.inclusionsClaimed.map((i) => i.term).join(", ") || "none stated";
        return `      <tr${r === cheapest ? ' class="cheapest"' : ""}>
        <th scope="row">${esc(v.name || r.vendor)}</th>
        <td><strong>${usd(r.price)}</strong>${r === cheapest ? ' <span class="tag">cheapest</span>' : ""}</td>
        <td>${esc(inc)}</td>
        <td>${esc(flags)}</td>
        <td><a href="${esc(r.url)}" rel="${v.affiliate ? "sponsored nofollow noopener" : "nofollow noopener"}" target="_blank">listing</a></td>
      </tr>`;
      })
      .join("\n");

    const gap = sorted[sorted.length - 1].price - cheapest.price;
    const cheapVendor = vendorMeta[cheapest.vendor] || {};
    return `<h3 id="${esc(m.key)}">${esc(m.factory || "Unidentified factory")} — ${esc(m.key.replace(/\|/g, " · "))}</h3>
<table class="compare-table">
  <caption>Recorded ${esc(m.dates.filter(Boolean).join(" / "))}. Prices drift; the rank order is the durable claim.</caption>
  <thead><tr><th scope="col">Distributor</th><th scope="col">Price</th><th scope="col">Stated as included</th><th scope="col">Our position</th><th scope="col"></th></tr></thead>
  <tbody>
${cells}
  </tbody>
</table>
<p>Difference: <strong>${usd(gap)}</strong>. The cheaper listing is at
<strong>${esc(cheapVendor.name || cheapest.vendor)}</strong>, which
${cheapVendor.affiliate ? "does pay us a commission — read the row above with that in mind" : "pays us nothing"}${
      cheapVendor.vetted ? "" : ", and which has not been through our 10-point vendor check"
    }. <strong>Cheapest is not the same as safe</strong>: run any unvetted shop
through the <a href="/scam-check.html">Scam-Check</a> before paying, and read
<a href="/payment-protection.html">what recourse survives</a> if it goes wrong.</p>`;
  })
  .join("\n\n");

writeFileSync("content/compare-draft.html", `<!-- generated by scripts/build-compare.mjs — a draft fragment, not a page -->\n${rowsHtml}\n`);
console.log(`\ncontent/compare-draft.html: ${publishable.length} model(s) written.`);
console.log("This is a fragment for review, not a finished page — a human decides what ships.");
