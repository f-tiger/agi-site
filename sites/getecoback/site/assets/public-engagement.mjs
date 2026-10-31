// ECO public pages only. Google remains in the existing empty analytics frame.
// Sample locally; send elapsed foreground time only on blur/hide/navigation,
// never periodic keep-alive events. A long scheduling gap is not active time.
export function engagementClock() {
  let previous = null, active = false, elapsed = 0;
  return {
    sample(now, nextActive) {
      const delta = previous === null ? 0 : now - previous;
      if (active && delta > 0 && delta <= 15000) elapsed += delta;
      previous = now; active = nextActive;
    },
    take() { const ms = Math.floor(elapsed); if (ms < 1000) return 0; elapsed -= ms; return ms; },
    reset() { previous = null; active = false; elapsed = 0; }
  };
}

// Fixed navigation actions, never a household answer, completed tool or sale.
export function countryScenarioEvent(pathname, detail) {
  if (!detail || typeof detail !== 'object' || !Object.hasOwn(detail,'name') || Object.keys(detail).length !== 1 || typeof detail.name !== 'string') return null;
  const actions = {
    '/nl/wonen.html': 'eco_country_scenario_open',
    '/nl/ventilatie-of-luchtontvochtiger.html': 'eco_country_scenario_read'
  };
  return Object.hasOwn(actions, pathname) && detail.name === actions[pathname] ? detail.name : null;
}

export function installPublicEngagement() {
  const host = 'getecoback.com', id = 'G-E2V0Q9SJ9V';
  const query = new URLSearchParams(location.search);
  if (location.hostname !== host || window.top !== window.self || navigator.webdriver ||
      navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true ||
      ['ci','__ci','__probe','qa','__qa'].some(k => query.has(k)) || query.get('utm_source') === 'verify' ||
      /^\/(?:en\/|de\/|it\/)?(?:account|members)(?:[/.]|$)|^\/(?:auth|api|__ci|__probe)\//.test(location.pathname)) return;
  const loader = document.querySelector('script[data-ga4-id][data-ga4-host]');
  if (loader?.dataset.ga4Id !== id || loader.dataset.ga4Host !== host) return;
  let page;
  try { page = new URL(loader.dataset.ga4Page); } catch { return; }
  if (page.origin !== location.origin || page.search || page.hash) return;
  let referrer = '';
  try { referrer = new URL(document.referrer).origin + '/'; } catch {}
  const fields = {send_to:id, page_location:page.href, page_title:loader.dataset.ga4Title, page_referrer:referrer};
  const clock = engagementClock();
  let frame, timer;
  const permitted = () => {
    try { if (localStorage.getItem('fleet_ga4_choice_v1') === 'denied') return false; } catch {}
    return !!frame?.isConnected && !frame.contentWindow['ga-disable-' + id];
  };
  const countryActionsSent = new Set();
  window.addEventListener('fleet:business', event => {
    const name = countryScenarioEvent(page.pathname, event.detail);
    if (!name || !permitted() || countryActionsSent.has(name)) return;
    countryActionsSent.add(name);
    // No replay of actions before the existing analytics frame was enabled.
    (function () { frame.contentWindow.dataLayer.push(arguments); })('event', name, {
      ...fields, tool_id:'eco-country-nl', transport_type:'beacon'
    });
  });
  const stop = () => { clearInterval(timer); timer = undefined; frame = undefined; clock.reset(); };
  const active = () => document.visibilityState === 'visible' && document.hasFocus();
  const sample = value => {
    if (!permitted()) { stop(); return false; }
    clock.sample(performance.now(), value); return true;
  };
  const flush = () => {
    if (!sample(false)) return;
    const ms = clock.take();
    if (!ms) return;
    // Use the frame's existing tag/cookies and fixed public metadata. No form,
    // input, query, fragment, account identity or new client/session ID is read.
    (function () { frame.contentWindow.dataLayer.push(arguments); })('event', 'eco_page_engagement', {
      ...fields, engagement_time_msec:ms, transport_type:'beacon'
    });
  };
  const start = candidate => {
    if (!candidate || candidate === frame) return;
    let url; try { url = new URL(candidate.src); } catch { return; }
    if (url.origin !== location.origin || !/^\/analytics-assets\/frame(?:\.html)?$/.test(url.pathname) ||
        !candidate.hidden || !candidate.contentWindow.dataLayer?.some(row => row[0] === 'config' && row[1] === id)) return;
    stop(); frame = candidate;
    if (sample(active())) timer = setInterval(() => sample(active()), 5000);
  };
  const currentFrame = () => document.querySelector('iframe[title="Optional analytics"]');
  window.addEventListener('message', event => {
    const candidate = currentFrame();
    if (event.origin === location.origin && event.source === candidate?.contentWindow && event.data?.type === 'fleet-ga4-started') start(candidate);
  });
  // Handles late module loading and opt-out/frame replacement without replaying
  // elapsed time from before analytics was enabled.
  new MutationObserver(() => { if (frame && !permitted()) stop(); start(currentFrame()); })
    .observe(document.body, {childList:true});
  window.addEventListener('storage', () => { if (!permitted()) stop(); });
  window.addEventListener('focus', () => sample(active()));
  window.addEventListener('blur', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else sample(active()); });
  window.addEventListener('pagehide', () => { flush(); clearInterval(timer); timer = undefined; });
  window.addEventListener('pageshow', event => { if (event.persisted) { const candidate = frame; stop(); start(candidate); } });
  start(currentFrame());
}

if (typeof document !== 'undefined') installPublicEngagement();
