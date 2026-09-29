// One bounded, anonymous acquisition experiment. No cookies, IDs or bill values.
export const CAMPAIGN = 'eco-bonus-01';
export const CAMPAIGNS = Object.freeze([CAMPAIGN, 'eco-fixed-02']);
export const PAGE = '/en/energy-tariff-workbench.html';
export function campaignTags(href, referrer='') {
  const u = new URL(href);
  const q = u.searchParams, s = q.get('utm_source'), c = q.get('utm_campaign');
  if (u.pathname !== PAGE || !CAMPAIGNS.includes(c) ||
      q.get('utm_medium') !== 'organic_video' || !['youtube','tiktok'].includes(s)) return {};
  let host=''; try { host = new URL(referrer).hostname.toLowerCase(); } catch {}
  const is = domain => host === domain || host.endsWith('.'+domain);
  const match = s === 'youtube' ? is('youtube.com') || is('youtu.be') : is('tiktok.com');
  const internal = ['getecoback.com','baipiaoji.com','agiscorecard.com','thedollscout.com'].some(is);
  return {c,s,v:internal?'internal':match?'referrer':host?'other':'tag_only'};
}
