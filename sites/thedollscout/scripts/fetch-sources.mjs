/* Retrieves the primary sources behind a claim and commits their text, so that
   claims can be verified against what a source actually says.

   Why this exists. The research pass that motivated it produced almost nothing:
   the editing sandbox's network policy rejects CONNECT to every external host,
   so 21 of 25 candidate claims were killed at verification — not because they
   were wrong, but because no source could be read. The failure mode that
   creates is worse than a thin report: search-engine snippets still arrive,
   they look like quotations, and there is nothing stopping a plausible-sounding
   paraphrase of a statute from being published as fact.

   GitHub Actions runners do have egress. So verification moves here. The text
   this commits is read by a human (or by a later session) against the claim it
   is supposed to support, and only then does anything get published.

   It fetches with a real browser because several of the relevant hosts —
   legislation.gov.uk, publishers, consumer bodies — serve bot-protection pages
   to plain HTTP clients, and a challenge page saved as "the source" would be
   the exact failure this is meant to prevent.

   Reads content/source-queue.json. Writes content/sources/<slug>.md, one file
   per URL, each carrying its own provenance header: URL, HTTP status, page
   title, fetch date. A file with a non-200 status or a suspiciously short body
   is kept deliberately — "we tried and got a 403" is itself a finding, and
   silently dropping it would let the next reader assume the source was never
   checked. */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { chromium } from "playwright";

const QUEUE = "content/source-queue.json";
const OUTDIR = "content/sources";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/* Run 1 set this at 400 and legislation.gov.uk sailed through at 433 chars —
   the 433 chars being its cookie banner, filed under "Retrieved cleanly". A
   consent notice that passes as a statute is precisely the failure this script
   exists to prevent, so the bar is now high enough that no banner clears it. */
const THIN_BODY = 1200;

/* Phrases that mean "you are looking at the wrapper, not the document". Length
   alone missed this: a verbose consent notice is long, and a real short section
   is short. */
const NOT_THE_DOCUMENT = [
  /cookies on .{0,40}\.gov\.uk/i,
  /we need your consent to use some of these cookies/i,
  /reject all cookies/i,
  /enable ?javascript/i,
  /checking your browser/i,
  /are you a robot/i,
  /access denied/i,
  /just a moment/i,
];

const slug = (u) =>
  u
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .toLowerCase();

if (!existsSync(QUEUE)) {
  console.log(`No ${QUEUE} — nothing to fetch.`);
  process.exit(0);
}

const queue = JSON.parse(readFileSync(QUEUE, "utf8"));
const items = Array.isArray(queue) ? queue : queue.urls || [];
if (!items.length) {
  console.log("Queue is empty.");
  process.exit(0);
}

mkdirSync(OUTDIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, locale: "en-GB" });
const results = [];

for (const raw of items) {
  const item = typeof raw === "string" ? { url: raw } : raw;
  const { url, note = "" } = item;
  const page = await ctx.newPage();
  let status = 0;
  let title = "";
  let text = "";
  let error = "";

  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    status = res ? res.status() : 0;
    await page.waitForTimeout(1500);

    /* Get the consent overlay out of the way, or the page underneath is never
       reached. Tried in order; a miss is fine and silent. */
    for (const sel of [
      'button:has-text("Accept all")', 'button:has-text("Accept")',
      'button:has-text("I agree")', 'button:has-text("Agree")',
      'button:has-text("Allow all")', 'button:has-text("OK")',
      '[id*="accept" i]', '[class*="accept" i]',
    ]) {
      try {
        const b = page.locator(sel).first();
        if (await b.isVisible({ timeout: 700 })) { await b.click({ timeout: 1500 }); await page.waitForTimeout(700); break; }
      } catch { /* not present — normal */ }
    }

    /* The FOS page put the Section 75 thresholds — the entire reason it was
       queued — inside collapsed accordions, so run 1 retrieved the headings and
       none of the answers. Expand everything before reading. */
    await page.evaluate(() => {
      document.querySelectorAll("details").forEach((d) => (d.open = true));
      document.querySelectorAll('[aria-expanded="false"]').forEach((el) => {
        try { el.click(); } catch (e) {}
      });
      document.querySelectorAll("[hidden]").forEach((el) => el.removeAttribute("hidden"));
    });
    await page.waitForTimeout(1200);

    title = (await page.title()) || "";
    /* Prefer the document's main content region. Falling back to body is fine —
       the provenance header records which was used, so a reader can tell
       navigation chrome from substance. */
    text = await page.evaluate(() => {
      const pick = document.querySelector("main, article, [role=main], #content, .content");
      const el = pick && pick.innerText && pick.innerText.length > 200 ? pick : document.body;
      return el ? el.innerText : "";
    });
  } catch (e) {
    error = e.message;
  }

  await page.close();

  const clean = (text || "").replace(/\n{3,}/g, "\n\n").trim();
  const flags = [];
  if (status !== 200) flags.push(`NON-200 STATUS (${status || "no response"})`);
  if (clean.length < THIN_BODY) flags.push(`THIN BODY (${clean.length} chars) — likely a challenge or consent page, NOT the source`);
  const wrapper = NOT_THE_DOCUMENT.find((re) => re.test(clean.slice(0, 1500)));
  if (wrapper) flags.push(`WRAPPER PAGE — the text opens with ${wrapper}, i.e. a cookie/consent/challenge notice rather than the document`);
  if (error) flags.push(`FETCH ERROR: ${error}`);

  const header = [
    `<!-- Retrieved by scripts/fetch-sources.mjs. Do not edit by hand. -->`,
    ``,
    `# ${title || "(no title)"}`,
    ``,
    `- **URL:** ${url}`,
    `- **HTTP status:** ${status || "none"}`,
    `- **Retrieved:** ${process.env.FETCH_DATE || new Date().toISOString().slice(0, 10)}`,
    `- **Characters:** ${clean.length}`,
    note ? `- **Why queued:** ${note}` : null,
    flags.length
      ? `\n> **DO NOT TREAT THIS AS A VERIFIED SOURCE.**\n> ` + flags.join("\n> ")
      : `\n> Retrieved cleanly. Still read it against the claim before publishing — a 200 means the page loaded, not that it says what the claim says.`,
    ``,
    `---`,
    ``,
  ]
    .filter((l) => l !== null)
    .join("\n");

  writeFileSync(`${OUTDIR}/${slug(url)}.md`, header + clean + "\n");
  results.push({ url, status, chars: clean.length, flagged: flags.length > 0 });
  console.log(`${flags.length ? "FLAGGED" : "ok     "}  ${status || "---"}  ${String(clean.length).padStart(7)}  ${url}`);

  await new Promise((r) => setTimeout(r, 2000));
}

await browser.close();

const ok = results.filter((r) => !r.flagged).length;
console.log(`\n## Source retrieval\n`);
console.log(`${ok} of ${results.length} retrieved cleanly into \`${OUTDIR}/\`.\n`);
console.log("| Status | Chars | URL |");
console.log("|---|---|---|");
for (const r of results) {
  console.log(`| ${r.flagged ? "**flagged**" : r.status} | ${r.chars} | ${r.url} |`);
}
console.log(
  "\n_A clean retrieval is not a verified claim. Each file must still be read " +
  "against the assertion it is meant to support._"
);
