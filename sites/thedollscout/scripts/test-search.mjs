/* Tests the site search against the real index and the real script.

   A search box that silently returns nothing is worse than no search box: it
   tells a visitor the site has no answer, and the site does. So this drives
   the shipped js/search.js with the shipped search-index.json, through the
   same fetch the browser makes — intercepted, not stubbed out — and checks
   the answers a person would actually type for.

   Keyboard behaviour is tested too, because the results list is a custom
   combobox. Anything built out of divs and JavaScript is only usable by
   keyboard if somebody checked, and "looks fine with a mouse" is not that. */

import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const index = readFileSync("search-index.json", "utf8");
const page_html = readFileSync("index.html", "utf8");
const searchJs = readFileSync("js/search.js", "utf8");
const css = readFileSync("css/main.css", "utf8");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

/* Served from a real origin, not setContent.
   The first version of this test used page.setContent(), which leaves the
   page on about:blank — and a root-relative fetch("/search-index.json") has
   nothing to resolve against there, so the route never matched and every
   query returned the empty state. Four tests failed and the empty-state test
   passed trivially, which is exactly what a broken harness looks like from
   the outside. Intercepting the document too gives the page a real URL, so
   the script's own relative fetch is the thing under test. */
const ORIGIN = "https://thedollscout.com";
await page.route(`${ORIGIN}/**`, (route) => {
  const url = route.request().url();
  if (url.endsWith("/search-index.json")) {
    return route.fulfill({ status: 200, contentType: "application/json", body: index });
  }
  if (url === `${ORIGIN}/` || url.endsWith(".html")) {
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: page_html
        .replace("</head>", `<style>${css}</style></head>`)
        .replace(/<script src="\/js\/[^"]*"[^>]*><\/script>/g, "")
        .replace("</body>", `<script>${searchJs}</script></body>`),
    });
  }
  return route.fulfill({ status: 404, body: "" });
});

await page.goto(`${ORIGIN}/`, { waitUntil: "load" });

let failed = 0;
const t = async (name, fn) => {
  try { await fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n        ${e.message.split("\n")[0]}`); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const type = async (q) => {
  await page.fill("#ds-search", "");
  await page.fill("#ds-search", q);
  await page.waitForTimeout(150);
  return page.$$eval("#ds-search-results li", (els) =>
    els.map((el) => ({ text: el.textContent.trim(), href: el.querySelector("a") ? el.querySelector("a").getAttribute("href") : null }))
  );
};

await t("the search box is injected, and only by script", () => {
  assert(!/id="ds-search"/.test(page_html), "must NOT be in the served HTML — a dead box is worse than none");
  return page.waitForSelector("#ds-search", { timeout: 3000 });
});

await t('a data query returns the measured answer, not just a page', async () => {
  const r = await type("150cm");
  assert(r.length > 0, "no results for 150cm");
  assert(/data/i.test(r[0].text), `top hit should be the data answer, got: ${r[0].text.slice(0, 70)}`);
  assert(/57/.test(r[0].text) && /79/.test(r[0].text), `should carry the measured range, got: ${r[0].text.slice(0, 90)}`);
});

await t("a height with no page still answers, and says why it has none", async () => {
  const r = await type("165cm");
  assert(r.length > 0, "no results for 165cm");
  assert(/too small/i.test(r[0].text), `should state the sample is too small, got: ${r[0].text.slice(0, 90)}`);
  assert(r[0].href === "/weight/", `must link to the hub, not a page that does not exist — got ${r[0].href}`);
});

await t("a plain-word query finds the right page", async () => {
  const r = await type("chargeback");
  /* The canonical URL. This asserted "/payment-protection.html" and broke on
     the 2026-08-14 URL migration — the page was in the results the whole time,
     under the URL the host actually serves. Same class as the llms.txt section
     matchers: a hardcoded .html that outlived the URLs.
     And FIRST, not merely present: /mcp documents all six tools, so it matches
     every tool's vocabulary, and it was winning this on an arbitrary tiebreak. */
  assert(r[0] && r[0].href === "/payment-protection",
    `expected the recourse checker FIRST, got ${r.map((x) => x.href).join(", ")}`);
});

await t("a query matching nothing says so instead of failing silently", async () => {
  const r = await type("zzzzqqq");
  assert(r.length === 1 && /no match/i.test(r[0].text), `expected an explicit empty state, got: ${JSON.stringify(r).slice(0, 90)}`);
});

await t("arrow keys move a visible selection and Enter follows it", async () => {
  await type("150cm");
  await page.keyboard.press("ArrowDown");
  const sel = await page.$$eval('#ds-search-results li[aria-selected="true"]', (e) => e.length);
  assert(sel === 1, `exactly one option should be selected, got ${sel}`);
  const active = await page.getAttribute("#ds-search", "aria-activedescendant");
  assert(active, "aria-activedescendant must point at the selection or a screen reader announces nothing");
});

await t("Escape closes the list", async () => {
  await type("150cm");
  await page.keyboard.press("Escape");
  assert(await page.getAttribute("#ds-search-results", "hidden") !== null, "list should be hidden");
  assert((await page.getAttribute("#ds-search", "aria-expanded")) === "false", "aria-expanded must follow the visible state");
});

await t("the skip link exists and targets something real", async () => {
  assert(/class="skip-link" href="#main"/.test(page_html), "no skip link in the served HTML");
  assert(/<main id="main"/.test(page_html), "skip link target #main does not exist");
});

await browser.close();
console.log(failed ? `\n${failed} failed.` : "\nAll passed.");
process.exit(failed ? 1 : 0);
