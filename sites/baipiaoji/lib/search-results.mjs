// Shared by the build and browser. Rank all candidates before limiting results.
export function searchResults(rows, query, limit = 8) {
  const kw = String(query).trim().toLowerCase();
  if (!kw) return [];
  // This catalogue has useful per-project anchors, not separate thin profile pages.
  const projectHash = url => ((url.pathname === '/manju/rankings' && /^#rank-[a-z0-9-]{1,100}$/.test(url.hash)) || (/^\/(?:en\/)?github-tools\/$/.test(url.pathname) && /^#[a-z0-9-]{1,40}$/.test(url.hash)) || (url.pathname === '/manju/' && /^#work-mj-[a-f0-9]{12}$/.test(url.hash))) ? url.hash : '';
  const canonical = value => {
    const url = new URL(value, 'https://baipiaoji.com');
    return url.origin + (url.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/') + projectHash(url);
  };
  const ranked = rows.map((row, order) => {
    const name = row.n.toLowerCase();
    const slug = new URL(row.u, 'https://baipiaoji.com').pathname.match(/\/tools\/([^/]+?)(?:\.html)?$/)?.[1];
    const score = name === kw ? 120 : slug === kw ? 110 : name.includes(kw) ? 60 : String(row.q).toLowerCase().includes(kw) ? 10 : 0;
    return {row, score, order};
  }).filter(x => x.score).sort((a,b) => b.score-a.score || a.order-b.order);
  const seen = new Set(), hits = [];
  for (const {row} of ranked) {
    const url = canonical(row.u);
    if (seen.has(url)) continue;
    seen.add(url);
    const destination = new URL(row.u, 'https://baipiaoji.com');
    destination.pathname = destination.pathname.replace(/\.html$/, '');
    destination.search = ''; destination.hash = projectHash(destination);
    hits.push({...row, u:destination.href});
    if (hits.length === limit) break;
  }
  return hits;
}
