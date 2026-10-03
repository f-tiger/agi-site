import {claims,goals,interviews} from './catalog.mjs';
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
    if(typeof n.done!=='boolean')throw Error('done');note.done=n.done;out.notes[id]=note;
  }
  return {version:1,product:PRODUCT,values:out};
}
export function selectClaims(goal,query='',saved=null){const q=query.trim().toLowerCase();return claims.filter(c=>(!goal||goal==='all'||c.goals.includes(goal))&&(!saved||saved.includes(c.id))&&JSON.stringify([c.en,c.zh,interviews[c.interview].speaker]).toLowerCase().includes(q));}
