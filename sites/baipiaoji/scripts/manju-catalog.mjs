import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validThumbnail} from './manju-thumbnails.mjs';
const exclusions=JSON.parse(readFileSync(new URL('../data/manju-exclusions.json',import.meta.url),'utf8')).items;
export const normalizeTitle=s=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
const sourceAliases={'总裁':'豪门','诡秘':'怪谈','囤物资':'囤货','玄幻脑洞':'玄幻','传统玄幻':'玄幻','都市脑洞':'脑洞','玄幻言情':'恋爱','都市修真':'修真','合家欢':'家庭','喜剧':'搞笑','古风':'古代','升级流':'升级','青春':'校园'};
const categories=[['武侠','martial'],['怪谈','suspense'],['家庭','family'],['修真','cultivation'],['仙侠','cultivation'],['末世','apocalypse'],['科幻','scifi'],['悬疑','suspense'],['恋爱','romance'],['家族','family'],['萌宝','family'],['宫廷','historical'],['古代','historical'],['年代','period'],['民国','period'],['玄幻','fantasy'],['奇幻','fantasy'],['异界','fantasy'],['都市','urban'],['乡村','rural'],['剧情','drama'],['脑洞','fantasy'],['校园','urban'],['豪门','urban'],['搞笑','comedy'],['日常','drama']];
export const extraGenres=[['romance','恋爱'],['family','家庭'],['cultivation','仙侠'],['apocalypse','末世'],['period','年代'],['rural','乡村'],['drama','剧情'],['martial','武侠'],['comedy','喜剧']].map(([id,label])=>({id,label}));
export const extraTags=['穿越','重生','逆袭','系统','异能','战斗','求生','搞笑','乡村','校园','豪门','家族','修真','日常','萌宝','娱乐圈','无限流','热血','反转','宫廷','脑洞','剧情','古代','恋爱','都市','年代','科幻','玄幻','悬疑','末世','异界','奇幻','民国','无厘头','玩梗','萌系','怪谈','囤货','家庭','升级','武侠','架空','战神'];
export function importFacts(facts,catalog){
 const items=[],rejected=[],seen=new Set(catalog.items.map(x=>normalizeTitle(x.title))),genres=[...catalog.taxonomy.genres,...extraGenres],tagsAllowed=new Set([...catalog.taxonomy.tags,...extraTags]);
 for(const f of facts){
  const title=String(f.title||'').trim(),key=normalizeTitle(title);
  if(!title||title.length>100||seen.has(key)){rejected.push({title,reason:'empty, duplicate or overlong title'});continue;}
  if(exclusions.some(x=>key.includes(normalizeTitle(x.title)))){rejected.push({title,reason:'excluded rights/takedown report'});continue;}
  if(!/^https:\/\/www\.duanjubaike\.net\/manju\/info-\d+\.html$/.test(f.source)||f.sourceClaim!=='AI漫剧'||!f.sourceTitle?.includes('AI漫剧《'+title+'》')||!/^\d{4}-\d{2}-\d{2}$/.test(f.checkedAt)||!Array.isArray(f.reportedTags)||!f.reportedTags.length||!/^[a-f0-9]{64}$/.test(f.sourceHash||'')){rejected.push({title,reason:'missing exact source, AI label, dated evidence or hash'});continue;}
  const sourceTags=f.reportedTags.map(t=>sourceAliases[t]||t);const category=categories.find(([tag])=>sourceTags.includes(tag))?.[1];
  const genreWords=new Set(['古代','都市','年代','科幻','玄幻','悬疑','末世','异界','奇幻','民国','恋爱','乡村','宫廷','剧情','修真','武侠','架空']);
  const tags=[...new Set(sourceTags.filter(t=>tagsAllowed.has(t)&&!genreWords.has(t)))];
  if(!category||sourceTags.some(t=>!tagsAllowed.has(t))){rejected.push({title,reason:'unreviewed vocabulary',tags:f.reportedTags});continue;}
  const id='mj-'+createHash('sha256').update(key).digest('hex').slice(0,12),genre=genres.find(g=>g.id===category).label;
  const m=/^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(f.reportedReleaseDate||'');
  const reportedReleaseDate=m?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:null;
  if(!reportedReleaseDate||reportedReleaseDate>f.checkedAt){rejected.push({title,reason:'missing or future reported release date'});continue;}
  seen.add(key);
  items.push({id,title,genre,format:'AI漫剧（来源标注）',year:m[1],platform:'抖音（搜索）',linkType:'search',destination:'https://www.douyin.com/search/'+encodeURIComponent(title),cta:'按剧名查找',synopsis:'题材：'+genre+(tags.length?'；情节线索：'+tags.join('、'):'')+'。依据公开目录分类整理。',angle:'先按题材筛选，再核对作品的官方发布者。',aiEvidence:'第三方资料页标题明确标注“AI漫剧”。该标注未经本站独立制作流程审计，暂未取得官方制作说明。',source:f.source,publisher:'短剧百科（第三方目录）',sourceDate:'未标明',status:'仅核对公开目录资料。平台搜索可能含同名或转载，未核验播放、集数、完结或授权情况。',caption:tags.length?tags.slice(0,3).join(' · '):genre+'题材 · 暂缺剧情标签',checkedAt:f.checkedAt,watched:false,sponsored:false,affiliate:false,channel:'stories',category,tags,recordType:'discovery',aiStatus:'source-labelled',reportedReleaseDate,seriesTitle:title.replace(/第[一二三四五六七八九十百零\d]+季$/u,''),evidence:{sourceTitle:f.sourceTitle,reportedTags:f.reportedTags,sourceClaim:f.sourceClaim,sourceHash:f.sourceHash}});
 }
 return {items,rejected};
}
export function validateManju(catalog){
 const seen=new Set(),ids=new Set();
 for(const x of catalog.items){
  const key=normalizeTitle(x.title);
  if(seen.has(key)||ids.has(x.id))throw Error('Duplicate manju identity: '+x.id);seen.add(key);ids.add(x.id);
  if(exclusions.some(e=>key.includes(normalizeTitle(e.title))))throw Error('Excluded manju: '+x.title);
  if(!/^https:\/\//.test(x.source)||!/^\d{4}-\d{2}-\d{2}$/.test(x.checkedAt))throw Error('Missing source/date: '+x.id);
  if(x.evidence?.sourceKind==='hongguo-ranking'){
   if(x.recordType!=='discovery'||!/^hg-\d+$/.test(x.id)||x.destination!=='https://hongguoduanju.com/detail?series_id='+x.id.slice(3)||!/^https:\/\/hongguoduanju\.com\/rank\/hot-(ai|comic)-drama(?:\?page=[2-5])?$/.test(x.source)||x.linkType!=='collection'||x.aiStatus!=='platform-classified'||!validThumbnail(x.thumbnail)||!Array.isArray(x.evidence.reportedTags)||!/^[a-f0-9]{64}$/.test(x.evidence.sourceHash)||x.watched||x.sponsored||x.affiliate)throw Error('Invalid official discovery: '+x.id);
  }else if(x.recordType==='discovery'){
   const {items}=importFacts([{title:x.title,source:x.source,sourceTitle:x.evidence?.sourceTitle,sourceClaim:x.evidence?.sourceClaim,sourceHash:x.evidence?.sourceHash,reportedTags:x.evidence?.reportedTags,reportedReleaseDate:x.reportedReleaseDate?.replace(/^(\d+)-(\d+)-(\d+)$/,'$1年$2月$3日'),checkedAt:x.checkedAt}],{...catalog,items:[]});
   if(items.length!==1||items[0].id!==x.id||items[0].category!==x.category||JSON.stringify(items[0].tags)!==JSON.stringify(x.tags)||items[0].synopsis!==x.synopsis||x.aiStatus!=='source-labelled'||x.sourceDate!=='未标明')throw Error('Invalid discovery evidence: '+x.id);
   if(x.destination!=='https://www.douyin.com/search/'+encodeURIComponent(x.title)||x.linkType!=='search'||x.watched||x.sponsored||x.affiliate)throw Error('Unreviewed viewing/commercial claim: '+x.id);
  }
 }
 return {records:ids.size,editorial:catalog.items.filter(x=>x.recordType!=='discovery').length,discovery:catalog.items.filter(x=>x.recordType==='discovery').length};
}
// Offline preparation only. An editor reviews the candidate diff before catalogue publication.
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/manju-catalog.mjs reviewed-facts.json candidates.json');
 const catalog=JSON.parse(readFileSync(new URL('../data/manju.json',import.meta.url),'utf8')),result=importFacts(JSON.parse(readFileSync(input,'utf8')),catalog);writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({accepted:result.items.length,rejected:result.rejected.length,output}));
}
