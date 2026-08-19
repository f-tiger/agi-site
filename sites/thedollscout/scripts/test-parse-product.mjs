/* Fixture tests for scripts/parse-product.mjs.

   These exist because of a specific near-miss. A probe of a second
   distributor reported 13 rows "parsed cleanly" and printed prices reading
   "Regular price $1,499.00". The label was obvious; what was not obvious is
   that on a DISCOUNTED product the same block also carries the compare-at
   price, so the parser could have reported the higher number as the price. In
   this site's positioning that error is uniquely damaging: it makes a
   competing distributor look more expensive than it is, in favour of the one
   we earn commission from. Nobody would have caught it from a summary line.

   So the price parse is now pinned against markup from both storefront
   engines, on sale and off, and the scrape workflow runs this first. The
   fixtures are real theme structures: WooCommerce's del/ins pair and Shopify
   Dawn's two-block price with one half hidden by CSS.

   Run: node scripts/test-parse-product.mjs   (needs playwright + chromium) */

import { chromium } from "playwright";
import { readProduct } from "./parse-product.mjs";

/* Dawn hides the inapplicable half of the price block with display:none and
   hides the labels from sighted users with clip — not display:none, which is
   exactly why the label text reached our output. Both behaviours are
   reproduced here; without the real CSS these fixtures would pass on a parser
   that is still broken. */
const CSS = `
  .visually-hidden { position:absolute; width:1px; height:1px; overflow:hidden;
                     clip:rect(0 0 0 0); white-space:nowrap; }
  .price--on-sale .price__regular { display:none; }
  .price:not(.price--on-sale) .price__sale { display:none; }
`;

const page$ = (inner) => `<style>${CSS}</style><main>${inner}</main>`;

const CASES = [
  {
    name: "WooCommerce, not on sale",
    html: page$(`
      <h1>Aria 165cm E Cup Silicone Doll</h1>
      <div class="summary">
        <p class="price"><span class="woocommerce-Price-amount amount"><bdi><span>$</span>1,099.00</bdi></span></p>
        <p>Height 165 cm · Weight 38 kg</p>
      </div>`),
    expect: { price: 1099, priceWas: null, priceCurrency: "USD", heightCm: "165", weightKg: 38 },
  },
  {
    name: "WooCommerce, on sale — must report the price actually charged",
    html: page$(`
      <h1>Mia 158cm B Cup TPE Doll</h1>
      <div class="summary">
        <p class="price">
          <del><span class="woocommerce-Price-amount amount"><bdi>$2,199.00</bdi></span></del>
          <ins><span class="woocommerce-Price-amount amount"><bdi>$1,799.00</bdi></span></ins>
        </p>
        <p>Weight: 71 lbs</p>
      </div>`),
    expect: { price: 1799, priceWas: 2199, heightCm: "158" },
  },
  {
    name: "Shopify Dawn, not on sale — the label must not survive",
    html: page$(`
      <h1>WM Doll 160cm A Cup - Head 70</h1>
      <div class="product__info-wrapper">
        <div class="price">
          <div class="price__regular">
            <span class="visually-hidden">Regular price</span>
            <span class="price-item price-item--regular">$1,499.00</span>
          </div>
          <div class="price__sale">
            <span class="visually-hidden">Regular price</span>
            <s class="price-item price-item--regular"></s>
            <span class="visually-hidden">Sale price</span>
            <span class="price-item price-item--sale">$1,499.00</span>
          </div>
        </div>
        <table><tr><th>Net Weight (kg)</th><td>32</td></tr></table>
      </div>`),
    expect: { price: 1499, priceWas: null, heightCm: "160", weightKg: 32 },
  },
  {
    name: "Shopify Dawn, on sale — the hidden regular block must not win",
    html: page$(`
      <h1>WM Doll 175cm B Cup - Head 394</h1>
      <div class="product__info-wrapper">
        <div class="price price--on-sale">
          <div class="price__regular">
            <span class="visually-hidden">Regular price</span>
            <span class="price-item price-item--regular">$2,399.00</span>
          </div>
          <div class="price__sale">
            <span class="visually-hidden">Regular price</span>
            <s class="price-item price-item--regular">$2,399.00</s>
            <span class="visually-hidden">Sale price</span>
            <span class="price-item price-item--sale">$1,599.00</span>
          </div>
        </div>
        <p>Weight 38.5 kg</p>
      </div>`),
    expect: { price: 1599, priceWas: 2399, heightCm: "175", weightKg: 38.5 },
  },
  {
    name: "Dawn unit price must not be mistaken for the product price",
    html: page$(`
      <h1>Zelex 170cm D Cup Silicone Doll</h1>
      <div class="product__info-wrapper">
        <div class="price">
          <div class="price__regular">
            <span class="visually-hidden">Regular price</span>
            <span class="price-item price-item--regular">$2,650.00</span>
          </div>
          <div class="price__sale"></div>
          <div class="unit-price">
            <span class="visually-hidden">Unit price</span>
            <span>$5.00</span><span>per&nbsp;</span><span>100ml</span>
          </div>
        </div>
        <p>Weight 41 kg</p>
      </div>`),
    expect: { price: 2650, priceWas: null },
  },
  {
    name: "A 'recently viewed' tile must not price the product",
    html: page$(`
      <h1>Irontech 166cm C Cup Doll</h1>
      <div class="product__info-wrapper">
        <div class="price"><span class="price-item price-item--regular">$1,899.00</span></div>
        <p>Weight 35 kg</p>
      </div>
      <section class="recently-viewed">
        <div class="card"><div class="price"><span class="price-item price-item--regular">$199.00</span></div></div>
      </section>`),
    expect: { price: 1899 },
  },
  {
    name: "Contradictory markup reports nothing rather than a guess",
    html: page$(`
      <h1>Test 160cm Doll</h1>
      <div class="summary">
        <p class="price"><del><span>$999.00</span></del> <ins><span>$1,499.00</span></ins></p>
        <p>Weight 30 kg</p>
      </div>`),
    expect: { price: null, priceWas: null },
  },
  {
    name: "No price block at all is null, not zero",
    html: page$(`<h1>Test 160cm Doll</h1><div class="summary"><p>Weight 30 kg</p></div>`),
    expect: { price: null, priceWas: null, weightKg: 30 },
  },
  /* Inclusions decide whether two prices are comparable at all, so the near/far
     distinction is the whole point: a term beside the word "free" is a
     candidate, the same term elsewhere on a page that mentions free shipping
     is not. */
  {
    name: "Bundled inclusions are captured with the sentence they came from",
    html: page$(`
      <h1>WM Doll 165cm C Cup - Head 233</h1>
      <div class="product__info-wrapper">
        <div class="price"><span class="price-item price-item--regular">$1,899.00</span></div>
        <p>Weight 34 kg. Every doll ships with free standing feet and a
           complimentary gel breast upgrade. Storage bag sold separately.</p>
      </div>`),
    check: (got) => {
      const terms = got.inclusionsClaimed.map((i) => i.term);
      if (!terms.includes("standing feet")) return "standing feet not captured";
      if (!terms.includes("gel breast")) return "gel breast not captured";
      if (terms.includes("storage")) return "'storage ... sold separately' must not count as included";
      const ev = got.inclusionsClaimed.find((i) => i.term === "standing feet").evidence;
      if (!/free standing feet/i.test(ev)) return `evidence does not contain the claim: ${ev}`;
      return null;
    },
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

let failed = 0;
for (const c of CASES) {
  await page.setContent(c.html, { waitUntil: "load" });
  const got = await page.evaluate(readProduct);
  const bad = Object.entries(c.expect || {}).filter(([k, v]) => got[k] !== v);
  const note = c.check ? c.check(got) : null;
  if (bad.length || note) {
    failed++;
    console.log(`FAIL  ${c.name}`);
    for (const [k, v] of bad) console.log(`        ${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(got[k])}`);
    if (note) console.log(`        ${note}`);
    console.log(`        priceRaw: ${JSON.stringify(got.priceRaw)}`);
  } else {
    console.log(`ok    ${c.name}`);
  }
}

await browser.close();
console.log(failed ? `\n${failed} of ${CASES.length} failed.` : `\nAll ${CASES.length} passed.`);
process.exit(failed ? 1 : 0);
