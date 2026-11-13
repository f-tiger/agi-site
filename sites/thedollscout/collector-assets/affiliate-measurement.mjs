// First-party shopping actions only. Shared fleet analytics owns GA4 events.
// Never send search terms, arbitrary product labels, full links or user inputs.
import {shoppingMarket, shoppingItemAllowed, shoppingLinkPayload} from './shopping-contract.mjs?v=20261113.amazon1';
const QA_KEYS = ['ci', '__ci', '__probe', 'qa', '__qa'];
const installed = new WeakSet();
const compared = new WeakSet();

function shoppingPath(event, runtime) {
  try {
    const {location, navigator, localStorage, document, window} = runtime;
    const current = new URL(location.href);
    if (current.origin !== 'https://thedollscout.com' || window.top !== window.self ||
        QA_KEYS.some(key => current.searchParams.has(key)) || current.searchParams.get('utm_source') === 'verify' ||
        navigator.webdriver || /bot|crawler|spider|headless|playwright|puppeteer/i.test(navigator.userAgent) ||
        navigator.globalPrivacyControl || navigator.doNotTrack === '1' ||
        localStorage.getItem('tds_analytics_choice_v1') === 'denied' || !event.isTrusted) return null;
    const canonical = new URL(document.querySelector('link[rel="canonical"]').href);
    if (canonical.origin !== current.origin || !shoppingMarket(canonical.pathname) ||
        current.pathname.replace(/\.html$/, '') !== canonical.pathname || canonical.search || canonical.hash) return null;
    return canonical.pathname;
  } catch { return null; }
}

export function affiliatePayload(event, runtime = globalThis) {
  const p = shoppingPath(event, runtime);
  if (!p) return null;
  try {
    const anchor = event.target?.closest?.('a[rel~="sponsored"],a[data-shopping-official]');
    if (!anchor) return null;
    const item = anchor.getAttribute('data-shopping-item'), placement = anchor.getAttribute('data-shopping-placement');
    return shoppingLinkPayload({p, href: anchor.href, item: item === null ? undefined : item,
      placement: placement === null ? undefined : placement, affiliate: anchor.relList.contains('sponsored'),
      official: anchor.hasAttribute('data-shopping-official')});
  } catch {return null;}
}

function send(payload, runtime) {
  // The shared fleet handler owns GA4 delivery. Affiliate clicks already have
  // its delegated listener; only the two new fixed actions use this bridge.
  if (['shopping_official_click', 'shopping_compare'].includes(payload.e)) {
    try {runtime.window.dispatchEvent(new runtime.CustomEvent('fleet:business', {detail: {name: payload.e}}));} catch {}
  }
  try {Promise.resolve(runtime.fetch('/api/ev', {method: 'POST', body: JSON.stringify(payload), keepalive: true})).catch(() => {});}
  catch { /* Measurement never interrupts navigation or comparison. */ }
}

// Call only after the UI has rendered a comparison from at least two selections.
// The selected IDs stay in the browser; the event contains no selection list.
export function recordShoppingCompare(event, selectedIds, runtime = globalThis) {
  const p = shoppingPath(event, runtime);
  if (!p || compared.has(event) || !Array.isArray(selectedIds) || selectedIds.length < 2 || selectedIds.length > 3 ||
      new Set(selectedIds).size !== selectedIds.length || !selectedIds.every(item => shoppingItemAllowed(item, shoppingMarket(p)))) return false;
  compared.add(event);
  send({p, e: 'shopping_compare', r: ''}, runtime);
  return true;
}

export function installAffiliateMeasurement(runtime = globalThis) {
  if (installed.has(runtime.document)) return;
  installed.add(runtime.document);
  runtime.document.addEventListener('click', event => {
    const payload = affiliatePayload(event, runtime);
    if (!payload) return;
    send(payload, runtime);
  }, true);
}
