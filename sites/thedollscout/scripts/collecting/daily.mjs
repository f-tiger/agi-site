// Bounded, source-backed publishing. No LLM, credentials or copied descriptions.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
export const POLICY={maxNewPerDay:2,maxUpdates:6,maxDetails:6,maxSeries:300};
export const SOURCES=[{id:'smiski',index:'https://smiski.com/e/products/'},{id:'sonny-angel',index:'https://www.sonnyangel.com/en/products/'}];
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const stateFile=path.join(root,'content/series-state.json');
export const emptyState=()=>({schema:1,cursor:0,series:[],history:[]});
export function clean(s){return String(s).replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&(amp|quot|apos|nbsp|lt|gt);/g,(_,x)=>({amp:'&',quot:'"',apos:"'",nbsp:' ',lt:'<',gt:'>'}[x])).replace(/\s+/g,' ').trim();}
const safeName=s=>s.length>=2&&s.length<=90&&!/[<>\u0000-\u001f]|https?:|yourdoll|age-gate|sex.doll/i.test(s);
export const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function allowedURL(input){try{const u=new URL(input);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&SOURCES.some(s=>new URL(s.index).hostname===u.hostname&&(u.pathname==='/robots.txt'||u.href.startsWith(s.index)));}catch{return false;}}
export function robotAllowed(text,url){
 if(!/user-agent\s*:/i.test(text)||/<(?:html|body)\b/i.test(text))throw Error('Unrecognized robots response');
 const groups=[];let group=null,hasRules=false;
 for(const raw of text.split(/\r?\n/)){const line=raw.split('#')[0].trim(),m=/^([^:]+):\s*(.*)$/.exec(line);if(!m)continue;const key=m[1].toLowerCase(),value=m[2].trim();
  if(key==='user-agent'){if(!group||hasRules){group={agents:[],rules:[]};groups.push(group);hasRules=false;}group.agents.push(value.toLowerCase());}
  else if(group&&['allow','disallow'].includes(key)){hasRules=true;if(value)group.rules.push({allow:key==='allow',path:value});}
 }
 const agent='dollscoutbot',scores=groups.map(g=>Math.max(0,...g.agents.filter(a=>a!=='*'&&agent.includes(a)).map(a=>a.length))),specificity=Math.max(0,...scores),selected=specificity?groups.filter((g,i)=>scores[i]===specificity):groups.filter(g=>g.agents.includes('*'));
 const target=new URL(url).pathname;let best={length:-1,allow:true};
 for(const g of selected)for(const rule of g.rules){const end=rule.path.endsWith('$'),p=end?rule.path.slice(0,-1):rule.path,pattern=p.split('*').map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');if(new RegExp('^'+pattern+(end?'$':'')).test(target)){const length=p.replaceAll('*','').length;if(length>best.length||length===best.length&&rule.allow)best={length,allow:rule.allow};}}
 return best.allow;
}
export function smiskiLinks(html){
 const section=html.replace(/<!--[\s\S]*?-->/g,'').split(/<h4[^>]*>\s*FIGURE\s*<\/h4>/i)[1]?.split(/<h4[^>]*>\s*OTHER\s*<\/h4>/i)[0];
 if(!section)throw Error('SMISKI figure section missing');
 const links=[...section.matchAll(/href=["']([^"']+)["']/gi)].map(m=>{try{return new URL(m[1],SOURCES[0].index).href.replace(/\/?$/,'/');}catch{return '';}}).filter(u=>allowedURL(u)&&/^https:\/\/smiski\.com\/e\/products\/[a-z0-9-]+\/$/.test(u));
 const unique=[...new Set(links)];if(unique.length<3||unique.length>80)throw Error('SMISKI index shape changed');return unique;
}
export function parseSmiski(html,url){
 const body=html.replace(/<!--[\s\S]*?-->/g,'');
 const title=([...body.matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>/gi)].map(m=>clean(m[1])).find(t=>/^PRODUCTS\s*\//i.test(t))||'').replace(/^PRODUCTS\s*\/\s*/i,'');
 const names=[...body.matchAll(/<h5[^>]*>([\s\S]*?)<\/h5>/gi)].map(m=>clean(m[1]));
 if(!/^SMISKI /i.test(title)||names.length!==6||!names.every(n=>/\bSMISKI\b/i.test(n))||!/(?:6|six)\s+Smiski\s+(?:variations|types)/i.test(clean(body)))throw Error('No verified six-style SMISKI checklist');
 return makeSeries('smiski',title,names,url);
}
export function parseSonny(html,url){
 const blocks=html.replace(/<!--[\s\S]*?-->/g,'').split(/<h2\b[^>]*class=["']tabtitle["'][^>]*>/i).slice(1),records=[];
 for(const block of blocks){const title=clean(block.split('</h2>')[0]);if(!/Series/.test(title)||/[~()]/.test(title))continue;
  const names=[...block.matchAll(/data-caption-title=["']([^"']+)["']/gi)].map(m=>clean(m[1]));
  if(names.length<6||names.length>24||names.some(n=>/secret|robby/i.test(n)))continue;
  records.push(makeSeries('sonny-angel','Sonny Angel '+title,names,url));
 }
 if(!records.length)throw Error('Sonny Angel named series unavailable');return records;
}
function makeSeries(brand,title,names,source){const x={id:brand+'-'+slug(title.replace(/^(smiski|sonny angel)\s+/i,'')),brand,title,names,source};validateSeries(x);return x;}
export function validateSeries(x){
 if(!SOURCES.some(s=>s.id===x.brand&&x.source.startsWith(s.index))||!allowedURL(x.source)||!safeName(x.title)||!x.id.startsWith(x.brand+'-')||!/^[a-z0-9-]{5,90}$/.test(x.id)||!Array.isArray(x.names)||x.names.length<6||x.names.length>24||new Set(x.names.map(n=>n.toLowerCase())).size!==x.names.length||!x.names.every(safeName))throw Error('Invalid official checklist');return x;
}
const fingerprint=x=>createHash('sha256').update(JSON.stringify([x.title,x.names,x.source])).digest('hex');
export function reconcile(previous,candidates,date){
 const state=structuredClone(previous),added=[],changed=[],seen=new Set();let remaining=Math.max(0,POLICY.maxNewPerDay-state.series.filter(s=>s.published===date).length);
 for(const raw of candidates){validateSeries(raw);if(seen.has(raw.id))continue;seen.add(raw.id);const old=state.series.find(s=>s.id===raw.id),hash=fingerprint(raw);
  if(old){if(old.hash!==hash&&changed.length<POLICY.maxUpdates){Object.assign(old,raw,{hash,modified:date,checked:date});changed.push(old.id);}else if(old.hash===hash)old.checked=date;}
  else if(remaining&&state.series.length<POLICY.maxSeries){state.series.push({...raw,hash,published:date,modified:date,checked:date});added.push(raw.id);remaining--;}
 }
 return {state,added,changed,eligible:candidates.length};
}
export function readState(){if(!fs.existsSync(stateFile))return emptyState();const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));if(state.schema!==1||!Array.isArray(state.series))throw Error('Unsupported daily state');state.series.forEach(validateSeries);return state;}
async function rawFetch(url,fetcher=fetch){
 if(!allowedURL(url))throw Error('Source URL outside allowlist');
 for(let i=0;i<2;i++){try{const r=await fetcher(url,{redirect:'manual',headers:{'user-agent':'DollScoutBot/1.0 (+https://thedollscout.com/editorial)','accept':'text/html,text/plain;q=0.9'},signal:AbortSignal.timeout(15000)});if(r.status!==200)throw Error('Source HTTP '+r.status);if(Number(r.headers.get('content-length'))>1500000)throw Error('Source too large');const chunks=[];let size=0;for await(const chunk of r.body){size+=chunk.length;if(size>1500000)throw Error('Source too large');chunks.push(chunk);}return Buffer.concat(chunks).toString('utf8');}catch(e){if(i||/HTTP (?:401|403|404|429)|allowlist|too large/.test(e.message))throw e;await new Promise(r=>setTimeout(r,1000));}}
}
export async function collect(previous,date,{fetcher=fetch,pause=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const results=[],buckets=[],rejected=[];let cursor=previous.cursor||0;
 for(const source of SOURCES){const candidates=[];try{
  const robots=await rawFetch(new URL('/robots.txt',source.index).href,fetcher);
  const get=async url=>{if(!robotAllowed(robots,url))throw Error('robots.txt disallows source');await pause(1200);return rawFetch(url,fetcher);};
  const index=await get(source.index);
  if(source.id==='sonny-angel')candidates.push(...parseSonny(index,source.index));
  else {const links=smiskiLinks(index);for(let i=0;i<Math.min(POLICY.maxDetails,links.length);i++){const url=links[(cursor+i)%links.length];try{candidates.push(parseSmiski(await get(url),url));}catch(e){rejected.push({source:url,reason:e.message});}}cursor=(cursor+POLICY.maxDetails)%links.length;}
  if(!candidates.length)throw Error('No eligible series in checked batch');
  results.push({id:source.id,status:'ok',eligible:candidates.length,url:source.index});
 }catch(e){results.push({id:source.id,status:'error',reason:e.message,url:source.index});}buckets.push(candidates);}
 // Alternate brands; preserve source listing order without calling it popularity.
 const candidates=[];for(let i=0;i<Math.max(0,...buckets.map(x=>x.length));i++)for(const b of buckets)if(b[i])candidates.push(b[i]);
 const {state,added,changed,eligible}=reconcile(previous,candidates,date);
 const status=results.every(s=>s.status==='ok')?'ok':results.some(s=>s.status==='ok')?'partial':'failed';
 const run={date,status,added:state.series.filter(s=>s.published===date).map(s=>s.id),changed:state.series.filter(s=>s.modified===date&&s.published!==date).map(s=>s.id),eligible,sources:results,rejected};
 state.cursor=cursor;state.lastRun=run;state.history=[run,...state.history.filter(r=>r.date!==date)].slice(0,14);
 return {state,run};
}
async function main(){
 const previous=readState(),date=new Date().toISOString().slice(0,10);
 if(previous.lastRun?.date===date&&previous.lastRun.status==='ok'&&!process.argv.includes('--retry')){console.log('Daily sources already checked today; no duplicate expansion.');return;}
 const {state,run}=await collect(previous,date);
 fs.mkdirSync(path.dirname(stateFile),{recursive:true});fs.writeFileSync(stateFile+'.tmp',JSON.stringify(state,null,2)+'\n');fs.renameSync(stateFile+'.tmp',stateFile);
 console.log(JSON.stringify(run,null,2));
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\n## TDS autonomous expansion\n${date}: ${run.status}; ${run.added.length} new series, ${run.changed.length} updated; ${state.series.length} published series.\n\n`+run.sources.map(s=>`- ${s.id}: ${s.status}${s.reason?' — '+s.reason:''}\n`).join(''));
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`health=${run.status}\n`);
 if(run.status!=='ok')console.error('::warning::Official source coverage incomplete; retained last verified entries. See daily report.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error('::error::'+e.message);process.exitCode=1;});
