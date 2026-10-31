import {VERSION,validate,defaults} from './engine.mjs';
export const PRODUCT='ai-futures',SLOT='agi-futures-v1';
const signals=new Set(['capability','infrastructure','constraint']);
export function selectEvidence(snapshot){
 const now=Date.parse(snapshot.checkedAt),seen=new Set();
 if(!Number.isFinite(now))return [];
 return [...(snapshot.items||[])].sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt))).filter(x=>{
  const age=(now-Date.parse(x.publishedAt))/86400000;
  if(!Number.isFinite(age)||age<0||age>90||!signals.has(x.signal)||seen.has(x.company))return false;
  seen.add(x.company);return true;
 }).slice(0,5).map(({id,company,signal})=>({id,company,signal}));
}
export function blank(snapshot={}){return {version:1,product:PRODUCT,values:{modelVersion:VERSION,params:{...defaults},snapshotId:snapshot.checkedAt||'no-live-snapshot',evidence:selectEvidence(snapshot),notes:''}};}
export function normalize(raw){
 if(!raw||raw.version!==1||raw.product!==PRODUCT||!raw.values||Array.isArray(raw.values))throw Error('invalid_record');
 const v=raw.values;
 if(v.modelVersion!==VERSION)throw Error('model_version_unavailable');
 if(!v.params||Object.keys(defaults).some(k=>!(k in v.params)))throw Error('missing_params');
 const params=validate(v.params);
 if(typeof v.snapshotId!=='string'||v.snapshotId.length>100||typeof v.notes!=='string'||v.notes.length>2000||!Array.isArray(v.evidence)||v.evidence.length>5)throw Error('invalid_record');
 const companies=new Set();
 const evidence=v.evidence.map(e=>{
  if(!e||typeof e.id!=='string'||e.id.length>160||typeof e.company!=='string'||!e.company.length||e.company.length>80||!signals.has(e.signal)||companies.has(e.company))throw Error('invalid_evidence');
  companies.add(e.company);return {id:e.id,company:e.company,signal:e.signal};
 });
 return {version:1,product:PRODUCT,values:{modelVersion:VERSION,params,snapshotId:v.snapshotId,evidence,notes:v.notes}};
}
export function fromSnapshot(snapshot,params=defaults,notes=''){const r=blank(snapshot);r.values.params=validate(params);r.values.notes=notes;return normalize(r);}
export function freshness(snapshot,now=Date.now()){const age=(now-Date.parse(snapshot.checkedAt))/3600000;return !Number.isFinite(age)||age<0||age>36?'overdue':(snapshot.sources||[]).some(s=>!s.ok)?'partial':'current';}
