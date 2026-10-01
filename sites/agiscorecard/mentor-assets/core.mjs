export const VERSION='mentor-20261001-2';
export const PRODUCT='work-mentor';
export const MODEL='@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const DAY=86400000;
export const fields=['orders','revenue','channel','growth','claim'];
export const channels=['email','social','referral'];
export function makeCase(seed=1){
 if(!Number.isInteger(seed)||seed<1||seed>999999)throw Error('bad_case');
 let x=seed;const rnd=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x;};
 const rows=[];const count=6+seed%3;
 for(let i=0;i<count;i++){const amount=(8+rnd()%32)*1000,refund=i%4===1?(1+rnd()%4)*1000:0;rows.push({id:'C'+(i+1),week:'current',channel:channels[(i+seed)%3],status:'paid',amount,refund});}
 rows.push({id:'C-X',week:'current',channel:'social',status:'cancelled',amount:80000,refund:0});
 for(let i=0;i<5;i++)rows.push({id:'P'+(i+1),week:'previous',channel:channels[i%3],status:'paid',amount:(9+rnd()%28)*1000,refund:i===2?2000:0});
 return {seed,currency:'USD',rows};
}
export function solution(c){
 const current=c.rows.filter(r=>r.week==='current'&&r.status==='paid'),prev=c.rows.filter(r=>r.week==='previous'&&r.status==='paid');
 const revenue=current.reduce((s,r)=>s+r.amount-r.refund,0),previous=prev.reduce((s,r)=>s+r.amount-r.refund,0),totals=Object.fromEntries(channels.map(k=>[k,current.filter(r=>r.channel===k).reduce((s,r)=>s+r.amount-r.refund,0)]));
 const best=Math.max(...Object.values(totals));
 return {orders:current.length,revenue:revenue/100,previous:previous/100,growth:(revenue-previous)/previous*100,channel:channels.filter(k=>totals[k]===best),claim:'unproven',totals};
}
export function answersOf(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('bad_answers');
 const out={};for(const k of fields){const v=raw[k];if(v!==undefined&&typeof v!=='string'&&typeof v!=='number')throw Error('bad_answers');out[k]=String(v??'').trim();if(out[k].length>30)throw Error('bad_answers');}
 return out;
}
export function grade(seed,raw){
 const a=answersOf(raw),s=solution(makeCase(seed));
 const number=k=>a[k]!==''&&/^-?\d+(?:\.\d+)?$/.test(a[k])?Number(a[k]):NaN;
 const checks={orders:number('orders')===s.orders,revenue:Math.abs(number('revenue')-s.revenue)<.005,channel:s.channel.includes(a.channel),growth:Math.abs(number('growth')-s.growth)<=.06,claim:a.claim==='unproven'};
 const passed=fields.filter(k=>checks[k]).length;
 return {checks,passed,total:fields.length,pass:passed===fields.length,score:passed*20,next:fields.find(k=>!checks[k])||'transfer'};
}
export function blankState(){return {goal:'weekly-report',minutes:15,tools:'spreadsheet-ai',seed:1,stage:'baseline',assisted:false,attempts:[],applied:false,draft:answersOf({})};}
export function restore(value){
 const s=value?.product===PRODUCT&&value.version===1?value.values:value;
 if(!s||s.goal!=='weekly-report'||!['spreadsheet','spreadsheet-ai'].includes(s.tools)||![10,15,25].includes(s.minutes)||!['baseline','practice','transfer'].includes(s.stage))throw Error('bad_record');
 makeCase(s.seed);if(!Array.isArray(s.attempts)||s.attempts.length>40)throw Error('bad_record');
 const attempts=s.attempts.map(a=>{
  if(!a||!['baseline','practice','transfer'].includes(a.stage)||!Number.isFinite(a.at)||a.at<0||a.at>Date.now()+DAY||!Number.isFinite(a.elapsed)||a.elapsed<0||a.elapsed>86400||typeof a.assisted!=='boolean'||!['spreadsheet','spreadsheet-ai'].includes(a.tools))throw Error('bad_record');
  return {seed:a.seed,stage:a.stage,at:a.at,elapsed:a.elapsed,assisted:a.assisted,tools:a.tools,answers:answersOf(a.answers),result:grade(a.seed,a.answers)};
 });
 return {...blankState(),minutes:s.minutes,tools:s.tools,seed:s.seed,stage:s.stage,assisted:!!s.assisted,attempts,applied:!!s.applied,draft:answersOf(s.draft||{})};
}
export function progress(state,now=Date.now()){
 const all=state.attempts,independent=all.filter(a=>a.result.pass&&!a.assisted),first=independent[0];
 const retained=first&&independent.some(a=>a.seed!==first.seed&&a.at-first.at>=3*DAY&&a.tools===first.tools);
 const fresh=independent.some(a=>a.stage==='transfer'&&!all.some(p=>p.at<a.at&&p.seed===a.seed));
 return {level:retained?3:fresh?2:all.some(a=>a.result.pass)?1:0,completed:new Set(all.filter(a=>a.result.pass).map(a=>a.seed)).size,independent:independent.length,dueAt:first?first.at+3*DAY:null,due:!!first&&now>=first.at+3*DAY&&!retained};
}
export function comparison(state){
 const base=state.attempts.find(a=>a.stage==='baseline'),last=state.attempts.at(-1);
 if(!base||!last||base===last)return null;
 return {before:base.result.passed,after:last.result.passed,total:5,sameTools:base.tools===last.tools,quality:base.result.pass&&last.result.pass,seconds:base.result.pass&&last.result.pass&&base.tools===last.tools?base.elapsed-last.elapsed:null,assisted:last.assisted};
}
export function csv(seed){return 'id,week,channel,status,gross_usd,refund_usd\n'+makeCase(seed).rows.map(r=>[r.id,r.week,r.channel,r.status,(r.amount/100).toFixed(2),(r.refund/100).toFixed(2)].join(',')).join('\n');}
export function record(state){return {version:1,product:PRODUCT,values:restore(state)};}
export function sourceOf(url,referrer=''){
 let ref='';try{ref=new URL(referrer).hostname;}catch{}
 const q=new URL(url).searchParams,tag=q.get('utm_source');let source='direct',evidence='unattributed';
 if(/(^|\.)(youtube\.com|youtu\.be)$/.test(ref)){source='youtube';evidence='referrer';}
 else if(/(^|\.)tiktok\.com$/.test(ref)){source='tiktok';evidence='referrer';}
 else if(/(^|\.)(baipiaoji\.com|agiscorecard\.com)$/.test(ref)){source='owned';evidence='referrer';}
 else if(/(^|\.)(google\.com|bing\.com)$/.test(ref)){source='search';evidence='referrer';}
 else if(['youtube','tiktok','owned'].includes(tag)){source=tag;evidence='tag_only';}
 else if(ref){source='other';evidence='referrer';}
 return {source,evidence,campaign:q.get('utm_campaign')==='mentor-report-01'?'mentor-report-01':'organic'};
}
