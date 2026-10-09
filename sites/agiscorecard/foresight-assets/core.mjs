import {claims,goals,interviews,reviewed} from './catalog.mjs';
import {normalizeCommercial} from './commercial.mjs';
export const PRODUCT='future-guide';
export const blank=()=>({goal:'work',saved:[],notes:{}});
const ids=new Set(claims.map(c=>c.id)),goalIds=new Set(goals.map(g=>g.id));
export const emptyNote=()=>({stance:'undecided',task:'',action:'',counter:'',review:'',done:false});
export function normalize(raw){
  if(raw?.version!==1||raw.product!==PRODUCT||!raw.values||Array.isArray(raw.values))throw Error('record');
  if(new TextEncoder().encode(JSON.stringify(raw)).length>60000)throw Error('size');
  const v=raw.values;if(!goalIds.has(v.goal)||!Array.isArray(v.saved)||v.saved.some(x=>!ids.has(x))||!v.notes||Array.isArray(v.notes))throw Error('values');
  const out={goal:v.goal,saved:[...new Set(v.saved)],notes:{}};
  for(const [id,n] of Object.entries(v.notes)){
    if(!ids.has(id)||!n||!['agree','disagree','undecided'].includes(n.stance))throw Error('note');
    const note=emptyNote();note.stance=n.stance;
    for(const k of ['task','action','counter','review']){if(typeof n[k]!=='string'||n[k].length>1500)throw Error('field');note[k]=n[k];}
    if(note.review&&(!/^\d{4}-\d{2}-\d{2}$/.test(note.review)||!Number.isFinite(Date.parse(note.review))||new Date(note.review).toISOString().slice(0,10)!==note.review))throw Error('date');
    if(typeof n.done!=='boolean')throw Error('done');note.done=n.done;
    if(n.commercial!==undefined)note.commercial=normalizeCommercial(n.commercial,id);
    out.notes[id]=note;
  }
  return {version:1,product:PRODUCT,values:out};
}
export const mediaLabel=(i,lang)=>({video:{en:'Video',zh:'视频'},audio:{en:'Audio',zh:'音频'},text:{en:'Written interview',zh:'文字访谈'}}[i.kind][lang]);
export const sourceUrl=(i,start=null)=>i.video?'https://www.youtube.com/watch?v='+i.video+(Number.isInteger(start)?'&t='+start+'s':''):i.watch||i.source;
export const ageDays=(date,asOf=new Date().toISOString().slice(0,10))=>Math.floor((Date.parse(asOf)-Date.parse(date))/86400000);
export function inWindow(date,window='all',asOf){const age=ageDays(date,asOf);return Number.isFinite(age)&&age>=0&&(window==='all'||window==='archive'&&age>90||['30','90'].includes(window)&&age<Number(window));}
export function selectClaims(goal,query='',saved=null,options={}){
 const q=query.trim().toLowerCase();
 return claims.filter(c=>{const i=interviews[c.interview];return (!goal||goal==='all'||c.goals.includes(goal))&&(!saved||saved.includes(c.id))&&(!options.interview||options.interview===c.interview)&&inWindow(i.date,options.window,options.asOf)&&JSON.stringify([c.en,c.zh,i.speaker,i.label,i.title,i.publisher]).toLowerCase().includes(q);}).sort((a,b)=>interviews[b.interview].date.localeCompare(interviews[a.interview].date)||a.id.localeCompare(b.id));
}
export const reviewedCounts={interviews:Object.keys(interviews).length,claims:claims.length,recent:Object.values(interviews).filter(i=>inWindow(i.date,'30',reviewed)).length};
