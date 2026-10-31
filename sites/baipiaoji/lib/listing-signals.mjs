// Fixed actions only. Never collect SKU, content, filenames or contact details.
export const LISTING_ACTIONS = ['import','check','handoff','draft','review','export','inquiry'];
export function parseListingEvent(path) {
  const match = /^\/listing\/(import|check|handoff|draft|review|export|inquiry)\/(demo|own)$/.exec(path || '');
  return match ? {action: match[1], mode: match[2]} : null;
}
export function emptyListingCounts() {
  return Object.fromEntries(['demo','own'].map(mode => [mode, Object.fromEntries(LISTING_ACTIONS.map(action => [action,0]))]));
}
