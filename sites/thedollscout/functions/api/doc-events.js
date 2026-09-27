// Deliberately bounded metadata only. PDF bytes, names, text, titles, review
// answers, user/session IDs and full referrer URLs are never stored here.
export const EVENTS = new Set(['doc_view', 'doc_start', 'doc_complete', 'doc_partial', 'doc_batch_complete', 'doc_compare_complete', 'doc_text_complete', 'doc_error', 'doc_sample', 'doc_review', 'doc_export', 'doc_share', 'doc_summary_share', 'doc_share_visit']);
for (const event of ['doc_delivery_complete','doc_delivery_sample','doc_delivery_export','doc_delivery_verify']) EVENTS.add(event);
for (const frequency of ['none','few','repeat']) for (const choice of ['team','project','none']) EVENTS.add(`doc_delivery_interest_${frequency}_${choice}`);
for(const event of ['doc_verify_recipient','doc_verify_create','doc_verify_match','doc_verify_mismatch','doc_verify_sample','doc_verify_share','doc_verify_embed','doc_verify_next','doc_delivery_recipient_share']) EVENTS.add(event);
const PAGE = /^\/(?:(de|zh)\/)?(?:verify-file|delivery-evidence|pdf-accessibility-checker|pdf-batch-audit|pdf-to-text|compare-pdf-text|methodology|document-privacy|collectors|learn\/(?:pdf-accessibility-checklist|scanned-pdf-vs-text-pdf|pdf-reading-order))?$/;
const json = (body, status) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
// Return a bounded diagnostic class, never SQL, exception text, keys or identifiers.
export function databaseFailure(error) {
  const text = [error?.message,error?.cause?.message].filter(v=>typeof v==='string').join(' ').toLowerCase();
  if (/daily.*(?:limit|quota)|(?:limit|quota).*daily/.test(text)) return 'daily_limit';
  if (/storage.*(?:full|limit)|database.*full/.test(text)) return 'storage_limit';
  if (/no such (?:table|column)|syntax error/.test(text)) return 'schema';
  if (/overloaded|database is locked|sqlite_busy/.test(text)) return 'busy';
  if (/rate limit|too many requests/.test(text)) return 'rate_limit';
  if (/timed? ?out|timeout|maximum.*duration/.test(text)) return 'timeout';
  if (/internal error|internal_error/.test(text)) return 'internal';
  return 'unknown';
}
export function safeRef(value) {
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.hostname.toLowerCase().slice(0, 120) : ''; } catch { return ''; }
}
export async function onRequestPost({ request, env }) {
  if (!env.HITS) return json({ ok:false, error:'no_db' }, 503);
  const url = new URL(request.url), origin = request.headers.get('origin');
  if (url.hostname !== 'thedollscout.com' || origin !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') return new Response(null, { status:403 });
  if (Number(request.headers.get('content-length')) > 2048) return new Response(null, { status:413 });
  let writing = false;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return new Response(null, { status:413 });
    const body = JSON.parse(raw);
    // Extra keys are rejected, preventing accidental document data collection.
    if (!body || typeof body !== 'object' || Object.keys(body).some(k => !['p','e','r'].includes(k))) return new Response(null, { status:400 });
    const ci = body.e === 'doc_ci' && body.p === '/__ci/documents';
    if (!ci && (typeof body.p !== 'string' || !PAGE.test(body.p) || !EVENTS.has(body.e))) return new Response(null, { status:400 });
    const ua = request.headers.get('user-agent') || '';
    if (!ci && (request.headers.get('x-probe') || request.headers.get('dnt') === '1' || /bot|crawler|spider|headless|playwright|puppeteer|release-check|document-probe/i.test(ua))) return new Response(null, { status:204 });
    const day = new Date().toISOString().slice(0, 10), lang = /^\/(de|zh)\//.exec(body.p)?.[1] || 'en';
    const country = (request.headers.get('cf-ipcountry') || '').toUpperCase();
    writing = true;
    await env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
      .bind(day, body.p, lang, /^[A-Z]{2}$/.test(country) ? country : '', ci ? '' : safeRef(body.r), body.e).run();
    return new Response(null, { status:204 });
  } catch (error) {
    return json({ ok:false, error:writing ? 'storage_unavailable' : 'invalid_event', ...(writing ? {reason:databaseFailure(error)} : {}) }, writing ? 503 : 400);
  }
}
