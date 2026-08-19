/* The DOM side of the spec scraper: everything that runs inside the page.

   It lives in its own file for one reason — so it can be tested. This function
   is passed to page.evaluate() unchanged by scripts/fetch-specs.mjs and by
   scripts/test-parse-product.mjs, so the fixtures test the code that actually
   scrapes, not a paraphrase of it.

   Two hard constraints follow from that, and breaking either one produces a
   confusing failure rather than an error:

   1. It must be entirely self-contained. Playwright serialises the function
      with toString() and evaluates the source in the browser, so anything
      captured from module scope is simply undefined at run time.
   2. It must never call innerText on a detached node. innerText is defined to
      fall back to textContent when an element is not being rendered, so a
      cloneNode(true) copy quietly returns the screen-reader labels and the
      display:none half of a Shopify price block — the exact noise the price
      parse exists to remove. Read from live nodes only. */

export function readProduct() {
  const title = (document.querySelector("h1") || {}).textContent?.trim() || "";

  /* First attempt picked the first selector that existed, and on the
     WooCommerce theme `.summary` exists while being effectively empty — so
     the match text was blank and even the height printed in the title was
     missed. Take the largest candidate instead of the first, and always fold
     the title in, because the title is where vendors reliably put height. */
  const candidates = [
    document.querySelector(".woocommerce-product-details__short-description"),
    document.querySelector(".summary"),
    document.querySelector(".product__info-wrapper"),
    document.querySelector("main"),
    document.body,
  ].filter(Boolean).map((el) => el.innerText || "");
  const body = candidates.sort((a, b) => b.length - a.length)[0] || "";
  const text = (title + " \n " + body).replace(/\s+/g, " ");

  const grab = (re) => { const m = text.match(re); return m ? m[1] : null; };

  /* Height: the title form ("151cm (4ft11) …") is the most reliable, so try
     the title alone before trusting anything in the page body, where
     related-product tiles contribute stray numbers. */
  const titleH = title.match(/(\d{2,3}(?:\.\d+)?)\s*cm/i);
  const heightCm = titleH ? titleH[1] : grab(/height[^0-9]{0,20}(\d{2,3}(?:\.\d+)?)\s*cm/i);

  /* Weight appears as kg in spec tables and as lbs in titles. Take a labelled
     match first; fall back to the title, never to a loose number anywhere on
     the page.

     The gap allowance used to be 15 characters, enough for "Weight: 32 kg"
     but not for the spec-table forms — "Net Weight (kg) 32", "Weight / 重量
     32kg". Widen it, and accept a unit printed in the label rather than after
     the number. */
  const kg = grab(/weight[^0-9]{0,30}(\d{1,3}(?:\.\d)?)\s*kgs?\b/i)
    || grab(/weight\s*[（(]\s*kgs?\s*[)）][^0-9]{0,10}(\d{1,3}(?:\.\d)?)/i);
  const lbLabelled = grab(/weight[^0-9]{0,30}(\d{1,3}(?:\.\d)?)\s*(?:lbs?|pounds?)\b/i)
    || grab(/weight\s*[（(]\s*(?:lbs?|pounds?)\s*[)）][^0-9]{0,10}(\d{1,3}(?:\.\d)?)/i);
  const titleLb = title.match(/(\d{1,3}(?:\.\d)?)\s*lbs?\b/i);
  const titleKg = title.match(/(\d{1,3}(?:\.\d)?)\s*kgs?\b/i);
  const weightKg = kg ? Number(kg)
    : lbLabelled ? Number((Number(lbLabelled) / 2.20462).toFixed(1))
    : titleKg ? Number(titleKg[1])
    : titleLb ? Number((Number(titleLb[1]) / 2.20462).toFixed(1))
    : null;

  /* When a row fails, the useful evidence is the neighbourhood of the word we
     could not parse — not the first 150 characters of the page, which on some
     themes is a cookie notice. */
  const near = (re) => {
    const m = text.match(re);
    return m ? text.slice(Math.max(0, m.index - 60), m.index + 90) : null;
  };

  /* ---- price ----------------------------------------------------------

     The first version took `.price` textContent and produced "Regular price
     $1,499.00": the label came along because Shopify keeps it in a
     screen-reader span, and on a sale item the same block holds BOTH the
     compare-at and the sale price. Taking whichever came first was a coin
     flip, and the losing side of that flip prints a rival vendor as more
     expensive than it is — which flatters the vendor we earn commission from.
     That is the one error this site's positioning cannot survive, so the
     parse is explicit about which number a buyer actually pays, and reports
     nothing at all when it cannot tell. */
  const priceInfo = (() => {
    const NONE = { raw: null, value: null, was: null, currency: null };

    /* Scope to the product first. A bare document.querySelector(".price")
       will happily return the price of a "recently viewed" tile, and a price
       attached to the wrong doll is worse than no price. */
    const scope = document.querySelector(
      ".summary, .product__info-wrapper, [id^='ProductInfo'], .product-single__meta, main"
    ) || document.body;
    const box = scope.querySelector(".price, .price__container, .product__price, .product-price")
      || scope.querySelector(".woocommerce-Price-amount");
    if (!box) return NONE;

    const money = (s) => {
      const m = String(s || "").replace(/\u00a0/g, " ").match(/(\d[\d,]*(?:\.\d{1,2})?)/);
      if (!m) return null;
      const v = Number(m[1].replace(/,/g, ""));
      return Number.isFinite(v) && v > 0 ? v : null;
    };

    /* The same innerText trap as cloneNode, from the other direction: an
       element hidden with display:none is not rendered either, so innerText
       returns its textContent. Shopify's Dawn theme emits BOTH the regular
       and the sale price block on every product and hides the inapplicable
       one — so without this check a full-price doll reads back the hidden
       sale block, and a discounted one reads back the hidden regular price.
       Nothing hidden is allowed to contribute a number. */
    const rendered = (el) => !!el && el.getClientRects().length > 0;
    const seen = (el) => (rendered(el) ? el.innerText || "" : "").replace(/\s+/g, " ").trim();
    const firstShown = (sel) => Array.from(box.querySelectorAll(sel)).find(rendered) || null;

    const raw = seen(box);
    if (!raw) return NONE;

    const symbol = raw.match(/US\$|[$£€]|\b(?:USD|GBP|EUR|CAD|AUD)\b/i);
    const currency = symbol
      ? ({ "US$": "USD", "$": "USD", "£": "GBP", "€": "EUR" }[symbol[0]] || symbol[0].toUpperCase())
      : null;

    /* The struck-through was-price, wherever the theme puts it: <del> in
       WooCommerce, <s class="price-item--regular"> in Shopify's Dawn. */
    const wasText = seen(firstShown("del, s, [class*='compare-at']"));
    const was = wasText ? money(wasText) : null;

    /* The charged price: <ins> in WooCommerce, .price-item--sale in Dawn. */
    let value = money(seen(firstShown("ins, .price-item--sale")));

    if (value === null) {
      /* Not on sale, or the theme marks it some other way. Subtract the
         was-price text and the labels from what is visibly rendered, then
         read what remains. String subtraction, not cloneNode — see the note
         at the top of this file. */
      let rest = raw;
      if (wasText) rest = rest.split(wasText).join(" ");
      rest = rest
        .replace(/regular price|sale price|unit price|from\b/gi, " ")
        .replace(/\bper\b.*$/i, " ");
      value = money(rest);
    }

    /* Refuse rather than guess. A was-price at or below the charged price
       means the two were swapped or the block held something that is not a
       price at all. */
    if (was !== null && value !== null && was <= value) {
      return { raw: raw.slice(0, 60), value: null, was: null, currency };
    }

    return { raw: raw.slice(0, 60), value, was, currency };
  })();

  /* ---- what the price includes ---------------------------------------

     Two distributors' prices are not comparable until this is known. One of
     them advertises standing feet, gel breasts and an EVO skeleton at no
     charge; if the other charges for all three, the cheaper sticker is the
     more expensive doll. Publishing the sticker comparison without this would
     be a true number arranged into a false claim.

     So this captures evidence, not verdicts: the term found, and the sentence
     it was found in. "Free shipping … wig" will land here as a candidate and
     a human will throw it out. That asymmetry is deliberate — a missed
     inclusion costs a review pass, an invented one costs the positioning. */
  const inclusionsClaimed = (() => {
    const TERMS = [
      ["standing feet", /standing\s*(?:feet|foot)/i],
      ["gel breast", /gel\s*(?:breast|boob|chest)/i],
      ["gel butt", /gel\s*(?:butt|buttock|hip)/i],
      ["EVO skeleton", /\bevo\b[^.]{0,25}skeleton|skeleton[^.]{0,25}\bevo\b/i],
      ["extra head", /(?:extra|second|additional|spare)\s*head\b/i],
      ["wig", /\bwigs?\b/i],
      ["outfit", /\b(?:outfit|lingerie|clothing|costume)\b/i],
      ["heating", /\bheat(?:ing|ed|er)\b/i],
      ["voice / moaning", /\b(?:moaning|voice\s*(?:box|system)|sound\s*system)\b/i],
      ["shrugging shoulders", /(?:shrug\w*|articulated)\s*shoulder/i],
      ["removable insert", /(?:removable|detachable)\s*(?:vagina|insert)/i],
      ["cleaning kit", /clean\w*\s*(?:kit|tool|set)|irrigator|douche/i],
      ["storage", /storage\s*(?:bag|case|box)|hanging\s*kit/i],
    ];
    /* "Free" has to be in the SAME SENTENCE as the term, not merely nearby.
       A fixed character window read "…complimentary gel breast upgrade.
       Storage bag sold separately." and reported storage as included, because
       the window reached back across the full stop into the previous claim.
       Sentence bounds, not character counts. */
    const FREE = /\b(free|included?|complimentary|gift|bonus|comes with|no extra charge)\b/i;
    /* And an explicit denial inside that sentence overrides the word "free"
       appearing in it — "free shipping, storage case sold separately" is a
       denial, not a claim. */
    const NOT_INCLUDED = /\b(sold separately|not included|optional|extra cost|extra charge|additional cost|add[- ]?on|available for purchase|upgrade for)\b/i;

    const sentenceAround = (index) => {
      const left = text.slice(Math.max(0, index - 220), index);
      const right = text.slice(index, index + 220);
      const start = Math.max(left.lastIndexOf("."), left.lastIndexOf("!"), left.lastIndexOf("?"),
                             left.lastIndexOf(";"), left.lastIndexOf("•"), left.lastIndexOf("|"));
      const endRel = right.search(/[.!?;•|]/);
      return (left.slice(start + 1) + (endRel === -1 ? right : right.slice(0, endRel + 1))).trim();
    };

    const out = [];
    for (const [term, re] of TERMS) {
      const m = text.match(re);
      if (!m) continue;
      const sentence = sentenceAround(m.index);
      if (!FREE.test(sentence)) continue;
      if (NOT_INCLUDED.test(sentence)) continue;
      out.push({ term, evidence: sentence });
    }
    return out;
  })();

  return {
    title,
    sample: text.slice(0, 220),
    inclusionsClaimed,
    heightCm,
    weightKg,
    material: /silicone/i.test(text) ? (/tpe/i.test(text) ? "hybrid?" : "silicone")
      : /tpe/i.test(text) ? "tpe" : null,
    priceRaw: priceInfo.raw,
    price: priceInfo.value,
    priceWas: priceInfo.was,
    priceCurrency: priceInfo.currency,
    nearWeight: near(/weight/i) || near(/\d\s*(?:kgs?|lbs?)\b/i),
  };
}
