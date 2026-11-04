// Stable work URLs are earned by dated official evidence, not by search keywords.
export const ROOT='https://baipiaoji.com/manju/';
const key=s=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
// Use the exact official identity, not a title or an arbitrary URL's query string.
export function officialWorkId(url){const match=/^https:\/\/hongguoduanju\.com\/detail\?series_id=(\d+)$/.exec(url);return match?'hg-'+match[1]:null;}
// A title is a discovery hint, not an official identity. Resolve exact official
// URLs first; a title-only association must have one catalogue and source target.
export function createWorkResolver(catalog,officialRecords=[]){
 const names=new Map(),ids=new Map(),targets=new Map();
 for(const x of catalog.items){const title=key(x.title);names.set(title,[...(names.get(title)||[]),x]);if(x.evidence?.sourceKind==='hongguo-ranking'&&officialWorkId(x.destination)===x.id)ids.set(x.id,x);}
 for(const r of officialRecords){if(!officialWorkId(r.url))continue;const title=key(r.title);if(!targets.has(title))targets.set(title,new Set());targets.get(title).add(r.url);}
 return record=>{
  const identity=officialWorkId(record.url),title=key(record.title),matches=names.get(title)||[],urls=targets.get(title)||new Set();
  if(identity&&ids.has(identity))return ids.get(identity);
  if(record.url&&!identity||matches.length!==1)return null;
  const x=matches[0],official=x.evidence?.sourceKind==='hongguo-ranking';
  if(identity&&official)return null;
  if(urls.size>1||urls.size===1&&((identity&& !urls.has(record.url))||(official&&!urls.has(x.destination))))return null;
  if(!official){const retained=new Set([...(x.searchEvidence||[]).map(e=>e.url),...urls,...(identity?[record.url]:[])]);if(retained.size>1)return null;}
  return x;
 };
}
export const hasWorkPage=x=>x.recordType!=='discovery'||Boolean(x.searchEvidence?.length);
export const workURL=x=>ROOT+(hasWorkPage(x)?'':'#work-')+x.id;
export function validateWorkEvidence(catalog){
 for(const x of catalog.items){if(!x.searchEvidence)continue;
  if(!Array.isArray(x.searchEvidence)||!x.searchEvidence.length||x.searchEvidence.length>2)throw Error('Invalid work evidence count');
  if(x.evidence?.sourceKind!=='hongguo-ranking'&&new Set(x.searchEvidence.map(e=>e.url)).size!==1)throw Error('Ambiguous nonofficial work evidence: '+x.id);
  const kinds=new Set();for(const e of x.searchEvidence){
   const sameWork=x.evidence?.sourceKind==='hongguo-ranking'?officialWorkId(e.url)===x.id&&e.url===x.destination:key(e.title)===key(x.title);
   if(kinds.has(e.kind)||!['ai-drama','comic-drama'].includes(e.kind)||typeof e.title!=='string'||!e.title.trim()||e.title.length>100||!sameWork||!/^\d{4}-\d{2}-\d{2}$/.test(e.observedAt)||!/^\d{4}-\d{2}-\d{2}$/.test(e.checkedAt)||e.observedAt>e.checkedAt||e.checkedAt>catalog.updatedAt||e.source!=='https://hongguoduanju.com/rank/hot-'+e.kind||!officialWorkId(e.url)||!Number.isInteger(e.rank)||e.rank<1||e.rank>100||!Number.isFinite(e.heat)||e.heat<0||e.sampleSize!==100||!Array.isArray(e.tags)||!e.tags.length||e.tags.some(t=>typeof t!=='string'||t.length>30))throw Error('Invalid dated work evidence: '+x.id);
   kinds.add(e.kind);
  }
 }
}
export function promoteSearchDetails(catalog,insights){
 const resolve=createWorkResolver(catalog,insights.cohorts.filter(c=>c.metric==='snapshot_heat').flatMap(c=>c.records));
 for(const c of insights.cohorts.filter(c=>c.metric==='snapshot_heat')){const report=insights.reports.find(r=>r.id===c.reportId),kind=c.id.includes('comic-drama')?'comic-drama':'ai-drama';
  for(const r of c.records){const x=resolve(r);if(!x||r.sourceRank>20&&!x.searchEvidence)continue;
   const e={kind,title:r.title,observedAt:report.observedAt,checkedAt:report.checkedAt,source:report.url,url:r.url,rank:r.sourceRank,heat:r.value,displayValue:r.displayValue,tags:r.tags,sampleSize:c.records.length};
   x.searchEvidence=[...(x.searchEvidence||[]).filter(old=>old.kind!==kind),e];
  }
 }
 validateWorkEvidence(catalog);
 return catalog.items.filter(x=>x.searchEvidence?.length).length;
}
