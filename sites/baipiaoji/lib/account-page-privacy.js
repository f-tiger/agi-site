// Platform-injected scripts must obey the same private-page boundary as GA4.
// Keep GIS and the local account UI available; do not change public analytics.
export const ACCOUNT_SCRIPT_POLICY = "script-src 'self' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com https://ssl.gstatic.com";
export function protectAccountPage(response, request) {
  const path = new URL(request.url).pathname;
  if (!/^\/(?:en\/)?account(?:\.html|\/)?$/.test(path)) return response;
  if (!response.headers.get('Content-Type')?.includes('text/html')) return response;
  const result = new Response(response.body, response);
  result.headers.append('Content-Security-Policy', ACCOUNT_SCRIPT_POLICY);
  result.headers.set('Cache-Control', 'no-store');
  // Encoded account aliases may not match the exact static _headers rules.
  result.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return result;
}
