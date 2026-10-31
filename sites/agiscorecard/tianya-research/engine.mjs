export const VERSION='evidence-gate-1.1';
export function evaluate(r,mode='strict'){
 const missing=[];
 const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v));
 const temporalPass=!!r.preEventVerified&&validDate(r.firstVerified)&&validDate(r.eventDate)&&r.firstVerified<r.eventDate;
 if(!r.textVerified)missing.push('尚缺可核对的预测文本');
 if(!temporalPass)missing.push('尚未取得可验证的事件前或到期前文本版本');
 if(!r.specific)missing.push('期限或判定口径不足，无法严格证伪');
 if(!r.outcomeComparable)missing.push('结果资料不足，或地区、指标口径不同');
 if(validDate(r.firstVerified)&&validDate(r.eventDate)&&r.firstVerified>=r.eventDate)missing.push('可核实出现日期不早于核验截止时点');
 if(r.alreadyKnown)missing.push('相关事实当时已公开，不能认定为提前预见');
 if(r.misattributed)missing.push('原文语境不支持网传的作者观点归属');
 const checks=[!!r.textVerified,temporalPass,!!r.specific,!!r.outcomeComparable];
 const outcome=computeObservation(r).status;
 const verdict=missing.length?'unknown':outcome;
 return {id:r.id,verdict,observation:outcome,reasons:missing,checks,completed:checks.filter(Boolean).length,mode,display:mode==='explore'?outcome:verdict};
}
export function computeObservation(r){
 const t=r.numericTest;
 if(t?.type==='sales-average'){
  const baseline=t.baseline.value/t.baseline.area*10000;
  const outcome=t.outcome.value/t.outcome.area*10000;
  const ratio=outcome/baseline;
  return {status:ratio<=t.targetRatio?'support':'contradict',baseline,outcome,ratio,target:baseline*t.targetRatio,change:(ratio-1)*100};
 }
 return {status:r.observation||'unknown'};
}
export function dedupe(records){return [...new Map(records.map(r=>[r.id,r])).values()];}
export function summarize(records){
 const unique=dedupe(records);const results=unique.map(r=>evaluate(r));
 const k=results.filter(r=>r.verdict==='support').length;
 const m=results.filter(r=>r.verdict==='contradict').length;
 const u=results.filter(r=>r.verdict==='unknown'||r.verdict==='mixed').length;
 const n=unique.length;
 return {n,k,m,u,groups:new Set(unique.map(r=>r.cluster)).size,coverage:n?(k+m)/n:0,decidedRatio:k+m?k/(k+m):null,lower:n?k/n:0,upper:n?(k+u)/n:1};
}
export function groupVerdict(records){
 const v=dedupe(records).map(r=>evaluate(r).verdict);
 if(v.includes('support')&&v.includes('contradict'))return 'mixed';
 if(v.includes('unknown'))return 'unknown';
 return v[0]||'unknown';
}
export const mechanismLexicon=[
 {id:'policy',label:'政策与制度',terms:['政策','调控','政府','公租房','税','垄断']},
 {id:'credit',label:'信用与资金',terms:['资金','信贷','货币','贷款','金融','外资']},
 {id:'demand',label:'需求与购买力',terms:['购买力','买房','需求','收入','人口','富人']},
 {id:'supply',label:'供给与土地',terms:['土地','供给','供应','建设','开发商','住房']},
 {id:'digital',label:'数字资产',terms:['比特币','数字货币','法币','ICO','区块链']},
 {id:'automation',label:'智能与自动化',terms:['人工智能','AI','机器人','无人驾驶','搜索']},
 {id:'adoption',label:'应用与部署',terms:['部署','普及','应用','产品','成本','能力']},
 {id:'cycle',label:'周期与时点',terms:['周期','十年','年底','奥运','时间','下跌']}
];
export function extractMechanisms(records){
 const docs=dedupe(records).map(r=>({r,text:r.analysisText||r.claim}));const n=docs.length;
 const nodes=mechanismLexicon.map(entry=>{
  const matches=docs.map(({r,text})=>({id:r.id,cluster:r.cluster,count:entry.terms.reduce((s,t)=>s+(text.split(t).length-1),0)})).filter(x=>x.count>0);
  const idf=Math.log((1+n)/(1+matches.length))+1;
  return {...entry,matches,df:matches.length,groups:new Set(matches.map(x=>x.cluster)).size,weight:matches.reduce((s,x)=>s+Math.log(1+x.count)*idf,0)};
 });
 const edges=[];
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  const a=new Set(nodes[i].matches.map(x=>x.cluster)),b=new Set(nodes[j].matches.map(x=>x.cluster));
  const intersection=[...a].filter(x=>b.has(x)).length,union=new Set([...a,...b]).size;
  if(intersection)edges.push({source:nodes[i].id,target:nodes[j].id,count:intersection,jaccard:intersection/union});
 }
 return {nodes,edges,documentCount:n,threadCount:new Set(docs.map(x=>x.r.cluster)).size};
}

export function compareDomains(records){return [...new Set(['金融','Web3','AI','机器人',...records.map(r=>r.domain)])].map(domain=>{const rs=dedupe(records).filter(r=>r.domain===domain);const obs=rs.map(r=>computeObservation(r).status);return {domain,n:rs.length,groups:new Set(rs.map(r=>r.cluster)).size,specific:rs.filter(r=>r.specific).length,comparable:rs.filter(r=>r.outcomeComparable).length,support:obs.filter(x=>x==='support').length,contradict:obs.filter(x=>x==='contradict').length,mixed:obs.filter(x=>x==='mixed').length,unknown:obs.filter(x=>x==='unknown').length,decided:rs.filter(r=>['support','contradict'].includes(evaluate(r).verdict)).length};});}
