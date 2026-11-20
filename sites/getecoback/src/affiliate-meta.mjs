import productCatalog from '../data/product-catalog.json' with {type:'json'};
import {WINDOW_ENTRY_DOCUMENT, WINDOW_ENTRY_PAGE} from './fenstersauger-entry.mjs';
import {PORTASPLIT_ENTRY_DOCUMENT, PORTASPLIT_ENTRY_PAGE, PORTASPLIT_MODEL_SEARCH} from './portasplit-entry.mjs';
import {CELLAR_MODEL_ENTRY_DOCUMENT, CELLAR_MODEL_ENTRY_PAGE, CELLAR_MODEL_SEARCH} from './cellar-entry.mjs';

// Only whitelisted affiliate dimensions. Never slice JSON: one long destination
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

export const CELLAR_PAGE = '/guide/luftentfeuchter-keller.html';
const drainDocumentURL = 'https://getecoback.com' + CELLAR_PAGE +
  '?utm_source=eco-mcp&utm_medium=referral&utm_campaign=keller-ablauf';

export function taggedDrainEntry(body, request, uaClass) {
  // Referer on a same-origin beacon is the current document URL, minus its
  // fragment. The browser separately checked the initial fragment. Neither the
  // landing query nor any household input is copied into event storage.
  return body.mcp_drain_entry === true && body.p === CELLAR_PAGE &&
    (body.n === 'page_view' || body.n === 'affiliate_click') &&
    uaClass === 'human' && request.headers.get('dnt') !== '1' &&
    request.headers.get('sec-gpc') !== '1' &&
    request.headers.get('origin') === 'https://getecoback.com' &&
    request.headers.get('sec-fetch-site') !== 'cross-site' &&
    request.headers.get('referer') === drainDocumentURL;
}

const windowModelSearches = new Set(productCatalog.products
  .filter(item => item.category === 'fenstersauger' && item.status === 'verified')
  .map(item => item.query));

const portasplitModelSearches = new Set([PORTASPLIT_MODEL_SEARCH]);
const cellarModelSearches = new Set([CELLAR_MODEL_SEARCH]);

function isGermanModelSearch(value, modelSearches) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.origin === 'https://www.amazon.de' && url.pathname === '/s' &&
      !url.username && !url.password && !url.hash && url.searchParams.size === 2 &&
      url.searchParams.get('tag') === 'getecoback-21' &&
      modelSearches.has(url.searchParams.get('k'));
  } catch {
    return false;
  }
}

function eligibleModelEntry(body, request, uaClass, path, documentUrl, modelSearches) {
  return body.p === path &&
    (body.n === 'page_view' || (body.n === 'affiliate_click' && isGermanModelSearch(body.m?.link_url, modelSearches))) &&
    uaClass === 'human' && request.headers.get('dnt') !== '1' &&
    request.headers.get('sec-gpc') !== '1' && request.headers.get('x-probe') !== '1' &&
    request.headers.get('origin') === 'https://getecoback.com' &&
    request.headers.get('sec-fetch-site') !== 'cross-site' &&
    request.headers.get('referer') === documentUrl;
}

export function taggedWindowEntry(body, request, uaClass) {
  return body.mcp_window_entry === true && eligibleModelEntry(body, request, uaClass,
    WINDOW_ENTRY_PAGE, WINDOW_ENTRY_DOCUMENT, windowModelSearches);
}

export function taggedPortaSplitEntry(body, request, uaClass) {
  return body.mcp_portasplit_entry === true && eligibleModelEntry(body, request, uaClass,
    PORTASPLIT_ENTRY_PAGE, PORTASPLIT_ENTRY_DOCUMENT, portasplitModelSearches);
}

export function taggedCellarModelEntry(body, request, uaClass) {
  return body.mcp_cellar_entry === true && eligibleModelEntry(body, request, uaClass,
    CELLAR_MODEL_ENTRY_PAGE, CELLAR_MODEL_ENTRY_DOCUMENT, cellarModelSearches);
}

export function affiliateMeta(meta, taggedDrain = false, taggedWindow = false, taggedPortaSplit = false, taggedCellar = false) {
  const clean = {};
  if (taggedDrain) clean.mcp_drain_entry = 1;
  if (taggedWindow) clean.mcp_window_entry = 1;
  if (taggedPortaSplit) clean.mcp_portasplit_entry = 1;
  if (taggedCellar) clean.mcp_cellar_entry = 1;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return JSON.stringify(clean);
  for (const [key, value] of [
    ['source', text(meta.source, 48)],
    ['merchant', text(meta.merchant, 32)],
    ['page', page(meta.page)],
    ['page_path', page(meta.page_path)],
    ['link_url', link(meta.link_url)],
  ]) if (value) clean[key] = value;
  return JSON.stringify(clean);
}
