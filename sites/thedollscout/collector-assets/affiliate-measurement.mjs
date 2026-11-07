// First-party merchant clicks only. Shared fleet analytics owns the GA4 event.
// Never send search terms, product names, full links or user-provided values.
const SHOP_PATH = /^\/(?:de\/|zh\/)?(?:shop(?:\/(?:display-cases|storage-transport|plush-display|collector-gifts))?)?$/;
const QA_KEYS = ['ci', '__ci', '__probe', 'qa', '__qa'];
const installed = new WeakSet();

export function affiliatePayload(event, runtime = globalThis) {
  try {
    const {location, navigator, localStorage, document, window} = runtime;
    const current = new URL(location.href);
    if (current.origin !== 'https://thedollscout.com' || window.top !== window.self ||
        QA_KEYS.some(key => current.searchParams.has(key)) || current.searchParams.get('utm_source') === 'verify' ||
        navigator.webdriver || /bot|crawler|spider|headless|playwright|puppeteer/i.test(navigator.userAgent) ||
        navigator.globalPrivacyControl || navigator.doNotTrack === '1' ||
        localStorage.getItem('tds_analytics_choice_v1') === 'denied' || !event.isTrusted) return null;
    const canonical = new URL(document.querySelector('link[rel="canonical"]').href);
    if (canonical.origin !== current.origin || !SHOP_PATH.test(canonical.pathname) ||
        current.pathname.replace(/\.html$/, '') !== canonical.pathname || canonical.search || canonical.hash) return null;
    const anchor = event.target?.closest?.('a[rel~="sponsored"]');
    if (!anchor) return null;
    const merchant = new URL(anchor.href);
    const host = merchant.hostname.replace(/^www\./, '');
    const tag = host === 'amazon.com' ? 'ecoback0d-20' : host === 'amazon.de' ? 'getecoback-21' : null;
    if (!tag || merchant.protocol !== 'https:' || merchant.username || merchant.password || merchant.port ||
        merchant.searchParams.getAll('tag').length !== 1 || merchant.searchParams.get('tag') !== tag) return null;
    return {p: canonical.pathname, e: 'affiliate_click', r: 'https://' + host};
  } catch { return null; }
}

export function installAffiliateMeasurement(runtime = globalThis) {
  if (installed.has(runtime.document)) return;
  installed.add(runtime.document);
  runtime.document.addEventListener('click', event => {
    const payload = affiliatePayload(event, runtime);
    if (!payload) return;
    try {
      Promise.resolve(runtime.fetch('/api/ev', {method: 'POST', body: JSON.stringify(payload), keepalive: true})).catch(() => {});
    } catch { /* Measurement never interrupts navigation. */ }
  }, true);
}
