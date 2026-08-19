// Client beacon endpoint (added 2026-08-19): the real-reader line. A row here
// means JavaScript actually ran, which no crawler in the server-side log does.
// Privacy: no cookies, no identifiers, no IP, referrer reduced to its host.
// Always answers 204 — a broken binding must cost a data point, never a page.
export async function onRequestPost(ctx) {
  try {
    let body = {};
    try { body = JSON.parse(await ctx.request.text()); } catch (e) {}
    const path = String(body.p || '').split('?')[0].slice(0, 120);
    if (!path.startsWith('/') || !ctx.env.HITS) return new Response(null, { status: 204 });
    let ref = '';
    try { ref = body.r ? new URL(body.r).hostname.slice(0, 60) : ''; } catch (e) {}
    // Unknown event names are dropped, not stored — an open-name endpoint is
    // write-anything storage, and the table stays honest by refusing it.
    const ALLOWED = new Set(['', 'affiliate_click']);
    const ev = ALLOWED.has(body.e) ? body.e : '';
    const d = new Date().toISOString().slice(0, 10);
    const country = (ctx.request.headers.get('cf-ipcountry') || '').slice(0, 2);
    ctx.waitUntil(
      ctx.env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
        .bind(d, path, 'en', country, ref, ev)
        .run().catch(() => {})
    );
  } catch (e) { /* fail silent by design */ }
  return new Response(null, { status: 204 });
}
