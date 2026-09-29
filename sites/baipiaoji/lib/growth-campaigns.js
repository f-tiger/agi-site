// One bounded dogfood experiment. A registered campaign is not a published post.
export const CAMPAIGNS = [{
  id: 'bpj-quota-clarity-01',
  paths: ['/en/tools/google-ai-studio', '/en/how-much-has-gemini-free-tier-been-cut'],
  sources: ['github', 'x', 'linkedin', 'telegram', 'newsletter', 'community', 'youtube', 'tiktok'],
  state: 'awaiting_distribution',
}];
export const SESSION_SECONDS = 1800;
export const RETENTION_DAYS = 31;
export const QUALIFY_SECONDS = 10;
export const MEASUREMENT_VERSION = 'bpj-growth-v1';
export function cleanPath(path) {
  return typeof path === 'string' ? path.replace(/\.html$/, '').replace(/\/$/, '') : '';
}
export function campaignFor(id, path, source) {
  return CAMPAIGNS.find(c => c.id === id && c.paths.includes(cleanPath(path)) && c.sources.includes(source));
}
export function campaignPage(path) {
  return CAMPAIGNS.find(c => c.paths.includes(cleanPath(path)));
}
const within = (host, domain) => host === domain || host.endsWith('.' + domain);
export function arrivalClass(host) {
  if (!host) return 'tag_only';
  host = String(host).toLowerCase();
  if (host.length > 100 || !/^[a-z0-9.-]+$/.test(host)) return 'tag_only';
  if (within(host, 'baipiaoji.com') || within(host, 'aiyangmao.pages.dev')) return 'internal';
  if (['agiscorecard.com','getecoback.com','thedollscout.com'].some(d => within(host, d))) return 'fleet';
  if (['google.com','bing.com','duckduckgo.com','baidu.com','yahoo.com'].some(d => within(host, d)) || /^www\.google\.[a-z.]+$/.test(host)) return 'search';
  return 'external_referrer';
}
export function growthMarkup(path) {
  const campaign = campaignPage(path);
  if (!campaign) return '';
  return `<script type="module" src="/studio-assets/growth-campaign.mjs" data-bpj-growth="${campaign.id}" data-growth-sources="${campaign.sources.join(',')}"></script>`;
}
export function growthNotice(path) {
  if (!campaignPage(path)) return '';
  return ' Campaign links use a random, per-tab identifier for up to 30 minutes to count arrivals, active reading and official-link clicks. No email, IP address or fingerprint is stored in this measurement. The retention window is 31 days; expired records are removed during report refreshes. DNT/GPC and QA visits are excluded.';
}
