// Client beacon endpoint (added 2026-08-19): the real-reader line. A row here
// means JavaScript actually ran, which no crawler in the server-side log does.
// Privacy: no cookies, no identifiers, no IP, referrer reduced to its host.
// Always answers 204 — a broken binding must cost a data point, never a page.
// The lang column used to be the constant 'en' — every /de/ /zh/ /th/ row was
// logged as English, and the "该语言 28 天真人 pv ≥ 德语区" upgrade line read a
// constant. Derived from the path, exactly like the URL layout itself.
import {COLLECTOR_EVENTS, collectorEventAllowed, measurableRequest, qaURL} from '../../lib/collector-measurement.js';
export function langOf(path) {
  const m = /^\/(de|zh|th)(\/|$)/.exec(path || '');
  return m ? m[1] : 'en';
}

export async function onRequestPost(ctx) {
  try {
    if (!measurableRequest(ctx.request)) return new Response(null, {status:204});
    const origin = ctx.request.headers.get('origin');
    if (origin && origin !== 'https://thedollscout.com' || ctx.request.headers.get('sec-fetch-site') === 'cross-site') return new Response(null, {status:204});
    if (Number(ctx.request.headers.get('content-length')) > 2048) return new Response(null, {status:204});
    let body = {};
    try { const raw = await ctx.request.text(); if (raw.length > 2048) return new Response(null, {status:204}); body = JSON.parse(raw); } catch (e) {}
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['p','e','r'].includes(k))) return new Response(null, {status:204});
    const path = String(body.p || '').split('?')[0].slice(0, 120);
    if (!path.startsWith('/') || !ctx.env.HITS) return new Response(null, { status: 204 });
    if (qaURL('https://thedollscout.com'+String(body.p))) return new Response(null, {status:204});
    let ref = '';
    try { ref = body.r ? new URL(body.r).hostname.slice(0, 60) : ''; } catch (e) {}
    // Unknown event names are dropped, not stored — an open-name endpoint is
    // write-anything storage, and the table stays honest by refusing it.
    const ALLOWED = new Set(['', 'affiliate_click', 'price_check', 'odds_calc', 'cost_calc', 'checker_use', 'finder_use', 'lookup_use', 'collection_save', 'collection_export', 'collection_import', 'display_calc', 'collector_video_request', 'collector_video_tool','collector_budget_calc','collector_progress_calc','collector_series_calc','collector_series_save','collector_series_export','collector_mcp_copy','collector_swap_print_request','collector_swap_link_copy']);
    if (body.e && !ALLOWED.has(body.e)) return new Response(null, { status: 204 });
    if (COLLECTOR_EVENTS.has(body.e) && (body.p !== path || !collectorEventAllowed(body.e, path))) return new Response(null, {status:204});
    // These are player requests and tool-link clicks, never watch time or completed plays.
    if (body.e?.startsWith('collector_video_') && !['/','/de/','/zh/'].includes(path)) return new Response(null, {status:204});
    if(body.e==='collector_budget_calc'&&!/^\/(?:de\/|zh\/)?collecting\/budget$/.test(path))return new Response(null,{status:204});
    if(body.e==='collector_progress_calc'&&!/^\/(?:de\/|zh\/)?collecting\/duplicates$/.test(path))return new Response(null,{status:204});
    if(['collector_series_calc','collector_series_save'].includes(body.e)&&!/^\/(?:de\/|zh\/)?series\/(?:smiski|sonny-angel)-[a-z0-9-]+$/.test(path))return new Response(null,{status:204});
    if(body.e?.startsWith('collector_swap_')&&(body.p!==path||!/^\/(?:de\/|zh\/)?collecting\/trading-meetup-checklist$/.test(path)))return new Response(null,{status:204});
    const ev = body.e || '';
    const lang = langOf(path);
    const d = new Date().toISOString().slice(0, 10);
    const country = (ctx.request.headers.get('cf-ipcountry') || '').slice(0, 2);
    ctx.waitUntil(
      ctx.env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
        .bind(d, path, lang, country, ref, ev)
        .run().catch(() => {})
    );
  } catch (e) { /* fail silent by design */ }
  return new Response(null, { status: 204 });
}
