const path = '/strommess-protokoll.html';
const target = 'https://thedollscout.com/de/shop/categories/smart-home#strommessung';

export function installMeterReferral(win) {
  const doc = win.document;
  const url = new URL(win.location.href);
  if (win.top !== win.self || url.origin !== 'https://getecoback.com' || url.pathname !== path ||
      ['__probe','__ci','ci','qa','__qa'].some(key => url.searchParams.has(key)) ||
      url.searchParams.get('utm_source') === 'verify' || win.navigator.webdriver ||
      /bot|crawler|spider|headless/i.test(win.navigator.userAgent)) return;

  const link = doc.querySelector('.work-panel a[data-meter-referral]');
  if (!link || link.href !== target) return;
  const sent = new Set();
  function record(name) {
    if (sent.has(name) || link.href !== target || doc.visibilityState !== 'visible' ||
        win.navigator.doNotTrack === '1' || win.navigator.globalPrivacyControl) return;
    try {
      if (win.localStorage.getItem('fleet_ga4_choice_v1') === 'denied') return;
    } catch { return; }
    sent.add(name);
    win.fetch('/api/ev', {
      method:'POST', keepalive:true, credentials:'omit', referrerPolicy:'origin',
      body:JSON.stringify({n:name, p:path})
    }).catch(() => {});
    win.dispatchEvent(new win.CustomEvent('fleet:business', {detail:{name}}));
  }
  function activate(event) {
    if (event.isTrusted && (event.type === 'click' && event.button === 0 ||
        event.type === 'auxclick' && event.button === 1)) record('eco_meter_guide_click');
  }
  link.addEventListener('click', activate);
  link.addEventListener('auxclick', activate);
  if (!win.IntersectionObserver) return;
  let inView = false;
  function maybeView() {
    if (inView) record('eco_meter_guide_view');
    if (sent.has('eco_meter_guide_view')) {
      observer.disconnect();
      doc.removeEventListener('visibilitychange', maybeView);
    }
  }
  const observer = new win.IntersectionObserver(entries => {
    inView = entries.some(entry => entry.target === link && entry.isIntersecting && entry.intersectionRatio >= 0.5);
    maybeView();
  }, {threshold:0.5});
  doc.addEventListener('visibilitychange', maybeView);
  observer.observe(link);
}
if (typeof window !== 'undefined') installMeterReferral(window);
