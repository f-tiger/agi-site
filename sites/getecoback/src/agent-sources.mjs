import policy from '../data/agent-source-policy.json' with {type:'json'};

// References already in an article, not discovery, affiliation or endorsement.
// Queries identify a source only when its exact canonical URL has been reviewed.
export function citationUrl(href, rel='') {
  if (typeof href !== 'string' || /[\s\\<>"'()]/.test(href) || /sponsored/i.test(rel)) return null;
  try {
    if (!/^https:\/\/[^/?#:@]+\//.test(href)) return null;
    const url=new URL(href);
    if (url.protocol!=='https:' || url.username || url.password || url.port) return null;
    const exact=policy.reference_urls.includes(href);
    if (url.search && (!exact || url.href!==href || url.hash)) return null;
    const prefixes=policy.hosts[url.hostname];
    // Preserve a page locator only for the same exact reviewed PDF. This does
    // not authorize other files, queries or arbitrary fragment instructions.
    const pdfPage=url.pathname.toLowerCase().endsWith('.pdf') && /^#page=[1-9][0-9]{0,3}$/.test(url.hash)
      && policy.reference_urls.includes(href.split('#',1)[0]);
    if (!prefixes?.some(prefix=>url.pathname.startsWith(prefix)) && !exact && !pdfPage) return null;
    // The official Registry requires this one separator for reviewed entries.
    const registryEntry = exact && url.hostname === 'registry.modelcontextprotocol.io'
      && /^\/v0\.1\/servers\/io\.github\.f-tiger%2F[a-z0-9-]+\/versions\/latest$/.test(url.pathname);
    if (!registryEntry && /%(?:00|0a|0d|2f|3a|40|5c)/i.test(url.pathname)) return null;
    return href;
  } catch { return null; }
}
