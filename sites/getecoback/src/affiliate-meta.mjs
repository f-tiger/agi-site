import productCatalog from '../data/product-catalog.json' with {type:'json'};
import {WINDOW_CONDENSATION_PAGE} from '../site/assets/fenster-taucheck.mjs';
import {WINDOW_ENTRY_DOCUMENT, WINDOW_ENTRY_PAGE} from './fenstersauger-entry.mjs';
import {PORTASPLIT_ENTRY_DOCUMENT, PORTASPLIT_ENTRY_PAGE, PORTASPLIT_MODEL_SEARCH, PORTASPLIT_PRODUCT_URL} from './portasplit-entry.mjs';
import {CELLAR_MODEL_ENTRY_DOCUMENT, CELLAR_MODEL_ENTRY_PAGE, CELLAR_MODEL_SEARCH} from './cellar-entry.mjs';
import {N90_ENTRY_DOCUMENT, N90_ENTRY_PAGE, N90_PRODUCT_URL} from './n90-entry.mjs';
import {LAUNDRY_ENTRY_DOCUMENT, LAUNDRY_ENTRY_PAGE} from './laundry-mcp-entry.mjs';

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
const ecoOrigin = 'https://getecoback.com';
export const WINDOW_TIKTOK_GUIDE_PAGE = WINDOW_CONDENSATION_PAGE;
export const WINDOW_TIKTOK_GUIDE_DOCUMENT = ecoOrigin + WINDOW_TIKTOK_GUIDE_PAGE +
  '?utm_source=tiktok&utm_medium=social&utm_campaign=eco-dach-catalog-01';
export const WINDOW_TIKTOK_WIDTH_EVENT = 'eco_window_width_check';
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

export const VACUUM_OFFER_PAGE = '/produkte.html';
export const VACUUM_OFFER_MODELS = Object.freeze([
  'miele-guard-s1', 'miele-guard-m1-parquet-flex', 'bosch-bgbs2ba1p',
]);
const vacuumModelSearches = new Map(productCatalog.products
  .filter(item => VACUUM_OFFER_MODELS.includes(item.id) && item.status === 'verified')
  .map(item => [item.query, item.id]));

function germanModelSearchTerm(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.origin !== 'https://www.amazon.de' || url.pathname !== '/s' ||
        url.username || url.password || url.hash || url.searchParams.size !== 2 ||
        url.searchParams.get('tag') !== 'getecoback-21') return null;
    return url.searchParams.get('k');
  } catch { return null; }
}

function isGermanModelSearch(value, modelSearches) {
  return modelSearches.has(germanModelSearchTerm(value));
}

export function vacuumOfferModel(body, request, uaClass) {
  const headers = request.headers;
  const fetchSite = headers.get('sec-fetch-site');
  if (body.n !== 'affiliate_click' || body.p !== VACUUM_OFFER_PAGE || uaClass !== 'human' ||
      headers.get('origin') !== ecoOrigin || (fetchSite && fetchSite !== 'same-origin') ||
      ['dnt', 'sec-gpc', 'x-probe'].some(name => headers.get(name) === '1')) return null;
  try {
    const document = new URL(headers.get('referer'));
    if (document.origin !== ecoOrigin || document.pathname !== VACUUM_OFFER_PAGE ||
        ['__probe', '__qa', '__ci', 'qa', 'ci', 'verify'].some(key => document.searchParams.has(key)) ||
        document.searchParams.get('utm_source') === 'verify') return null;
  } catch { return null; }
  return vacuumModelSearches.get(germanModelSearchTerm(body.m?.link_url)) ?? null;
}

function eligibleModelEntry(body, request, uaClass, path, documentUrl, matchesMerchant) {
  return body.p === path &&
    (body.n === 'page_view' || (body.n === 'affiliate_click' && matchesMerchant(body.m?.link_url))) &&
    uaClass === 'human' && request.headers.get('dnt') !== '1' &&
    request.headers.get('sec-gpc') !== '1' && request.headers.get('x-probe') !== '1' &&
    request.headers.get('origin') === 'https://getecoback.com' &&
    request.headers.get('sec-fetch-site') !== 'cross-site' &&
    request.headers.get('referer') === documentUrl;
}

export function taggedLaundryMcpEntry(body, request, uaClass) {
  return body.n === 'page_view' && body.mcp_laundry_entry === true &&
    eligibleModelEntry(body, request, uaClass, LAUNDRY_ENTRY_PAGE, LAUNDRY_ENTRY_DOCUMENT, () => false);
}

export function taggedWindowEntry(body, request, uaClass) {
  return body.mcp_window_entry === true && eligibleModelEntry(body, request, uaClass,
    WINDOW_ENTRY_PAGE, WINDOW_ENTRY_DOCUMENT, link => isGermanModelSearch(link, windowModelSearches));
}

export function taggedWindowTikTokEntry(body, request, uaClass) {
  const headers = request.headers;
  const fetchSite = headers.get('sec-fetch-site');
  if (body.window_tiktok_entry !== true || uaClass !== 'human' ||
      headers.get('origin') !== ecoOrigin || (fetchSite && fetchSite !== 'same-origin') ||
      ['dnt', 'sec-gpc', 'x-probe'].some(name => headers.get(name) === '1')) return false;

  const documentUrl = headers.get('referer');
  // Same-origin requests omit fragments. The browser checks the entry section.
  if (body.n === 'page_view') {
    return body.p === WINDOW_TIKTOK_GUIDE_PAGE && documentUrl === WINDOW_TIKTOK_GUIDE_DOCUMENT;
  }
  if (body.p !== WINDOW_ENTRY_PAGE || documentUrl !== ecoOrigin + WINDOW_ENTRY_PAGE ||
      body.r !== WINDOW_TIKTOK_GUIDE_DOCUMENT) return false;

  if (body.n === WINDOW_TIKTOK_WIDTH_EVENT) {
    const fields = ['n', 'p', 'r', 'm', 'window_tiktok_entry'];
    return Object.keys(body).every(key => fields.includes(key)) &&
      (body.m == null || (typeof body.m === 'object' && !Array.isArray(body.m) && !Object.keys(body.m).length));
  }
  return body.n === 'affiliate_click' && isGermanModelSearch(body.m?.link_url, windowModelSearches);
}

export function taggedPortaSplitEntry(body, request, uaClass) {
  // Both targets are allowed so a cached guide can still report the previous
  // model search while the audit distinguishes the new product-page clicks.
  return body.mcp_portasplit_entry === true && eligibleModelEntry(body, request, uaClass,
    PORTASPLIT_ENTRY_PAGE, PORTASPLIT_ENTRY_DOCUMENT,
    link => link === PORTASPLIT_PRODUCT_URL || isGermanModelSearch(link, portasplitModelSearches));
}

export function taggedCellarModelEntry(body, request, uaClass) {
  return body.mcp_cellar_entry === true && eligibleModelEntry(body, request, uaClass,
    CELLAR_MODEL_ENTRY_PAGE, CELLAR_MODEL_ENTRY_DOCUMENT, link => isGermanModelSearch(link, cellarModelSearches));
}

export function taggedN90ModelEntry(body, request, uaClass) {
  return body.mcp_n90_entry === true && eligibleModelEntry(body, request, uaClass,
    N90_ENTRY_PAGE, N90_ENTRY_DOCUMENT, link => link === N90_PRODUCT_URL);
}

export function affiliateMeta(meta, taggedDrain = false, taggedWindow = false, taggedPortaSplit = false, taggedCellar = false, taggedN90 = false, taggedWindowTikTok = false, vacuumModel = null) {
  const clean = {};
  if (taggedDrain) clean.mcp_drain_entry = 1;
  if (taggedWindow) clean.mcp_window_entry = 1;
  if (taggedPortaSplit) clean.mcp_portasplit_entry = 1;
  if (taggedCellar) clean.mcp_cellar_entry = 1;
  if (taggedN90) clean.mcp_n90_entry = 1;
  if (taggedWindowTikTok) clean.window_tiktok_entry = 1;
  if (VACUUM_OFFER_MODELS.includes(vacuumModel)) clean.vacuum_model = vacuumModel;
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
