// Exact public files shared by every host. Never bypass host-dependent pages or private routes.
export const sharedAssets=[
  "app.mjs",
  "catalog.mjs",
  "core.mjs",
  "engine.mjs",
  "finance.mjs",
  "evidence.mjs",
  "planning.mjs",
  "inspection.mjs",
  "profiles.mjs",
  "style.css",
  "mark.svg",
  "runner.mjs",
  "LICENSE.txt",
  "offline-tools.zip",
  "release.json",
  "experience.mjs",
  "hub.mjs",
  "mcp-info.mjs",
  "attribution.mjs",
  "measure.mjs",
  "market-ui.mjs",
  "impact.mjs",
  "research-ui.mjs",
  "research-export.mjs",
  "research-core.mjs",
  "proof-core.mjs",
  "finance-core.mjs",
  "16507d8e1997c4be371f5fbaf7ac1985.txt",
  "active-refresh.mjs"
];
export const staticSecurity={'Content-Security-Policy':"default-src 'none'; script-src 'self'; frame-src 'self'; style-src 'self'; img-src 'self' https://*.agiscorecard.com; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Strict-Transport-Security':'max-age=31536000; includeSubDomains'};
export const assetHeaders=()=>['/*',...Object.entries(staticSecurity).map(([k,v])=>'  '+k+': '+v),'',...sharedAssets.flatMap(path=>['/'+path,'  Cache-Control: public, max-age=300','  X-Fleet-Asset-Delivery: static',''])].join('\n');
