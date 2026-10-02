import {campaignMetadata} from './video-campaign.mjs?v=2026-09-29.1';
// Only fixed action names and public paths; never file or form input.
const sent = new Set();
const query = new URLSearchParams(location.search);
export const isProbe = query.has('ci') || query.has('__ci') || query.has('__probe') || query.get('utm_source') === 'verify';
export function track(event) {
  if (location.hostname !== 'thedollscout.com' || isProbe || navigator.webdriver || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true || sent.has(event)) return;
  sent.add(event);
  window.dispatchEvent(new CustomEvent('fleet:business', {detail:{name:event}}));
  let ref = '';
  try { ref = new URL(document.referrer).origin; } catch {}
  const body = JSON.stringify({ p: location.pathname, e: event, r: ref, ...campaignMetadata(location.search,location.pathname,event) });
  try { if (navigator.sendBeacon) navigator.sendBeacon('/api/doc-events', body); else fetch('/api/doc-events', { method: 'POST', body, keepalive: true }).catch(() => {}); } catch {}
}
