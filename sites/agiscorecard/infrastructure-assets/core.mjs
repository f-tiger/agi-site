export const PRODUCT='ai-infrastructure';
export const METRICS=['revenue','income','ocf','capex','inventory'];
export const TICKERS=['NVDA','AMD','AVGO','MRVL','MU','INTC','DELL','SMCI','HPE','ANET','VRT','ETN','MSFT','AMZN','GOOGL','META','ORCL','EQIX','DLR','SNPS'];
export const MODEL='@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const usable=f=>f&&Number.isFinite(f.val)&&!f.error;
export const baseline=c=>Object.fromEntries(METRICS.filter(k=>usable(c.facts[k])).map(k=>[k,{val:c.facts[k].val,end:c.facts[k].end,filed:c.facts[k].filed}]));
export function changes(c,old){return METRICS.filter(k=>old?.[k]&&usable(c.facts[k])&&(old[k].val!==c.facts[k].val||old[k].end!==c.facts[k].end));}
export function stale(c,now=Date.now()){return !!c.refresh_failed||now-Date.parse(c.checked_at)>72*3600e3;}
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function normalize(raw){
 if(raw?.version!==1||raw.product!==PRODUCT||!raw.values||typeof raw.values!=='object')throw Error('record');
 if(JSON.stringify(raw).length>60000)throw Error('size');
 const v=raw.values;if(!TICKERS.includes(v.selected)||!Array.isArray(v.watch)||v.watch.some(t=>!TICKERS.includes(t)))throw Error('ticker');
 const out={selected:v.selected,watch:[...new Set(v.watch)],notes:{}};
 for(const [t,n]of Object.entries(v.notes||{})){
  if(!TICKERS.includes(t)||!n||typeof n!=='object')throw Error('note');
  const note={};for(const k of ['thesis','counter','trigger','review']){if(typeof n[k]!=='string'||n[k].length>2000)throw Error('note');note[k]=n[k];}
  if(note.review&&!validDate(note.review))throw Error('date');
  note.baseline={};for(const [k,f]of Object.entries(n.baseline||{})){
   if(!METRICS.includes(k)||!Number.isFinite(f?.val)||!validDate(f.end)||!validDate(f.filed))throw Error('baseline');
   note.baseline[k]={val:f.val,end:f.end,filed:f.filed};
  }
  out.notes[t]=note;
 }
 return {version:1,product:PRODUCT,values:out};
}
export const emptyNote=()=>({thesis:'',counter:'',trigger:'',review:'',baseline:{}});
export function validateReview(raw,c){
 if(!raw||!Array.isArray(raw.checks)||raw.checks.length<2||raw.checks.length>4)throw Error('ai_failed');
 const ids=new Set(Object.values(c.facts).filter(usable).map(f=>f.id));
 return {checks:raw.checks.map(x=>{
  if(typeof x?.question!=='string'||x.question.length<8||x.question.length>360||/[<>\p{Nd}]/u.test(x.question)||!Array.isArray(x.sources)||x.sources.length<1||x.sources.length>3||x.sources.some(id=>!ids.has(id)))throw Error('ai_failed');
  return {question:x.question,sources:[...new Set(x.sources)]};
 })};
}
export const reviewSchema={type:'object',properties:{checks:{type:'array',minItems:2,maxItems:4,items:{type:'object',properties:{question:{type:'string'},sources:{type:'array',minItems:1,maxItems:3,items:{type:'string'}}},required:['question','sources'],additionalProperties:false}}},required:['checks'],additionalProperties:false};
