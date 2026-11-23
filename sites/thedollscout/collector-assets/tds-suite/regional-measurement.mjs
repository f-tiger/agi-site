// Fixed public actions only. Never send form values, result JSON or a visitor ID.
export const REGIONAL_ACTIONS = Object.freeze(['tds_regional_result', 'tds_regional_handoff']);
export const REGIONAL_TOOL_SLUGS = Object.freeze(['dach-meter-fit', 'uk-laundry-session']);
export const REGIONAL_TOOL_PATHS = Object.freeze(['', '/de', '/zh'].flatMap(prefix =>
  REGIONAL_TOOL_SLUGS.map(slug => prefix + '/ai-tools/' + slug)));

function regionalPayload(body) {
  return !!body && typeof body === 'object' && !Array.isArray(body) &&
    Object.keys(body).length === 3 && Object.keys(body).every(key => ['p', 'e', 'r'].includes(key)) &&
    REGIONAL_TOOL_PATHS.includes(body.p);
}

export function regionalMeasurement(body) {
  return regionalPayload(body) && REGIONAL_ACTIONS.includes(body.e) && body.r === '';
}

function webOrigin(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.origin : '';
  } catch { return ''; }
}

export function regionalPageview(body) {
  return regionalPayload(body) && body.e === '' && typeof body.r === 'string' &&
    (body.r === '' || body.r === webOrigin(body.r));
}

// The caller must invoke this only after a trusted native action: a valid own
// result (never an example), or an actual click on its fixed buying-guide CTA.
// This function supplies the shared QA/privacy gate, not proof of human identity.
function measurablePath(win) {
  try {
    const url = new URL(win.location.href), nav = win.navigator;
    if (url.origin !== 'https://thedollscout.com' ||
        win.top !== win.self || nav.webdriver || nav.doNotTrack === '1' || nav.globalPrivacyControl ||
        /bot|crawler|spider|headless|playwright|puppeteer/i.test(nav.userAgent || '') ||
        ['ci', '__ci', '__probe', 'qa', '__qa'].some(key => url.searchParams.has(key)) ||
        url.searchParams.get('utm_source') === 'verify' ||
        (win.localStorage.getItem('tds_analytics_choice_v1') === 'denied' ||
         win.localStorage.getItem('fleet_ga4_choice_v1') === 'denied')) return null;
    const canonical = new URL(win.document.querySelector('link[rel="canonical"]').href);
    if (canonical.origin !== url.origin || canonical.search || canonical.hash ||
        url.pathname.replace(/\.html$/, '') !== canonical.pathname || !REGIONAL_TOOL_PATHS.includes(canonical.pathname)) return null;
    return canonical.pathname;
  } catch { return null; }
}

function send(win, body) {
  try { Promise.resolve(win.fetch('/api/ev', {method: 'POST', body: JSON.stringify(body), keepalive: true})).catch(() => {}); } catch {}
}

export function recordRegionalAction(name, win = window) {
  const body = {p: measurablePath(win), e: name, r: ''};
  if (!regionalMeasurement(body)) return false;
  // Shared fleet analytics owns GA4 and the existing affiliate listener owns merchant exits.
  try { win.dispatchEvent(new win.CustomEvent('fleet:business', {detail: {name}})); } catch {}
  send(win, body);
  return true;
}

// Called once by the regional page's module entry point. The shared analytics
// loader already serves GA4, so this dispatches only the first-party pageview.
export function recordRegionalPageview(win = window) {
  const path = measurablePath(win);
  if (!path) return false;
  send(win, {p: path, e: '', r: webOrigin(win.document.referrer)});
  return true;
}
