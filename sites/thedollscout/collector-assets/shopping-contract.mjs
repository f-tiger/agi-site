// Fixed public catalogue labels only. No customer data, dimensions or free text.
export const SHOPPING_IDS = Object.freeze(['blaliden', 'baggebo', 'lustigt', 'samla', 'my-bestie', 'niubee-risers']);
export const SHOPPING_PLACEMENTS = Object.freeze(['card', 'compare', 'guide']);
export const SHOPPING_PATHS = Object.freeze(['/', '/de/', '/zh/'].flatMap(prefix =>
  ['', 'shop', 'shop/display-cases', 'shop/storage-transport', 'shop/plush-display', 'shop/collector-gifts'].map(path => prefix + path)));
export const SHOPPING_MERCHANTS = Object.freeze(['amazon.com', 'amazon.de', 'ikea.com', 'sonnyangelstore.com']);
const paths = new Set(SHOPPING_PATHS);
const ikeaPaths = Object.freeze({
  blaliden: {US: '/us/en/p/blaliden-glass-door-cabinet-black-00520519/', DE: '/de/de/p/blaliden-vitrine-schwarz-00520519/'},
  baggebo: {US: '/us/en/p/baggebo-glass-door-cabinet-metal-white-80502998/', DE: '/de/de/p/baggebo-vitrine-metall-weiss-80502998/'},
  lustigt: {US: '/us/en/p/lustigt-wall-shelf-30381852/', DE: '/de/de/p/lustigt-wandregal-30381852/'},
  samla: {US: '/us/en/p/samla-box-clear-70102972/', DE: '/de/de/p/samla-box-transparent-70102972/'}
});

export function shoppingMarket(path) {return paths.has(path) ? path.startsWith('/de/') ? 'DE' : 'US' : null;}
export function shoppingItemAllowed(item, market) {
  return ['US', 'DE'].includes(market) && SHOPPING_IDS.includes(item) && (item !== 'niubee-risers' || market === 'US');
}
export function shoppingTupleAllowed({path, event, merchant, item, placement}) {
  const market = shoppingMarket(path);
  if (!shoppingItemAllowed(item, market) || !SHOPPING_PLACEMENTS.includes(placement)) return false;
  if (event === 'affiliate_click') return item === 'niubee-risers' && market === 'US' && merchant === 'amazon.com';
  return event === 'shopping_official_click' && (item === 'my-bestie' ? merchant === 'sonnyangelstore.com' :
    Object.hasOwn(ikeaPaths, item) && merchant === 'ikea.com');
}
export function encodeShoppingRef({merchant, item, placement}) {return `s1|${merchant}|${item}|${placement}`;}
export const SHOPPING_TUPLES = Object.freeze(SHOPPING_IDS.flatMap(item => SHOPPING_PLACEMENTS.map(placement => {
  const event = item === 'niubee-risers' ? 'affiliate_click' : 'shopping_official_click';
  const merchant = item === 'niubee-risers' ? 'amazon.com' : item === 'my-bestie' ? 'sonnyangelstore.com' : 'ikea.com';
  return Object.freeze({event, merchant, item, placement, ref: encodeShoppingRef({merchant, item, placement})});
})));

// Only fixed tuples are decoded. Legacy affiliate records have unknown item/placement.
export function decodeShoppingRef(event, path, ref) {
  if (['', 'shopping_compare'].includes(event)) return ref === '' ? {merchant: '', item: '', placement: ''} : null;
  if (event === 'affiliate_click' && ['amazon.com', 'amazon.de', 'unknown'].includes(ref))
    return {merchant: ref, item: 'unknown', placement: 'unknown'};
  const tuple = SHOPPING_TUPLES.find(candidate => candidate.ref === ref && candidate.event === event);
  return tuple && shoppingTupleAllowed({path, ...tuple}) ? {merchant: tuple.merchant, item: tuple.item, placement: tuple.placement} : null;
}

function merchantURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return {url, host: url.hostname.replace(/^www\./, '')};
  } catch {return null;}
}

// Browser links are checked against the fixed product/local-market contract.
export function shoppingLinkPayload({p, href, item, placement, affiliate = false, official = false}) {
  const market = shoppingMarket(p), target = merchantURL(href);
  if (!market || !target || affiliate === official) return null;
  const {url, host} = target, hasMetadata = item !== undefined || placement !== undefined;
  if (affiliate) {
    const expectedHost = market === 'DE' ? 'amazon.de' : 'amazon.com', tag = market === 'DE' ? 'getecoback-21' : 'ecoback0d-20';
    if (host !== expectedHost || url.searchParams.getAll('tag').length !== 1 || url.searchParams.get('tag') !== tag) return null;
    if (!hasMetadata) return {p, e: 'affiliate_click', r: 'https://' + host};
    if (!shoppingTupleAllowed({path: p, event: 'affiliate_click', merchant: host, item, placement}) ||
        !/^\/dp\/B07KN5G9CQ\/?$/.test(url.pathname)) return null;
    return {p, e: 'affiliate_click', r: 'https://' + host, item, placement};
  }
  if (!shoppingTupleAllowed({path: p, event: 'shopping_official_click', merchant: host, item, placement}) || url.search || url.hash) return null;
  const correctPath = item === 'my-bestie' ? '/en/products/mybestiecase2' : ikeaPaths[item][market];
  if (url.pathname !== correctPath) return null;
  return {p, e: 'shopping_official_click', r: 'https://' + host + (host === 'ikea.com' ? market === 'DE' ? '/de/de/' : '/us/en/' : ''), item, placement};
}

// Server admission for the optional bounded labels. Never accept an arbitrary
// metadata string, product URL, unknown field or partial item/placement pair.
export function shoppingMeasurement(body) {
  const market = shoppingMarket(body?.p);
  if (!market || Object.keys(body).some(key => !['p', 'e', 'r', 'item', 'placement'].includes(key))) return null;
  if (body.e === 'shopping_compare') return body.r === '' && !Object.hasOwn(body, 'item') && !Object.hasOwn(body, 'placement') ? {ref: ''} : null;
  const target = merchantURL(body.r);
  if (!target || !shoppingTupleAllowed({path: body.p, event: body.e, merchant: target.host, item: body.item, placement: body.placement})) return null;
  const {url, host} = target;
  const expectedPath = host === 'ikea.com' ? market === 'DE' ? '/de/de/' : '/us/en/' : '/';
  if (url.pathname !== expectedPath || url.search || url.hash) return null;
  return {ref: encodeShoppingRef({merchant: host, item: body.item, placement: body.placement})};
}
