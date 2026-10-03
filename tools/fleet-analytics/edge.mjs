// Only the empty analytics frame may contact Google. Tool documents retain CSP.
export const analyticsFiles = new Set(['consent.mjs','collector.mjs','consent.css','frame.html','frame-loader.mjs','business.mjs','legacy.mjs','campaign.mjs','registry.mjs','coverage.json']);
export function isAnalyticsPath(path) { return path.startsWith('/analytics-assets/') && analyticsFiles.has(path.slice('/analytics-assets/'.length)); }
export async function analyticsResponse(request, env, prefix = '') {
 const url = new URL(request.url);
 if (!isAnalyticsPath(url.pathname)) return new Response('Not found',{status:404});
 if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405});
 const asset = new URL(url); asset.pathname = (prefix ? '/'+prefix : '')+url.pathname; asset.search = '';
 const response = await env.ASSETS.fetch(new Request(asset,{method:request.method}));
 const headers = new Headers(response.headers);
 headers.set('Cache-Control','public, max-age=0, must-revalidate, no-transform');
 headers.set('X-Robots-Tag','noindex, nofollow');
 headers.set('X-Content-Type-Options','nosniff');
 headers.set('Referrer-Policy','no-referrer');
 headers.set('Content-Security-Policy',"default-src 'none'; script-src 'self' https://www.googletagmanager.com; connect-src https://*.google-analytics.com https://analytics.google.com https://www.googletagmanager.com; img-src https://*.google-analytics.com; frame-ancestors 'self'; base-uri 'none'; form-action 'none'");
 headers.set('X-Frame-Options','SAMEORIGIN');
 return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
}
