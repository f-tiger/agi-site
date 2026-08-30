/* Central affiliate + site config. Edit here only.
   2026-08-30 pivot: the adult-doll site was retired by owner decision; this
   domain now runs the Labubu buyer's guide. Same D1 database, same beacon,
   same Amazon Associates tag (thedollscout.com is on the US Associates
   websites list as of 2026-08-28). */
window.DS_CONFIG = {
  siteName: "DollScout",
  // Amazon Associates tags, per marketplace (owner 2026-08-30: 「联盟id用我的
  // 德国和美国id，分别做多语言」). EN pages link amazon.com with the US tag;
  // /de/ pages link amazon.de with the DE tag. Links are baked static in the
  // HTML — these entries document the contract and serve any future JS use.
  // NEVER cross them: a .de link with the US tag (or vice versa) earns nothing.
  amazonTagUS: "ecoback0d-20",
  amazonTagDE: "getecoback-21",
  // Google Analytics 4 measurement ID. Empty = analytics fully disabled.
  // Runs cookieless (see js/analytics.js) so no consent banner is required.
  ga4Id: "G-2SEHFY33H8"
};
