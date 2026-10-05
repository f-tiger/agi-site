import {promoteSearchDetails} from './manju-work-urls.mjs';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {normalizeTitle,validateManju,importFacts} from './manju-catalog.mjs';
import {validateInsights} from './manju-insights.mjs';
const dir=new URL('../data/',import.meta.url),read=name=>JSON.parse(readFileSync(new URL(name,dir),'utf8'));
const categoryTags=[['仙侠','cultivation'],['修真','cultivation'],['末世','apocalypse'],['悬疑','suspense'],['怪谈','suspense'],['科幻','scifi'],['玄幻','fantasy'],['奇幻','fantasy'],['古装','historical'],['古代','historical'],['恋爱','romance'],['甜宠','romance'],['萌宝','family'],['家庭','family'],['种田','rural'],['乡村','rural'],['都市','urban'],['年代','period'],['武侠','martial'],['搞笑','comedy']];
export function refresh(catalog,insights,payload){
 const next=structuredClone(catalog),data=structuredClone(insights),seen=new Map(next.items.map(x=>[normalizeTitle(x.title),x]));
 if(payload.cohorts.length!==2||new Set(payload.cohorts.map(c=>c.kind)).size!==2)throw Error('Missing cohorts');
 const previous=new Map(data.cohorts.filter(c=>c.metric==='snapshot_heat').map(c=>[c.id.includes('comic-drama')?'comic-drama':'ai-drama',c]));
 let added=0;const changes=[];
 for(const incoming of payload.cohorts){
  const kind=incoming.kind;if(!['ai-drama','comic-drama'].includes(kind)||incoming.records.length!==100)throw Error('Unexpected cohort');
  const old=previous.get(kind),report=data.reports.find(r=>r.id===old.reportId),oldId=old.id;
  if(incoming.observedAt<report.observedAt)throw Error('Snapshot moved backwards');
  const id='hongguo-'+kind+'-'+incoming.observedAt,label=kind==='ai-drama'?'AI剧':'漫剧';
  Object.assign(report,{id,publishedAt:incoming.observedAt,observedAt:incoming.observedAt,periodStart:incoming.observedAt,periodEnd:incoming.observedAt,checkedAt:payload.checkedAt,checkedAtTime:payload.checkedAtTime,sourceDateLabel:incoming.observedAt+' 来源更新',scope:'公开榜单第 1—5 页，共 100 条（含分季）；每日自动读取并校验，非实时全网排名。平台分类不等于本站审计 AI 制作流程。'});
  const oldByURL=new Map(old.records.map(r=>[r.url,r]));
  changes.push({kind,newEntries:incoming.records.filter(r=>!oldByURL.has(r.url)).length,heatChanges:incoming.records.filter(r=>oldByURL.has(r.url)&&oldByURL.get(r.url).value!==r.value).length});
  Object.assign(old,{id,reportId:id,label:incoming.observedAt+' · 红果'+label+'热播榜',records:incoming.records.map(r=>({...r,format:'红果'+label+'榜（平台分类）'})),sourcePages:incoming.sourcePages});
  for(const t of data.topics.filter(t=>t.reportId===oldId)){
   const rows=old.records.filter(r=>r.tags.includes(t.sample.tag));
   if(!rows.length){data.topics=data.topics.filter(x=>x!==t);continue;}
   t.reportId=id;t.sample={...t.sample,cohortId:id,count:rows.length,denominator:old.records.length};t.evidenceCount=rows.length;t.examples=rows.slice(0,3).map(r=>r.title);
   t.evidence=`${incoming.observedAt} 红果官方${label}榜前 ${old.records.length} 条中，${rows.length} 条带“${t.sample.tag}”标签（含分季）。标签覆盖仅说明这份榜单的题材分布，不代表该细分题材必火；创作切口为本站建议。`;
  }
  for(const r of old.records){
   const key=normalizeTitle(r.title),existing=seen.get(key);
   if(existing){if(existing.evidence?.sourceKind==='hongguo-ranking'){existing.checkedAt=payload.checkedAt;existing.lastSeenAt=incoming.observedAt;existing.thumbnail=r.thumbnail;existing.source=r.thumbnail.source;existing.sourceDate=incoming.observedAt;existing.evidence.reportedTags=r.tags;existing.evidence.sourceHash=incoming.sourcePages.find(p=>p.url===r.thumbnail.source)?.sha256;existing.tags=r.tags.filter(t=>next.taxonomy.tags.includes(t));existing.category=categoryTags.find(([t])=>r.tags.includes(t))?.[1]||'drama';existing.genre=next.taxonomy.genres.find(g=>g.id===existing.category).label;existing.caption=r.tags.join(' · ');existing.synopsis='红果榜单分类：'+r.tags.join('、')+'。暂缺经核实的剧情介绍。';}continue;}
   const category=categoryTags.find(([t])=>r.tags.includes(t))?.[1]||'drama',genre=next.taxonomy.genres.find(g=>g.id===category)?.label;
   if(!genre)throw Error('Unknown taxonomy');
   const tags=r.tags.filter(t=>next.taxonomy.tags.includes(t));
   const x={id:'hg-'+new URL(r.url).searchParams.get('series_id'),title:r.title,genre,format:label+'（红果分类）',year:'年份未核实',platform:'红果',linkType:'collection',destination:r.url,cta:'到红果查看',synopsis:'红果榜单分类：'+r.tags.join('、')+'。暂缺经核实的剧情介绍。',angle:'按官方分类发现作品，播放和更新情况以原站为准。',aiEvidence:'收录于红果'+label+'榜；平台分类不代表本站独立核验 AI 制作流程。',source:r.thumbnail.source,publisher:'红果官方公开榜单',sourceDate:incoming.observedAt,status:'自动核对公开榜单元数据；未核验播放、集数、完结或素材授权。',caption:r.tags.join(' · '),checkedAt:payload.checkedAt,firstSeenAt:payload.checkedAt,lastSeenAt:incoming.observedAt,watched:false,sponsored:false,affiliate:false,channel:'stories',category,tags,recordType:'discovery',aiStatus:'platform-classified',seriesTitle:r.title.replace(/第[一二三四五六七八九十百零\d]+季$/u,''),thumbnail:r.thumbnail,evidence:{sourceKind:'hongguo-ranking',reportedTags:r.tags,sourceHash:incoming.sourcePages.find(p=>p.url===r.thumbnail.source)?.sha256}};
   next.items.push(x);seen.set(key,x);added++;
  }
 }
 next.updatedAt=payload.checkedAt;data.reviewedAt=payload.checkedAt;
 validateManju(next);validateInsights(data,next);
 promoteSearchDetails(next,data);
 return {catalog:next,insights:data,added,changes};
}
function atomic(name,data){const path=fileURLToPath(new URL(name,dir));writeFileSync(path+'.tmp',JSON.stringify(data,null,2)+'\n');renameSync(path+'.tmp',path);}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 let status={version:1,attemptedAt:new Date().toISOString(),schedule:'每日北京时间 08:30，复用 BPJ 发布任务',status:'failed'};
 try{
  const payload=JSON.parse(execFileSync('python3',[fileURLToPath(new URL('./manju-fetch.py',import.meta.url))],{timeout:400000,maxBuffer:4*1024*1024,encoding:'utf8'}));
  const result=refresh(read('manju.json'),read('manju-insights.json'),payload);
  let discoveryImport;
  try{const response=await fetch('https://baipiaoji.com/api/manju-discover',{headers:{'User-Agent':'BPJManjuDirectory/1.0'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('public-discovery-unavailable');const pending=await response.json();if(!Array.isArray(pending.records)||pending.records.length>300)throw Error('invalid-discovery-feed');const admitted=importFacts(pending.records,result.catalog);result.catalog.items.push(...admitted.items);validateManju(result.catalog);discoveryImport={status:'ok',fetched:pending.records.length,added:admitted.items.length,rejected:admitted.rejected.length};result.added+=admitted.items.length;}catch{discoveryImport={status:'unavailable',added:0};console.warn('On-demand discovery feed unavailable; existing catalogue retained.');}
  // Validate both complete candidates before replacing either persisted dataset.
  atomic('manju.json',result.catalog);atomic('manju-insights.json',result.insights);
  status={...status,status:'ok',completedAt:new Date().toISOString(),lastSuccessAt:payload.checkedAtTime,sourceDates:payload.cohorts.map(c=>({kind:c.kind,date:c.observedAt})),records:result.catalog.items.length,discoveryImport,added:result.added,changes:result.changes,sourceFingerprint:createHash('sha256').update(JSON.stringify(payload.cohorts)).digest('hex')};
 }catch(error){let previous={};try{previous=read('manju-sync-status.json');}catch{}status={...status,lastSuccessAt:previous.lastSuccessAt||null,error:'采集或数据校验失败；保留上次有效内容。详见 Actions 日志。'};console.error(String(error.message).slice(0,1500));process.exitCode=1;}
 atomic('manju-sync-status.json',status);console.log(JSON.stringify(status));
}
