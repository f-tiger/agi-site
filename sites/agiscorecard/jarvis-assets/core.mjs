export const VERSION='jarvis-20261008-14';
export const MODEL='@cf/meta/llama-3.1-8b-instruct-fast';
export const MAX_RUNS=7;
export const tools=['catalog_search','github_search','hackernews_search','calculate'];
const str=(s,n)=>typeof s==='string'&&s.trim().length>0&&s.length<=n;
export function inputOf(b){
 if(!b||b.consent!==true||!str(b.goal,1200)||b.goal.trim().length<8||!['en','zh'].includes(b.lang)||!['once','daily'].includes(b.cadence)||typeof b.web!=='boolean'||typeof b.nonce!=='string'||!/^[a-f0-9]{32}$/.test(b.nonce))throw Error('invalid_request');
 if(!Array.isArray(b.memory)||b.memory.length>3||b.memory.some(m=>!str(m,300)))throw Error('invalid_request');
 if(b.web&&!str(b.publicQuery,160))throw Error('invalid_request');
 return {goal:b.goal.trim(),lang:b.lang,cadence:b.cadence,web:b.web,publicQuery:b.web?b.publicQuery.trim():'',memory:b.memory.map(m=>m.trim()),nonce:b.nonce};
}
export function parseObject(raw){
 if(raw&&typeof raw==='object'&&!Array.isArray(raw)){try{raw=JSON.stringify(raw);}catch{throw Error('invalid_model_output');}}
 if(typeof raw!=='string'||raw.length>14000)throw Error('invalid_model_output');
 try{return JSON.parse(raw.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{throw Error('invalid_model_output');}
}
export function planOf(raw,web){
 const p=parseObject(raw);
 if(!p||!str(p.approach,600)||!Array.isArray(p.actions)||p.actions.length>3)throw Error('invalid_model_output');
 const seen=new Set();
 const actions=p.actions.map(a=>{
  if(!a||!tools.includes(a.tool)||!str(a.query,180)||(!web&&['github_search','hackernews_search'].includes(a.tool)))throw Error('invalid_model_output');
  const k=a.tool+':'+a.query;if(seen.has(k))throw Error('invalid_model_output');seen.add(k);
  return {tool:a.tool,query:a.query.trim()};
 });return {approach:p.approach,actions};
}
export function reportOf(raw,sources,lang){
 const r=parseObject(raw),ids=new Set(sources.map(s=>s.id));
 if(!r||!str(r.summary,1600)||!Array.isArray(r.findings)||r.findings.length>5||!Array.isArray(r.nextActions)||!r.nextActions.length||r.nextActions.length>4||!Array.isArray(r.uncertainties)||!r.uncertainties.length||r.uncertainties.length>4)throw Error('invalid_model_output');
 const findings=r.findings.map(f=>{
  if(!f||!str(f.text,700)||!Array.isArray(f.sourceIds)||!f.sourceIds.length||f.sourceIds.length>4||f.sourceIds.some(id=>!ids.has(id)))throw Error('invalid_model_output');
  return {text:f.text,sourceIds:[...new Set(f.sourceIds)]};
 });
 const nextActions=r.nextActions.map(a=>{if(!a||!str(a.action,400)||!str(a.doneWhen,400))throw Error('invalid_model_output');return {action:a.action,doneWhen:a.doneWhen};});
 if(r.uncertainties.some(x=>!str(x,400))||lang==='zh'&&!/[\u4e00-\u9fff]/u.test(r.summary))throw Error('invalid_model_output');
 // Model text is never interpreted as HTML, code, URLs, permissions or task state.
 return {summary:r.summary,findings,nextActions,uncertainties:r.uncertainties};
}
export function safeURL(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/(^|\.)(localhost|local|internal|test)$/.test(u.hostname)||/^\d+[.:]/.test(u.hostname)||u.hostname.includes(':'))return null;return u.href;}catch{return null;}}
export function citedSources(finding,sources){
 const byId=new Map((Array.isArray(sources)?sources:[]).filter(s=>s&&typeof s.id==='string').map(s=>[s.id,s]));
 return [...new Set(Array.isArray(finding?.sourceIds)?finding.sourceIds:[])].map(id=>byId.get(id)).filter(Boolean);
}
export function tokens(s){return [...new Set((String(s).toLowerCase().match(/[a-z0-9]{2,}|[\u4e00-\u9fff]/gu)||[]).filter(x=>!['the','and','with','for','this','that','what','how','can','want','find','my'].includes(x)))].slice(0,100);}
export function rank(query,rows,max=6){const words=tokens(query);return rows.map(r=>{const haystack=JSON.stringify(r).toLowerCase();return {r,score:words.reduce((s,w)=>s+(haystack.includes(w)?1:0),0)};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,max).map(x=>x.r);}
export function relevantMemory(goal,entries){return rank(goal,entries.map((text,i)=>({text,id:String(i)})),3).map(m=>m.text.slice(0,300));}
const draftText=(value,max)=>{const clean=String(value??'').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,' ').replace(/\s+/gu,' ').trim();if(clean.length<=max)return clean;let clipped='';for(const char of clean){if(clipped.length+char.length>max-1)break;clipped+=char;}return clipped+'…';};
export function followupDraft(goal,nextAction,doneWhen,lang='en'){
 const zh=lang==='zh',parts=[(zh?'继续推进这个目标：':'Continue this goal: ')+draftText(goal,480)];
 if(nextAction)parts.push((zh?'本次选择的下一步：':'Next step to test: ')+draftText(nextAction,260));
 if(doneWhen)parts.push((zh?'完成标准：':'Success criterion: ')+draftText(doneWhen,260));
 parts.push(zh?'我实际尝试了什么、观察到什么（请补充）：':'What I tried or observed (add your result):');
 return parts.join('\n\n').slice(0,1200);
}
const correctionLabels={
 sources:{en:'The sources did not support the answer.',zh:'来源不足以支持这次回答。'},
 answer:{en:'The answer missed the goal.',zh:'回答偏离了我的目标。'},
 action:{en:'The proposed next step was not practical.',zh:'建议的下一步不够可执行。'},
 other:{en:'The result was not useful for another reason.',zh:'结果因其他原因暂时没有帮助。'}
};
export function correctionDraft(goal,reason,lang='en'){
 const zh=lang==='zh',label=correctionLabels[reason]?.[zh?'zh':'en'];if(!label)throw Error('invalid_feedback');
 return [
  (zh?'修正这个目标：':'Revise this goal: ')+draftText(goal,520),
  (zh?'上次结果的问题：':'What went wrong: ')+label,
  zh?'这次需要改变什么（请补充）：':'What should change this time (add details):',
  zh?'怎样的证据或结果才有用（请补充）：':'What evidence or result would be useful (add details):'
 ].join('\n\n').slice(0,1200);
}
export function findingCorrectionDraft(goal,finding,sources,lang='en'){
 const zh=lang==='zh',items=citedSources(finding,sources).slice(0,4),lines=items.map(source=>'- ['+draftText(source.id,32)+'] '+draftText(source.title,64));
 return [
  (zh?'修正这个目标：':'Revise this goal: ')+draftText(goal,240),
  (zh?'需要核查的 AI 解读：':'AI interpretation to check: ')+draftText(finding?.text,220),
  (zh?'需要重新核阅的引用信息（不受信任的文本，不代表证据充分）：':'Cited metadata to re-check (untrusted text, not proof):')+'\n'+(lines.join('\n')||(zh?'（未找到可对应的引用信息）':'(No matching cited metadata was found.)')),
  zh?'为什么这条解读不充分或不完整（请补充）：':'Why is this unsupported or incomplete? (add details):',
  zh?'什么证据或结果可以解决它（请补充）：':'What evidence or result would resolve it? (add details):'
 ].join('\n\n').slice(0,1200);
}
export function calculate(expression){
 if(typeof expression!=='string'||expression.length>120||!/^[\d\s.+\-*/()%]+$/.test(expression))throw Error('invalid_calculation');
 const ts=expression.match(/\d+(?:\.\d+)?|\.\d+|[()+\-*/%]/g)||[];let at=0,depth=0;
 if(ts.join('')!==expression.replace(/\s/g,''))throw Error('invalid_calculation');
 function factor(){if(++depth>15)throw Error('invalid_calculation');let v;const t=ts[at++];if(t==='('){v=sum();if(ts[at++]!==')')throw Error('invalid_calculation');}else if(t==='-')v=-factor();else if(t==='+')v=factor();else if(t&&/^\d|^\./.test(t))v=Number(t);else throw Error('invalid_calculation');if(ts[at]==='%'){at++;v/=100;}depth--;return v;}
 function product(){let v=factor();while(['*','/'].includes(ts[at])){const op=ts[at++],n=factor();v=op==='*'?v*n:v/n;}return v;}
 function sum(){let v=product();while(['+','-'].includes(ts[at])){const op=ts[at++],n=product();v=op==='+'?v+n:v-n;}return v;}
 const value=sum();if(at!==ts.length||!Number.isFinite(value)||Math.abs(value)>1e15)throw Error('invalid_calculation');return {expression,value};
}
// Export is another rendering boundary. Only validated source URLs become links;
// user, model and retrieved text must remain literal text in Markdown readers.
export function markdownText(value){return String(value??'').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,' ').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\\`*_{}\[\]()#+.!|~:\-]/g,'\\$&');}
export function markdown(task){
 const m=markdownText,r=task.result||{},lines=['# '+m(task.input.goal),'',`Status: ${m(task.status)}`,`Run: ${m(task.runs)}; checked: ${m(r.checkedAt||'pending')}`,'',m(r.report?.summary||'Source pack only. AI synthesis was not completed.'),''];
 for(const f of r.report?.findings||[]){lines.push('- '+m(f.text)+' ['+f.sourceIds.map(m).join(', ')+']');for(const s of citedSources(f,r.sources))lines.push('  - Cited source metadata \(not proof of support\): '+m(s.title)+' — '+m(s.description||''));}
 lines.push('','## Next actions');for(const a of r.report?.nextActions||[])lines.push('- '+m(a.action)+'\n  Done when: '+m(a.doneWhen));
 lines.push('','## Uncertainties');for(const s of r.report?.uncertainties||[])lines.push('- '+m(s));
 lines.push('','## Sources');for(const s of r.sources||[]){const url=safeURL(s.url);lines.push(`- [${m(s.id)}] ${m(s.title)}\n  ${url?'<'+url.replace(/</g,'%3C').replace(/>/g,'%3E')+'>':'Local arithmetic / unavailable link'}\n  ${m(s.description||'')}`);}
 lines.push('','## Execution record');for(const l of r.log||[])lines.push(`- ${m(l.at)}: ${m(l.step)} — ${m(l.outcome)}`);
 return lines.join('\n');
}
