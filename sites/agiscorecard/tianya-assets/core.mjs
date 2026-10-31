import {calculatePilot} from '../tianya-research/practice-data.mjs';
import {sizePaperPosition} from '../tianya-research/dual-path-data.mjs';
export const PRODUCT='tianya-validation';
export const numeric={startup:['tasks','baseMinutes','trialMinutes','hourlyCNY','extraCNY','setupCNY','monthlyTasks','basePass','trialPass','majorErrors','quoteCNY'],invest:['equity','entry','exit','riskPct','capPct','feeBps']};
export const samples={startup:{tasks:50,baseMinutes:12,trialMinutes:5,hourlyCNY:80,extraCNY:.8,setupCNY:1200,monthlyTasks:500,basePass:49,trialPass:49,majorErrors:0,quoteCNY:12},invest:{equity:100000,entry:100,exit:92,riskPct:.5,capPct:5,feeBps:10}};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const bounds={title:100,hypothesis:1200,counter:800,reviewDate:10,outcome:1600};
export function normalize(raw){
 if(!plain(raw)||raw.version!==1||raw.product!==PRODUCT||!plain(raw.values)||Object.keys(raw).some(k=>!['version','product','values'].includes(k)))throw Error('schema');
 const v=raw.values;if(!['startup','invest'].includes(v.kind)||typeof v.isExample!=='boolean')throw Error('kind');
 const allowed=['kind','isExample',...Object.keys(bounds),...numeric[v.kind]];if(Object.keys(v).some(k=>!allowed.includes(k)))throw Error('fields');
 const out={kind:v.kind,isExample:v.isExample};
 for(const[k,n]of Object.entries(bounds)){if(typeof v[k]!=='string'||v[k].length>n||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v[k]))throw Error('text');out[k]=v[k];}
 if(v.reviewDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(v.reviewDate)||Number.isNaN(Date.parse(v.reviewDate))||new Date(v.reviewDate).toISOString().slice(0,10)!==v.reviewDate))throw Error('date');
 for(const k of numeric[v.kind]){const n=v[k];if(n!==null&&(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e12))throw Error('number');out[k]=n;}
 return {version:1,product:PRODUCT,values:out};
}
export function calculate(raw){const v=normalize(raw).values;return v.kind==='startup'?calculatePilot(v):sizePaperPosition(v);}
export function blank(kind='startup'){return normalize({version:1,product:PRODUCT,values:{kind,isExample:false,...Object.fromEntries(Object.keys(bounds).map(k=>[k,''])),...Object.fromEntries(numeric[kind].map(k=>[k,null]))}});}
export function cloudContext(raw){if(!plain(raw)||!Object.keys(raw).every(k=>['id','revision','name'].includes(k))||typeof raw.id!=='string'||!/^[a-f0-9]{32}$/.test(raw.id)||!Number.isSafeInteger(raw.revision)||raw.revision<1||typeof raw.name!=='string'||raw.name.length>80)return null;return {...raw};}
