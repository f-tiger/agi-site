// Only existing affiliate dimensions. Never slice JSON: one long destination
// used to corrupt every field, including the source merged by the click tracker.
// Limits include JSON escaping and UTF-8 bytes; the complete object is < 768 B.
const encoder = new TextEncoder();
function text(value, budget) {
  if (typeof value !== 'string') return '';
  let out = '';
  for (const char of value) {
    if (/[\u0000-\u001f\u007f]/u.test(char)) continue;
    if (encoder.encode(JSON.stringify(out + char)).length > budget) break;
    out += char;
  }
  return out;
}

function page(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '';
  try {
    const url = new URL(value, 'https://getecoback.com');
    if (url.origin !== 'https://getecoback.com') return '';
    // Do not turn an overlong path into a different, apparently exact page.
    return url.pathname.length <= 192 ? url.pathname : '';
  } catch { return ''; }
}

function link(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    const tag = url.searchParams.get('tag');
    url.search = '';
    url.hash = '';
    // Amazon adds titles and /ref= tracking to product links. Keep the existing
    // destination ASIN, without those extras or free-form search query values.
    if (/^(?:www\.)?amazon\.(?:de|com)$/.test(url.hostname)) {
      if (url.pathname === '/s' || url.pathname.startsWith('/s/')) url.pathname = '/s';
      else {
        const product = url.pathname.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i);
        if (product) url.pathname = '/' + product[1].toLowerCase() + '/' + product[2].toUpperCase();
        else url.pathname = url.pathname.replace(/\/ref=[\s\S]*$/, '');
      }
      const expectedTag = url.hostname.endsWith('.de') ? 'getecoback-21' : 'ecoback0d-20';
      if (tag === expectedTag) url.searchParams.set('tag', tag);
    }
    const clean = url.href;
    return clean.length <= 200 ? clean : '';
  } catch { return ''; }
}

export function affiliateMeta(meta) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return '{}';
  const clean = {};
  for (const [key, value] of [
    ['source', text(meta.source, 48)],
    ['merchant', text(meta.merchant, 32)],
    ['page', page(meta.page)],
    ['page_path', page(meta.page_path)],
    ['link_url', link(meta.link_url)],
  ]) if (value) clean[key] = value;
  return JSON.stringify(clean);
}
