// Public catalogue metadata only. No requests, storage, user profiling or model calls.
export const normalize = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\b(?:science[ -]fiction|sci[ -]?fi)\b/g, 'scifi').replace(/\bshorts\b/g,'short film').replace(/\bshort-film\b/g,'short film').trim();
export const searchText = work => normalize([work.title, ...(work.aliases || []), work.creator, work.summary, ...(work.genres || []), work.format, work.award, work.selectionLabel].join(' '));
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Runtime unverified';
  const minutes = Math.floor(seconds / 60), rest = Math.round(seconds % 60);
  return minutes ? `${minutes}m${rest ? ` ${rest}s` : ''}` : `${rest}s`;
}
export function filterWorks(works, filters = {}) {
  const terms = normalize(String(filters.query||'').slice(0,100)).split(/\s+/).filter(Boolean);
  const saved = new Set(filters.saved || []);
  const result = works.filter(work => terms.every(term => searchText(work).includes(term)) &&
    (!filters.source || work.sourceId === filters.source || work.additionalRecognitions?.some(item => item.sourceId === filters.source)) &&
    (!filters.genre || work.genres.includes(filters.genre)) &&
    (!filters.format || work.format === filters.format) &&
    (!filters.year || String(work.year) === String(filters.year)) &&
    (!filters.shortOnly || Number.isFinite(work.durationSeconds) && work.durationSeconds > 0 && work.durationSeconds <= 300) &&
    (!filters.savedOnly || saved.has(work.id)));
  if (filters.sort === 'title') return result.sort((a, b) => a.title.localeCompare(b.title, 'en'));
  if (filters.sort === 'shortest') return result.sort((a, b) => (a.durationSeconds || Infinity) - (b.durationSeconds || Infinity) || a.title.localeCompare(b.title, 'en'));
  if (filters.sort === 'source-rank' && filters.source) {
    const rank = work => (work.sourceId === filters.source ? work.rank : work.additionalRecognitions?.find(item => item.sourceId === filters.source)?.rank) || Infinity;
    return result.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, 'en'));
  }
  // Mix source collections within a year; this is browsing order, never a popularity score.
  const mixed=[];
  for(const year of [...new Set(result.map(work=>work.year))].sort((a,b)=>b-a)){
    const groups=new Map();
    for(const work of result.filter(work=>work.year===year)){if(!groups.has(work.sourceId))groups.set(work.sourceId,[]);groups.get(work.sourceId).push(work);}
    const rows=[...groups.values()];
    for(let index=0;rows.some(row=>row[index]);index++)for(const row of rows)if(row[index])mixed.push(row[index]);
  }
  return mixed;
}
export function suggestWorks(works, query, limit = 6) {
  const q = normalize(query);
  if (!q) return [];
  return filterWorks(works, {query:q}).sort((a, b) => Number(normalize(b.title).startsWith(q)) - Number(normalize(a.title).startsWith(q))).slice(0, limit);
}
export function relatedWorks(works, selected, limit = 6) {
  return works.filter(work => work.id !== selected.id).map(work => {
    const common = work.genres.filter(genre => selected.genres.includes(genre));
    const reasons = common.length ? [`Shared theme: ${common.join(', ')}`] : [];
    if (work.format === selected.format) reasons.push('Same format');
    if (work.durationSeconds && selected.durationSeconds && Math.abs(work.durationSeconds - selected.durationSeconds) <= 120) reasons.push('Runtime within two minutes');
    return {work, reasons, score:common.length * 3 + reasons.length};
  }).filter(item => item.reasons.length).sort((a, b) => b.score - a.score || b.work.year - a.work.year).slice(0, limit);
}
export function sourceGroups(works, sources) {
  return sources.map(source => ({source, works:works.filter(work => work.sourceId === source.id)})).filter(group => group.works.length).sort((a, b) => b.source.year - a.source.year);
}
