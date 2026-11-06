import policy from '../data/agent-source-policy.json' with {type:'json'};

// References already in an article, not discovery, affiliation or endorsement.
// No redirects, query parameters, credentials, nonstandard ports or guessed URLs.
export function citationUrl(href, rel='') {
  if (typeof href !== 'string' || /[\s\\<>"'()]/.test(href) || /sponsored/i.test(rel)) return null;
  try {
    if (!/^https:\/\/[^/?#:@]+\//.test(href)) return null;
    const url=new URL(href);
    if (url.protocol!=='https:' || url.username || url.password || url.port || url.search) return null;
    const prefixes=policy.hosts[url.hostname];
    // Preserve a page locator only for the same exact reviewed PDF. This does
    // not authorize other files, queries or arbitrary fragment instructions.
    const exact=policy.reference_urls.includes(href);
    const pdfPage=url.pathname.toLowerCase().endsWith('.pdf') && /^#page=[1-9][0-9]{0,3}$/.test(url.hash)
      && policy.reference_urls.includes(href.split('#',1)[0]);
    if (!prefixes?.some(prefix=>url.pathname.startsWith(prefix)) && !exact && !pdfPage) return null;
    // Encoded URL delimiters can hide a redirect destination or credentials.
    if (/%(?:00|0a|0d|2f|3a|40|5c)/i.test(url.pathname)) return null;
    return href;
  } catch { return null; }
}
