// Own-origin aggregate events only; never upload diagnostic notes or device data.
const probe = new URLSearchParams(location.search).get('__probe') === '1';
function event(name, meta = {}) {
  if (probe) return;
  const body = JSON.stringify({n: name, p: location.pathname, r: document.referrer.split('?')[0].split('#')[0], m: meta});
  try { navigator.sendBeacon('/api/ev', new Blob([body], {type: 'text/plain'})); } catch {}
}
event('page_view');
document.querySelectorAll('[data-revenue-link]').forEach(link => link.addEventListener('click', () => {
  event('affiliate_click', {source: 'solarbank-diagnosis', choice: link.dataset.revenueLink, link_url: link.href});
}));
