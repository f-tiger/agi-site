// These exact public files are byte-identical across all four host directories.
export const sharedAssets=[
  "acquisition.mjs",
  "core.mjs",
  "styles.css",
  "onboarding.mjs",
  "ui.mjs",
  "fonts/manrope-latin-wght-normal.woff2",
  "fonts/LICENSE"
];
export const assetHeaders=()=>`/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; frame-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`+sharedAssets.map(path=>'\n/'+path+'\n  Cache-Control: public, max-age=300\n  X-Fleet-Asset-Delivery: static\n').join('');
