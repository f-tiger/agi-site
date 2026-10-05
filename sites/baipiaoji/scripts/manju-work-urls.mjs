// Stable work URLs are earned by dated official evidence, not by search keywords.
export const ROOT='https://baipiaoji.com/manju/';
const key=s=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
export const hasWorkPage=x=>x.recordType!=='discovery'||Boolean(x.searchEvidence?.length);
export const workURL=x=>ROOT+(hasWorkPage(x)?'':'#work-')+x.id;
export function validateWorkEvidence(catalog){
 for(const x of catalog.items){if(!x.searchEvidence)continue;
  if(!Array.isArray(x.searchEvidence)||!x.searchEvidence.length||x.searchEvidence.length>2)throw Error('Invalid work evidence count');
  const kinds=new Set();for(const e of x.searchEvidence){
   if(kinds.has(e.kind)||!['ai-drama','comic-drama'].includes(e.kind)||key(e.title)!==key(x.title)||!/^\d{4}-\d{2}-\d{2}$/.test(e.observedAt)||!/^\d{4}-\d{2}-\d{2}$/.test(e.checkedAt)||e.observedAt>e.checkedAt||e.checkedAt>catalog.updatedAt||e.source!=='https://hongguoduanju.com/rank/hot-'+e.kind||!/^https:\/\/hongguoduanju\.com\/detail\?series_id=\d+$/.test(e.url)||!Number.isInteger(e.rank)||e.rank<1||e.rank>100||!Number.isFinite(e.heat)||e.heat<0||e.sampleSize!==100||!Array.isArray(e.tags)||!e.tags.length||e.tags.some(t=>typeof t!=='string'||t.length>30))throw Error('Invalid dated work evidence: '+x.id);
   kinds.add(e.kind);
  }
 }
}
export function promoteSearchDetails(catalog,insights){
 const byTitle=new Map(catalog.items.map(x=>[key(x.title),x]));
 for(const c of insights.cohorts.filter(c=>c.metric==='snapshot_heat')){const report=insights.reports.find(r=>r.id===c.reportId),kind=c.id.includes('comic-drama')?'comic-drama':'ai-drama';
  for(const r of c.records){const x=byTitle.get(key(r.title));if(!x||r.sourceRank>20&&!x.searchEvidence)continue;
   const e={kind,title:r.title,observedAt:report.observedAt,checkedAt:report.checkedAt,source:report.url,url:r.url,rank:r.sourceRank,heat:r.value,displayValue:r.displayValue,tags:r.tags,sampleSize:c.records.length};
   x.searchEvidence=[...(x.searchEvidence||[]).filter(old=>old.kind!==kind),e];
  }
 }
 validateWorkEvidence(catalog);
 return catalog.items.filter(x=>x.searchEvidence?.length).length;
}
