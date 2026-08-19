/* The distributor registry.

   The category's structure is the reason this file exists: roughly ten
   factories make nearly every doll sold, they mostly do not sell direct, and
   dozens of distributors resell the identical model at materially different
   prices. Buyers cannot see that spread, because distributors will not publish
   it (it shows when they are not cheapest) and affiliate sites will not either
   (an honest table routes the reader to a shop they do not earn from).

   We publish it anyway — including the rows where the vendor we earn from
   loses. That is the whole position. See content/strategy-cut.md.

   Adding a distributor means adding an entry here. Keep `enabled: false` until
   its selectors have been proven on a real run, because a half-working scraper
   produces confident wrong prices, which is the one error this site cannot
   survive. */

export const VENDORS = [
  {
    id: "yourdoll",
    name: "YourDoll",
    home: "https://www.yourdoll.com/",
    // Our affiliate vendor. Named as such wherever its prices are shown.
    affiliate: true,
    vetted: true,
    enabled: true,
    /* Search paths, relative to home. Popularity alone clusters on whatever is
       selling this week, which is the wrong sample for a reference table — so
       the height bands are searched explicitly too. */
    listings: [
      "?s=doll&post_type=product&orderby=popularity",
      "?s=doll&post_type=product&orderby=popularity&paged=2",
      "?s=140cm+doll&post_type=product",
      "?s=150cm+doll&post_type=product",
      "?s=160cm+doll&post_type=product",
      "?s=165cm+doll&post_type=product",
      "?s=170cm+doll&post_type=product",
      "?s=torso&post_type=product",
    ],
    productLinkSelector: 'a[href*="/product/"]',
  },
  {
    id: "perfectlovedolls",
    name: "Perfect Love Dolls",
    home: "https://perfectlovedolls.com/",
    affiliate: false,
    vetted: false, // never been through our 10-point check — shown, not recommended
    /* Proven on run 31074889877: 94% of visited pages rendered (the first
       attempt reached 27% and was refused), and every page that rendered
       parsed correctly — 30 rows, all with a numeric price and currency. */
    enabled: true,
    listings: [
      "collections/wm-doll",
      "collections/all",
    ],
    productLinkSelector: 'a[href*="/products/"]',
    note:
      "Shopify. Surfaced in a spot check listing WM Doll 156cm at $1,499-1,599 " +
      "against $1,699 elsewhere — the observation that motivated the whole " +
      "comparison build. Advertises free upgrades (standing feet, gel breasts, " +
      "EVO skeleton), so its rows are NOT price-comparable until inclusions are " +
      "captured as well.",
  },
];

/* Factory brands. Model matching across distributors keys on brand + height +
   cup + head code parsed from titles; anything that does not match cleanly
   stays unmatched rather than being guessed into a comparison. */
export const FACTORIES = [
  "WM Doll", "WM", "Irontech", "Zelex", "Starpery", "FunWest",
  "Piper", "SE Doll", "Climax", "Sanhui", "Gynoid", "Elsa Babe",
];

export const enabledVendors = () => VENDORS.filter((v) => v.enabled);
