/* Central affiliate + site config. Edit here only. */
window.DS_CONFIG = {
  siteName: "DollScout",
  // YourDoll affiliate tracking — appended to every yourdoll.com link automatically (see main.js).
  // This is the CASH-commission affiliate program param (?ref=), not the points-based
  // Rewards Club param (?wlr_ref=REF-V12-ZP6).
  yourdollRefParam: "ref",
  yourdollRef: "Edison Thomas",
  yourdollBase: "https://www.yourdoll.com/",
  // Amazon Associates tag — links in picks pages carry this tag
  amazonTag: "ecoback0d-20",
  // Google Analytics 4 measurement ID (looks like "G-XXXXXXXXXX"). Create a GA4
  // property + Web data stream for thedollscout.com and paste the ID here.
  // Empty = analytics fully disabled, no Google script is ever loaded.
  // Runs cookieless (see js/analytics.js) so no consent banner is required.
  ga4Id: "G-2SEHFY33H8",
  // Newsletter endpoint — replace with your provider's form action
  // (e.g. Buttondown / MailerLite / ConvertKit form URL). Empty = local demo mode.
  newsletterAction: "",
  // Real product photos, hotlinked from the vendor we promote (standard affiliate
  // practice — their own affiliate creatives hotlink the same way). Paste image
  // URLs from yourdoll.com product pages; empty entries fall back to our artwork.
  // Keys map to data-photo-key attributes on the product cards.
  productPhotos: {
    "banner":           "",  // home: featured vendor banner
    "torso":            "",  // torso cards (home small-space + picks first-timer)
    "compact-tpe":      "",  // picks: compact TPE
    "silicone":         "",  // silicone cards (home + picks)
    "brand":            "",  // picks: brand-name (WM/Irontech/Zelex/Starpery)
    "male":             "",  // picks: male dolls
    "accessories":      "",  // picks: care & storage essentials
    "amz-care":         "",  // amazon: care kit
    "amz-storage":      "",  // amazon: storage case
    "amz-torso":        ""   // amazon: entry torso
  }
};

/* Helper: build a YourDoll link with the affiliate ref.
   path examples: "" (home), "?s=silicone+doll&post_type=product" (search) */
window.ydLink = function (path) {
  var url = new URL(path || "", window.DS_CONFIG.yourdollBase);
  url.searchParams.set(window.DS_CONFIG.yourdollRefParam, window.DS_CONFIG.yourdollRef);
  return url.toString();
};
