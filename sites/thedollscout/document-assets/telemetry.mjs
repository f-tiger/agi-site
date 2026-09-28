// Only fixed action names and public paths; never file or form input.
const sent = new Set();
export const isProbe = new URLSearchParams(location.search).has('ci');
export function track(event) {
  if (location.hostname !== 'thedollscout.com' || isProbe || navigator.webdriver || navigator.doNotTrack === '1' || sent.has(event)) return;
  sent.add(event);
  let ref = '';
  try { ref = new URL(document.referrer).origin; } catch {}
  const body = JSON.stringify({ p: location.pathname, e: event, r: ref });
  try { if (navigator.sendBeacon) navigator.sendBeacon('/api/doc-events', body); else fetch('/api/doc-events', { method: 'POST', body, keepalive: true }).catch(() => {}); } catch {}
}
