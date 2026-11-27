// Platform-injected scripts must obey the same private-page boundary as GA4.
// Keep GIS and the local account UI available; do not change public analytics.
export const ACCOUNT_SCRIPT_POLICY = "script-src 'self' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com https://ssl.gstatic.com";
const TRADE_KEYS_POLICY = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
export const isTradeMcpKeysPage = path => /^\/(?:en\/)?studio\/trade-tools\/mcp\/keys(?:\/index\.html|\.html|\/)?$/i.test(path);

export function protectAccountPage(response, request) {
  const path = new URL(request.url).pathname;
  const keys = isTradeMcpKeysPage(path);
  if (!keys && !/^\/(?:en\/)?account(?:\.html|\/)?$/.test(path)) return response;
  if (!response.headers.get('Content-Type')?.includes('text/html')) return response;
  const result = new Response(response.body, response);
  result.headers.append('Content-Security-Policy', keys ? TRADE_KEYS_POLICY : ACCOUNT_SCRIPT_POLICY);
  result.headers.set('Cache-Control', 'no-store');
  // Encoded account aliases may not match the exact static _headers rules.
  result.headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (keys) {
    result.headers.set('Referrer-Policy', 'no-referrer');
    result.headers.set('X-Frame-Options', 'DENY');
    result.headers.set('X-Content-Type-Options', 'nosniff');
  }
  return result;
}
