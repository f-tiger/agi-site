import {hourConversionOf} from './plan.mjs';
import {calculate,safeURL} from '../../jarvis-assets/core.mjs';

export const SCREENING_CONTRACT='metadata-screening-v1';
const text=(v,n)=>typeof v==='string'&&v.length>0&&v.length<=n;
// This is a deliberately narrow routing hint, not an intent/completeness proof.
// A routed result is always scope-limited. All other tasks keep their AI path.
export function isMetadataScreening(input){
 const g=input?.goal;if(input?.web!==true||typeof g!=='string'||/^(?:继续推进这个目标|修正这个目标|Continue this goal|Revise this goal)/i.test(g))return false;
 if(!/github/i.test(g)||!/(?:元数据|\bmetadata\b)/i.test(g)||!/(?:(?:一个|一项|一款)[^。；;\n]{0,60}(?:候选|项目|仓库)|\b(?:one|a)\b[^.;\n]{0,60}\b(?:candidate|project|repository)\b)/i.test(g)||!/(?:进一步阅读|深入阅读|继续阅读|初筛|初步筛选|\bfurther reading\b|\bscreen(?:ing)?\b)/i.test(g))return false;
 if(/(?:do not|don't|never|without)[^.;\n]{0,80}(?:github|metadata)|(?:不要|无需|别)[^。；;\n]{0,80}(?:GitHub|元数据)/i.test(g))return false;
 // Do not silently replace explicit comparisons, multiple candidates, licence,
 // language or deployment filters with the first result from a search response.
 if(/(?:不要|无需|别)[^。；;\n]{0,120}候选|\b(?:no|not|without)\s+(?:a\s+)?candidate\b|(?:[2-9]|\d{2,}|两|二|三|四|五|多)\s*个[^。；;\n]{0,20}候选|\b(?:two|three|four|five|multiple|several|[2-9])\s+(?:\w+\s+){0,3}candidates?\b|\b(?:compare|rank|best|MIT|Apache|Python|offline)\b|比较|对比|排名|最佳|离线部署/i.test(g))return false;
 return true;
}
const sourceFields=(s,fields)=>fields.filter(field=>Object.hasOwn(s,field)&&s[field]!==null&&s[field]!==undefined).map(field=>({sourceId:s.id,field,value:s[field]}));
function repository(s){
 if(s?.kind!=='repository_metadata'||!/^github-\d{1,20}$/.test(s.id)||!text(s.title,160)||!/^[-\w.]+\/[-\w.]+$/.test(s.title)||typeof s.url!=='string'||s.url.length>2048||typeof s.description!=='string'||s.description.length>700)return false;
 return safeURL(s.url)==='https://github.com/'+s.title;
}
function discussion(s){return s?.kind==='discussion_metadata'&&/^hn-\d{1,20}$/.test(s.id)&&text(s.title,200)&&s.url==='https://news.ycombinator.com/item?id='+s.id.slice(3)&&typeof s.description==='string'&&s.description.length<=700;}

// No model-authored text enters this contract. It copies attributed metadata,
// checks known arithmetic, and proposes a fixed inspection artifact. It does not
// establish that a publisher's description is true, nor validate arbitrary prose.
export function metadataPacket(input,sources,plan){
 if(!isMetadataScreening(input)||!Array.isArray(sources)||sources.length>14||sources.some(s=>!s||typeof s!=='object'||Array.isArray(s)||!text(s.id,120))||new Set(sources.map(s=>s.id)).size!==sources.length)throw Error('evidence_unavailable');
 const repo=sources.find(repository);if(!repo)throw Error('evidence_unavailable');
 const zh=input.lang==='zh',t=(en,cn)=>zh?cn:en;
 const arithmetic=sources.filter(s=>s.kind==='arithmetic').map(s=>{
  if(!text(s.title,120)||typeof s.description!=='string'||s.id!=='calc-'+s.title.replace(/\s/g,''))throw Error('evidence_unavailable');
  let checked;try{checked=calculate(s.title);}catch{throw Error('evidence_unavailable');}
  if(s.description!==String(checked.value))throw Error('evidence_unavailable');
  return {sourceId:s.id,expression:s.title,result:s.description,fields:sourceFields(s,['title','description'])};
 });
 for(const a of plan?.actions||[])if(a.tool==='calculate'&&!arithmetic.some(c=>c.sourceId==='calc-'+a.query.replace(/\s/g,'')))throw Error('evidence_unavailable');
 const conversion=hourConversionOf(input.goal);
 if(conversion&&!plan?.actions?.some(a=>a.tool==='calculate'&&a.query===conversion.hours+'*60'))throw Error('evidence_unavailable');
 if(conversion&&(!text(conversion.hours,12)||conversion.fromUnit!=='hours'||conversion.toUnit!=='minutes'||!['week',null].includes(conversion.period)||!arithmetic.some(c=>c.sourceId===conversion.sourceId&&c.expression===conversion.hours+'*60')))throw Error('evidence_unavailable');
 const converted=conversion&&arithmetic.find(c=>c.sourceId===conversion.sourceId);
 const conversionText=converted?t(`${conversion.period==='week'?'Per week: ':''}${conversion.hours} hours = ${converted.result} minutes.`,`${conversion.period==='week'?'每周：':''}${conversion.hours} 小时 = ${converted.result} 分钟。`):'';
 const hn=sources.filter(discussion);
 const findings=[
  {text:t('Repository name returned by GitHub: ','GitHub 返回的仓库名：')+repo.title,sourceIds:[repo.id],sourceFields:sourceFields(repo,['title'])},
  {text:t('Repository URL returned by GitHub: ','GitHub 返回的仓库 URL：')+repo.url,sourceIds:[repo.id],sourceFields:sourceFields(repo,['url'])},
  {text:(repo.description?t('Returned description excerpt (may be truncated; publisher claim, not independently verified): ','检索记录中的 description（可能截断；发布者自述，未独立核验）：'):t('Publisher description: ','发布者 description：'))+(repo.description||t('(not available; unknown whether absent or invalid upstream)','（不可用；无法区分上游缺失或格式无效）')),sourceIds:[repo.id],sourceFields:sourceFields(repo,['description'])},
  ...arithmetic.map(c=>({text:c.sourceId===conversion?.sourceId?conversionText:t('Local arithmetic: ','本地算术：')+c.expression+' = '+c.result,sourceIds:[c.sourceId],sourceFields:c.fields}))
 ];
 if(Number.isSafeInteger(repo.stars)&&repo.stars>=0)findings.push({text:t('Stars in the retrieved snapshot (not a quality rating): ','检索快照中的 stars（不代表质量）：')+repo.stars,sourceIds:[repo.id],sourceFields:sourceFields(repo,['stars'])});
 for(const s of hn)findings.push({text:t('HN title only; no relationship to this repository established: ','仅 HN 标题，未证实与此仓库相关：')+s.title,sourceIds:[s.id],sourceFields:sourceFields(s,['title','url'])});
 const minutes=converted?Number(converted.result):null,timebox=minutes>0?Math.min(30,minutes):null;
 const nextActions=[{kind:'inspect_repository_record',sourceId:repo.id,
  action:(timebox?t(`Suggested timebox: at most ${timebox} minutes. `,`建议最多用 ${timebox} 分钟。`):t('Choose a timebox before starting. ','开始前先确定时间上限。'))+t('Open the candidate repository. Check whether README and LICENSE files are present; do not install or run code.','打开候选仓库，核对是否有 README 和 LICENSE；不安装或运行代码。'),
  doneWhen:t('Save one checklist with the repository URL, the returned description, README and LICENSE links if found (otherwise “not found”), and unanswered questions. Stop at the time limit, even if incomplete.','保存一份清单，包含仓库 URL、返回的 description、找到的 README 和 LICENSE 链接（未找到则如实记录），以及待答问题。到时停止，未完成也如实记录。'),
  ...(timebox?{timeboxMinutes:timebox}:{})}];
 return {contract:SCREENING_CONTRACT,mode:'rules_no_model',scope:'metadata_only',taskAcceptance:'not_assessed',
  summary:t('Rule-based reading candidate: ','规则初筛阅读候选：')+repo.title+t('. Selected as the first valid GitHub record in the returned order; suitability is unverified. ','。按本次返回顺序取首个有效 GitHub 记录，未验证适用性。')+conversionText,
  findings,nextActions,uncertainties:[
   t('The description is the publisher’s claim. License, code safety, reliability, installation difficulty, performance and commercial returns are unknown; README, code, articles and comments were not read.','description 属于发布者自述。许可、代码安全、可靠性、安装难度、性能与商业收益均未知；未读取 README、代码、全文或评论。'),
   t('This packet covers copied metadata, executed arithmetic and a proposed checklist only. Additional goal conditions, relevance and real-world completion have not been assessed.','此资料包仅覆盖原始元数据、已执行算术和建议核查清单。目标的额外条件、相关性及现实完成情况未评估。'),
   ...(hn.length?[]:[t('No usable HN metadata was retained.','未保留可用的 HN 元数据。')]),
   ...(!timebox?[t('No positive hours-to-minutes time budget was established.','未确立正数的小时到分钟时间预算。')]:[])
  ],coverage:{candidate:'first_valid_returned_repository',arithmeticSourceIds:arithmetic.map(c=>c.sourceId),hourConversion:converted?{...conversion,result:converted.result}:null,nextStep:'proposed_not_executed',otherGoalConditions:'not_assessed'},
  evidence:sourceFields(repo,['title','url','description',...(Number.isSafeInteger(repo.stars)&&repo.stars>=0?['stars']:[])])};
}
