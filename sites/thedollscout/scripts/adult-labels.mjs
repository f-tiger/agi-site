/* Which pages declare themselves adult, and why — one source of truth for both
   the per-page <meta name="rating"> tag and the Rating: header in _headers.

   WHY THIS EXISTS. Every page on the site carried rating=adult, and _headers
   applied the RTA label to `/*` — so it also covered /data/doll-specs.json,
   /llms.txt, /sitemap.xml and the /mcp endpoint. Google's guidance for explicit
   content is that this tag is for pages with SEXUALLY EXPLICIT CONTENT, and its
   stated purpose is to make sure such a page IS filtered for SafeSearch users.
   Applying it to a page about the Consumer Credit Act, or to a CC BY 4.0 CSV of
   heights and weights, volunteers that page for filtering while satisfying
   nothing the label exists for.

   WHAT THIS IS NOT. It is not an attempt to get adult commerce into unfiltered
   results. The 18+ age gate is untouched and applies site-wide, on every page
   in both lists. The dividing line below is deliberately conservative: anything
   that shows, recommends or sells the product keeps the label, and only pages
   whose subject is law, logistics, data or tooling lose it.

   HOW TO DECIDE for a new page: does the page display or recommend adult
   products? If yes, or if you are unsure, it goes in ADULT_SURFACES. Silence
   is not the safe default here in either direction, so every page must appear
   in exactly one list and the test enforces that. */

/* Pages that show, recommend, or are about the product itself. These keep the
   label. A SafeSearch user not seeing them is the label working as intended. */
export const ADULT_SURFACES = [
  "index.html",
  "picks.html",
  "quiz.html",
  "checklist.html",
  "faq.html",
  "for-creators.html",
  "after-you-order.html",
  "vendors/yourdoll.html",
  "guides/index.html",
  "guides/care-cleaning.html",
  "guides/disposal.html",
  "guides/discreet-shipping.html",
  "guides/factory-photos.html",
  "guides/first-time-buyer.html",
  "guides/glossary.html",
  "guides/height-weight.html",
  "guides/torso-vs-full-size.html",
  "guides/tpe-vs-silicone.html",
  "guides/what-a-doll-costs.html",
  "weight/index.html",
  "weight/150cm.html",
  "weight/160cm.html",
];

/* Pages whose subject is law, customs, money, data or tooling. None of them
   contains sexually explicit content, so none of them meets the condition the
   label is defined for. The reason is recorded per page because "why is this
   one not labelled" is exactly the question a future reader will ask. */
export const NON_EXPLICIT = [
  { page: "payment-protection.html", because: "UK Consumer Credit Act s.75, chargeback rights and the Financial Ombudsman route" },
  { page: "cost-calculator.html", because: "an arithmetic tool for first-year ownership cost" },
  { page: "scam-check.html", because: "a consumer-fraud checklist; the signals are generic to any overseas purchase" },
  { page: "trust.html", because: "our methodology, funding and correction policy" },
  { page: "data/index.html", because: "documentation for a CC BY 4.0 dataset of heights, weights and prices" },
  { page: "mcp.html", because: "API documentation for the callable endpoint" },
  { page: "guides/import-costs-2026.html", because: "customs, duty and import VAT mechanics" },
  { page: "importing/index.html", because: "index of national import-law summaries" },
  { page: "importing/australia.html", because: "national import law" },
  { page: "importing/canada.html", because: "national import law" },
  { page: "importing/germany.html", because: "national import law" },
  { page: "importing/japan.html", because: "national import law" },
  { page: "importing/malaysia.html", because: "national import law" },
  { page: "importing/new-zealand.html", because: "national import law" },
  { page: "importing/singapore.html", because: "national import law" },
  { page: "importing/south-korea.html", because: "national import law" },
  { page: "importing/thailand.html", because: "national import law" },
  { page: "importing/united-kingdom.html", because: "national import law" },
  { page: "importing/united-states.html", because: "national import law" },
  { page: "legal/affiliate-disclosure.html", because: "boilerplate disclosure; already noindex" },
  { page: "legal/privacy.html", because: "boilerplate policy; already noindex" },
  { page: "legal/terms.html", because: "boilerplate policy; already noindex" },
];

export const RTA_LABEL = "RTA-5042-1996-1400-1577-RTA";

/* The URL paths that carry the Rating: header.

   EVERY form a page is reachable at needs its own rule, because _headers
   matches the request path literally and a label attached to only one form
   disappears depending on how the visitor arrived. Cloudflare Pages serves a
   file at its extensionless path too — /picks.html is canonically /picks — so
   a rule written only for /picks.html silently never fires. The live check in
   crawl-check.mjs caught exactly that on /picks and /quiz after the first
   deploy of this file; the local test could not, because nothing on disk knows
   how Pages rewrites URLs. */
export function adultPaths() {
  const out = new Set();
  for (const p of ADULT_SURFACES) {
    out.add("/" + p);
    if (p === "index.html") out.add("/");
    else if (p.endsWith("/index.html")) out.add("/" + p.slice(0, -"index.html".length));
    else out.add("/" + p.replace(/\.html$/, ""));
  }
  return [...out].sort();
}
