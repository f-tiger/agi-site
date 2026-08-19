/* Generates the brand and import-rules landing pages from JSON content files,
   so adding a brand or a country later means adding one JSON entry — the page,
   its schema, its share row and its sitemap entry all follow automatically.
   Run: node scripts/build-pages.mjs   (wired into the deploy workflow) */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const SITE = "https://thedollscout.com";
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Prose from content/*.json carries a little inline emphasis, and esc() was
   turning it into visible "&lt;strong&gt;" on the page. Five of the eleven
   country pages were shipping literal tags to readers, the US and UK ones
   among them.

   Escaping everything first and restoring a fixed set afterwards keeps the
   safety property that matters: anything not on this list — a stray script
   tag, an attribute, an unclosed element — still comes out inert. Use this for
   body prose only. Attributes and <title> keep plain esc(), where markup is
   never wanted and would break the document. */
const RICH_TAGS = ["strong", "em", "b", "i", "code", "br"];
const rich = (s) => {
  let out = esc(s);
  for (const t of RICH_TAGS) {
    out = out.replace(new RegExp(`&lt;(/?)${t}&gt;`, "g"), `<$1${t}>`);
    out = out.replace(new RegExp(`&lt;${t}\\s*/&gt;`, "g"), `<${t}>`);
  }
  return out;
};

const NAV = (active) =>
  [["/quiz.html", "60-Sec Finder"], ["/scam-check.html", "Scam-Check"],
   ["/cost-calculator.html", "True Cost"], ["/after-you-order.html", "After You Order"],
   ["/importing/", "Importing"],
   ["/guides/", "Guides"], ["/picks.html", "Vetted Picks"]]
    .map(([h, l]) => `      <a href="${h}"${h === active ? ' class="active"' : ""}>${l}</a>`)
    .join("\n");

function page({ url, title, description, ogImage, nav, schema, body, shareText, shareNote }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<!-- No rating tag here. Everything this generator writes is a national
     import-law summary, which contains no sexually explicit content and so
     does not meet the condition the SafeSearch label is defined for. The
     labelling decision for every page lives in scripts/adult-labels.mjs and is
     applied by build-adult-labels.mjs; hard-coding the tag here would have
     re-labelled all twelve of these pages on the next deploy and silently
     reverted that decision. The 18+ age gate is unaffected — it is injected by
     js/main.js, which every page loads. -->
<link rel="canonical" href="${SITE}${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="DollScout">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/img/og/${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/img/og/${ogImage}">
<link rel="stylesheet" href="/css/main.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>">
<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="notice-bar">🛡️ <b>Evidence-standard buyer's guide.</b> Every number sourced — or marked unverified. We sell nothing ourselves. 18+ only.</div>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/">Doll<b>Scout</b></a>
    <button class="nav-toggle" aria-label="Menu">☰</button>
    <nav class="nav">
${nav}
    </nav>
  </div>
</header>

<main id="main" tabindex="-1">
<section>
  <div class="wrap prose">
${body}
    <div class="share" data-share data-share-text="${esc(shareText)}" data-share-url="${url}" data-share-note="${esc(shareNote)}"></div>
  </div>
</section>
</main>

<footer class="site-footer">
  <div class="wrap">
    <p class="disclosure">
      <strong>18+ only.</strong> Adult products for adults; we exclusively feature products depicting adults. We refuse to review, link to, or accept commissions on any product with a childlike appearance.
      <strong>Affiliate disclosure:</strong> DollScout earns disclosed referral commissions from vetted vendors linked on this site. Commissions never change rankings. Brand names are the trademarks of their owners; we are not affiliated with any manufacturer.
      · <a href="/trust.html">Methodology</a> · <a href="/legal/affiliate-disclosure.html">Disclosure</a> · <a href="/legal/privacy.html">Privacy</a> · © <span id="year"></span> DollScout
    </p>
  </div>
</footer>
<script src="/js/config.js"></script>
<script src="/js/analytics.js"></script>
<script src="/js/main.js"></script>
<script src="/js/search.js" defer></script>
<script src="/js/share.js"></script>
</body>
</html>
`;
}

const org = { "@type": "Organization", "@id": SITE + "/#org", name: "DollScout", url: SITE + "/" };

/* Article dates. Deliberately a constant rather than build time: this script
   runs on every deploy, so stamping dateModified with "today" would advertise
   freshness the content does not have. Bump this by hand when the content
   actually changes. For a site whose flagship claim is a dated regulatory
   correction, a date that cannot be trusted is worse than no date. */
const CONTENT_DATE = "2026-07-26";
const dated = (o) => ({ ...o, datePublished: CONTENT_DATE, dateModified: CONTENT_DATE });
const crumbs = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, u], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + u })),
});

const list = (arr) => (arr && arr.length ? "<ul>\n" + arr.map((x) => `      <li>${x}</li>`).join("\n") + "\n    </ul>" : "");
const sources = (arr) =>
  arr && arr.length
    ? `<p class="meta">Sources: ` +
      arr.map((s) => `<a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.label)}</a>`).join(" · ") +
      `</p>`
    : "";

/* ---------------- brands ---------------- */
function buildBrands(brands) {
  mkdirSync("brands", { recursive: true });
  for (const b of brands) {
    const url = `/brands/${b.slug}.html`;
    const title = `${b.name}: authenticity checks, prices and what buyers should know — DollScout`;
    const description = `How to verify a genuine ${b.name} doll, what the brand actually makes, realistic price ranges, and how to tell an authorised reseller from a counterfeit shop.`;
    const body = `    <p class="breadcrumb"><a href="/brands/">Brands</a> / ${esc(b.name)}</p>
    <h1>${esc(b.name)}: how to buy one without getting a fake</h1>
    <p class="meta">${esc(b.tagline)}</p>

    <div class="callout${b.verification ? "" : " warn"}">
      <strong>${b.verification ? "Authenticity check:" : "No published authenticity check:"}</strong>
      ${b.verification
        ? esc(b.verification)
        : `we could not confirm a buyer-facing verification system for ${esc(b.name)}. Treat any "authenticity certificate" from a shop as unverified, and rely on the <a href="/scam-check.html">10-point Scam-Check</a> plus a factory-photo approval before dispatch.`}
    </div>

    <h2>What ${esc(b.name)} actually makes</h2>
    ${list(b.makes)}

    <h2>Realistic pricing</h2>
    <p>${esc(b.pricing)}</p>
    <p><strong>Price sanity rule:</strong> legitimate vendors sit roughly 10–15% below factory list price. A ${esc(b.name)} doll offered at half the going rate is a counterfeit signal, not a bargain — see the <a href="/scam-check.html">Scam-Check</a>.</p>

    <h2>Telling an authorised reseller from a counterfeit shop</h2>
    ${list(b.authorized)}

    <h2>What owners criticise</h2>
    ${list(b.criticism)}

    <div class="callout">
      <strong>Before you pay anywhere:</strong> require photos of <em>your</em> doll from the factory before dispatch, pay with PayPal or a credit card, and run the <a href="/scam-check.html">2-minute Scam-Check</a>. Those three habits prevent nearly every horror story in this niche.
    </div>

    <p><a class="btn" data-yd="${esc(b.search)}" href="#">Browse ${esc(b.name)} listings at our vetted vendor →</a></p>
    <p class="meta">Disclosure: that link earns us a commission at no extra cost to you, and only points at a vendor that passed <a href="/trust.html">all ten checks</a>. We are not affiliated with ${esc(b.name)}.</p>

    <h2>Keep reading</h2>
    <div class="grid c2" style="margin-top:18px">
      <a class="card" href="/scam-check.html"><h3>The 2-Minute Scam-Check</h3><p>Ten checks that identify counterfeit shops before they take your money.</p></a>
      <a class="card" href="/guides/tpe-vs-silicone.html"><h3>TPE vs Silicone</h3><p>The material decision, settled in one question.</p></a>
      <a class="card" href="/quiz.html"><h3>60-Second Doll Finder</h3><p>Six questions, one specific recommendation.</p></a>
      <a class="card" href="/brands/"><h3>All brands</h3><p>Every factory we cover, with its verification method.</p></a>
    </div>
    ${sources(b.sources)}`;

    writeFileSync(
      "brands/" + b.slug + ".html",
      page({
        url, title, description, ogImage: "og-picks.png", nav: NAV("/brands/"),
        schema: { "@context": "https://schema.org", "@graph": [org, crumbs([["Home", "/"], ["Brands", "/brands/"], [b.name, url]]),
          { "@type": "Article", headline: `${b.name}: authenticity checks and buyer guidance`, description, url: SITE + url,
            publisher: { "@id": SITE + "/#org" }, author: { "@id": SITE + "/#org" }, inLanguage: "en" }] },
        body,
        shareText: `How to verify a genuine ${b.name} doll — and spot the counterfeits`,
        shareNote: "Counterfeit shops rely on buyers not knowing this. Pass it on.",
      })
    );
    console.log("brands/" + b.slug + ".html");
  }

  const cards = brands
    .map((b) => `      <a class="card" href="/brands/${b.slug}.html"><h3>${esc(b.name)}</h3><p>${esc(b.tagline)}</p></a>`)
    .join("\n");
  writeFileSync(
    "brands/index.html",
    page({
      url: "/brands/", title: "Doll factory brands: who makes what, and how to verify it — DollScout",
      description: "The factories behind the catalogues — WM, Irontech, Zelex, Starpery and more — with each brand's authenticity check and how to spot a counterfeit reseller.",
      ogImage: "og-picks.png", nav: NAV("/brands/"),
      schema: { "@context": "https://schema.org", "@graph": [org, crumbs([["Home", "/"], ["Brands", "/brands/"]])] },
      body: `    <h1>Factory brands, and how to verify one</h1>
    <p class="meta">Nearly every doll shop resells the same handful of Chinese factory catalogues. Knowing which factory made a doll — and how that factory lets you verify it — is the difference between a genuine purchase and a counterfeit.</p>
    <div class="grid c2" style="margin-top:26px">
${cards}
    </div>
    <div class="callout" style="margin-top:34px">
      <strong>Whichever brand you choose:</strong> run the <a href="/scam-check.html">10-point Scam-Check</a> on the shop, require factory photos of your doll before dispatch, and pay with PayPal or a credit card.
    </div>`,
      shareText: "Doll factory brands and how to verify a genuine one",
      shareNote: "Knowing the factory is how you avoid a counterfeit.",
    })
  );
  console.log("brands/index.html");
}

/* ---------------- import rules ---------------- */
function buildImporting(countries) {
  mkdirSync("importing", { recursive: true });
  for (const [idx, c] of countries.entries()) {
    const url = `/importing/${c.slug}.html`;
    /* Each destination links to the next three in the list, wrapping around.
       The list is ordered regionally, so these read as neighbours — and
       because every country appears in exactly three others' blocks, no page
       is left with the hub as its only inbound link. Before this, four of the
       Asian pages had exactly one. */
    const neighbours = [1, 2, 3].map((n) => countries[(idx + n) % countries.length]);
    const alsoCheck = `
    <h2>Other destinations we've checked</h2>
    <div class="grid c2" style="margin-top:18px">
${neighbours
  .map((n) => `      <a class="card" href="/importing/${n.slug}.html"><h3>${esc(n.country)}</h3><p>${esc(n.short)}</p></a>`)
  .join("\n")}
    </div>
`;
    // Titles are kept under ~60 characters and lead with the query, because
    // anything longer is truncated in search results and the tail is wasted.
    /* "into United Kingdom" reads wrong, and this string is the SERP title. */
    const into = /^(United |Netherlands|Philippines|UAE|Czech )/.test(c.country)
      ? `the ${c.country}` : c.country;
/* The lead answer for a country page: 40-60 words, assembled from that
   country's own record so it cannot contradict the sections below.

   Deliberately NOT a marketing summary. It states the two things a person
   actually came for — may an adult import one, and what will it cost at the
   border — plus the prohibition that applies everywhere, and it preserves the
   hedge: we publish "no prohibition identified", never "legal", because a
   search that found nothing is not a permission. Strip the sentence out of
   the page and it is still true and still complete. */
function answerFor(c, into) {
  /* Built on the country's OWN summary, not a template.

     The first version generated the status sentence from the legalOk boolean,
     and it was wrong for four countries. legalOk is a coarse flag: Canada is
     "legal UNLESS classified as obscene under Tariff Item 9899.00.00",
     Singapore is "no statute bans it BUT an officer can still classify it",
     New Zealand is "lawful in principle, but the seizure standard is broader
     and vaguer". All three are legalOk: true, and a generated "we found no
     provision prohibiting this" flattened the condition that is the entire
     point of the page. Flattening a legal caveat into a clean yes is the exact
     failure this site exists to argue against, so the hand-written per-country
     line carries the substance and the generator only adds what is invariant. */
  const duty = /not able to verify|could not verify/i.test(c.duty || "")
    ? "We could not verify current duty figures to this page's standard, so none are published"
    : "Duty and import-tax treatment is set out below with its source";
  return `${String(c.short).replace(/\s*$/, "").replace(/\.?$/, ".")} ${duty}. Childlike dolls are prohibited regardless, with serious criminal penalties. Verify with customs in ${into} before ordering; this is not legal advice.`;
}

    /* The literal question, because that is what gets matched and cited.
       agiscorecard.com's cited pages are named for the question — what-is-agi,
       when-will-agi-arrive, how-close-is-agi — while ours were noun phrases
       ("Importing a Sex Doll into X: Law & Duty"). The URL is NOT being changed
       to match: Google is mid-recrawl from the canonical-URL migration two days
       ago and a second one now would be actively harmful. Title and H1 carry
       most of the matching signal and cost nothing to change. */
    const title = `Is it legal to import a sex doll into ${into}?`;
    const description = `Is it legal for an adult to import a doll into ${into}? Duty and tax treatment, how customs handles these shipments, and the penalties to avoid.`;
    const body = `    <p class="breadcrumb"><a href="/importing/">Importing</a> / ${esc(c.country)}</p>
    <h1>Is it legal to import an adult doll into ${esc(into)}?</h1>
    <!-- A self-contained answer, assembled from this country's own record.
         An answer engine lifts a PASSAGE, not a page: a reader's question is
         answered here in one paragraph that still makes sense with everything
         around it deleted. It is written from the same fields the sections
         below expand on, so it cannot drift from them, and it says "no
         prohibition identified" rather than "legal" because that is what the
         sourcing actually supports. -->
    <p class="lede answer">${rich(answerFor(c, into))}</p>
    <p class="meta">General information for adult buyers, not legal advice. Rules change — verify current requirements with ${esc(c.country)} customs before ordering.</p>

    <div class="callout${c.legalOk ? "" : " warn"}">
      <strong>Status:</strong> ${rich(c.status)}
    </div>

    <h2>What will you pay in tax and duty?</h2>
    <p>${rich(c.duty)}</p>

    <h2>What does customs actually do with these shipments?</h2>
    <p>${rich(c.customs)}</p>

    <h2>What is prohibited regardless of anything else?</h2>
    <p>${rich(c.childlike)}</p>
    <p>DollScout exclusively covers adult-form products. We refuse to review, link to, or earn commission on any product with a childlike appearance, and we drop vendors that stock them.</p>

    ${c.notes && c.notes.length ? `<h2>Practical notes for buyers</h2>\n    ${list(c.notes)}` : ""}

    <h2>How we sourced this — and what we could not confirm</h2>
    <p>This page is built from government, customs and court sources, linked at the bottom. We could not open every primary statute directly, so treat section numbers and rates as a starting point for your own check rather than the last word. ${c.gaps ? rich(c.gaps) : ""} Customs rules and criminal statutes both change; the date on a source matters. If you find something here that is out of date or wrong, tell us and we will correct it and say so — that is the standard we hold vendors to, so it applies to us first.</p>

    <div class="callout">
      <strong>Whatever your destination:</strong> the <a href="/guides/discreet-shipping.html">shipping and privacy guide</a> covers what the crate looks like, what your card statement says, and what to do if a shipment arrives damaged. The <a href="/cost-calculator.html">True Cost Calculator</a> folds import tax into your real first-year total.
    </div>

${alsoCheck}
    <h2>Keep reading</h2>
    <div class="grid c2" style="margin-top:18px">
      <a class="card" href="/guides/import-costs-2026.html"><h3>What Customs Now Costs (2026)</h3><p>The $800 duty-free rule died in 2025. What replaced it.</p></a>
      <a class="card" href="/guides/discreet-shipping.html"><h3>Discreet Shipping &amp; Customs</h3><p>What the box looks like and how customs treats it.</p></a>
      <a class="card" href="/cost-calculator.html"><h3>True Cost Calculator</h3><p>Import tax folded into your real first-year cost.</p></a>
      <a class="card" href="/importing/"><h3>All destinations</h3><p>Country-by-country import rules.</p></a>
    </div>
    ${sources(c.sources)}`;

    writeFileSync(
      "importing/" + c.slug + ".html",
      page({
        url, title, description, ogImage: "og-guides.png", nav: NAV("/guides/"),
        schema: { "@context": "https://schema.org", "@graph": [org, crumbs([["Home", "/"], ["Importing", "/importing/"], [c.country, url]]),
          dated({ "@type": "Article", headline: `Importing an adult doll into ${into}`, description, url: SITE + url,
            publisher: { "@id": SITE + "/#org" }, author: { "@id": SITE + "/#org" }, inLanguage: "en" })] },
        body,
        shareText: `Importing an adult doll into ${into}: legality, duty and customs`,
        shareNote: "Worth checking before you order, not after.",
      })
    );
    console.log("importing/" + c.slug + ".html");
  }

  const rows = countries
    .map((c) => `        <tr><td><a href="/importing/${c.slug}.html">${esc(c.country)}</a></td><td>${esc(c.short)}</td></tr>`)
    .join("\n");
  writeFileSync(
    "importing/index.html",
    page({
      url: "/importing/", title: "Sex Doll Import Rules by Country: Legality & Duty",
      description: "Country-by-country import rules for adult dolls: legality for private buyers, duty and VAT, seizure risk, and prohibitions that carry criminal penalties.",
      ogImage: "og-guides.png", nav: NAV("/guides/"),
      schema: { "@context": "https://schema.org", "@graph": [org, crumbs([["Home", "/"], ["Importing", "/importing/"]])] },
      body: `    <h1>Importing an adult doll, by country</h1>
    <p class="meta">The question buyers ask after they've paid, when they should ask it before. General information, not legal advice — verify current rules with your own customs authority.</p>
    <table style="margin-top:24px">
      <tr><th>Destination</th><th>Short answer</th></tr>
${rows}
    </table>
    <div class="callout warn" style="margin-top:30px">
      <strong>Universal prohibition:</strong> every jurisdiction covered here bans childlike dolls, several with specific criminal statutes. DollScout exclusively covers adult-form products and reports vendors that stock anything otherwise.
    </div>`,
      shareText: "Importing an adult doll by country: legality, duty and customs",
      shareNote: "Check before ordering, not after it's seized.",
    })
  );
  console.log("importing/index.html");
}

if (existsSync("content/brands.json"))
  buildBrands(JSON.parse(readFileSync("content/brands.json", "utf8")));
if (existsSync("content/importing.json"))
  buildImporting(JSON.parse(readFileSync("content/importing.json", "utf8")));
