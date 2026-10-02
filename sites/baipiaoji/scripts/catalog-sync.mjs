#!/usr/bin/env node
// Site-owned daily discovery. No model, paid API, repository execution or assistant session.
import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {requestURL,safeURL} from './catalog-network.mjs';
import {candidateOf} from './agent-watch-registry-pull.mjs';
import {recordFrom,validateCandidate,renderFields} from './agent-watch-admit.mjs';
import {applyCheck} from './agent-watch-verify.mjs';

export const REGISTRY='https://registry.modelcontextprotocol.io/v0.1/servers';
export const QUERIES=[['llm','ai'],['rag','knowledge'],['ai-agent','agents'],['ai-coding','coding'],['text-to-image','image'],['text-to-speech','audio'],['local-llm','local'],['chatbot','chat'],['text-to-video','video'],['ocr','documents'],['fine-tuning','models'],['productivity','everyday'],['inference','local'],['retrieval-augmented-generation','knowledge'],['agents','agents'],['coding-assistant','coding'],['image-generation','image'],['speech-recognition','audio'],['large-language-models','models'],['mcp','agents'],['video-generation','video'],['document-parsing','documents'],['computer-use','agents'],['self-hosted','everyday']];
const EXCLUDED_REPOS=new Set(['flowiseai/flowise','roocodeinc/roo-code','microsoft/autogen']);
export function topicFromTags(tags=[],fallback='ai') {
  const has=terms=>terms.some(t=>tags.includes(t));
  for(const [topic,terms] of [['coding',['ai-coding','coding-assistant','claude-code','codex','code-generation']],['agents',['ai-agent','ai-agents','agents','agent','multi-agent','agent-framework','mcp']],['knowledge',['rag','retrieval-augmented-generation','knowledge-graph','web-crawler']],['video',['text-to-video','video-generation','video-editing']],['image',['text-to-image','image-generation','stable-diffusion']],['audio',['text-to-speech','speech-recognition','speech-to-text']],['documents',['ocr','document-parsing']],['local',['inference','local-llm','llm-inference']],['models',['fine-tuning','pretrained-models','model-training']]])if(has(terms))return topic;
  return fallback==='models'&&has(['llm','large-language-models'])?'ai':fallback;
}
export function admissionQueue(pending,now,cap) {
  const ordered=[...pending].filter(t=>!t.attemptedAt||new Date(now)-new Date(t.attemptedAt)>86400000).sort((a,b)=>String(a.attemptedAt||'').localeCompare(String(b.attemptedAt||'')));
  const groups=new Map();for(const c of ordered){if(!groups.has(c.topic))groups.set(c.topic,[]);groups.get(c.topic).push(c);}
  const out=[];while(out.length<cap&&[...groups.values()].some(q=>q.length))for(const q of groups.values())if(q.length&&out.length<cap)out.push(q.shift());return out;
}
const iso=()=>new Date().toISOString();
const good=s=>Number.isInteger(s)&&s>=200&&s<300;
const day=s=>s.slice(0,10);
const read=(root,file,fallback)=>existsSync(join(root,'data',file))?JSON.parse(readFileSync(join(root,'data',file),'utf8')):fallback;
const write=(root,file,value)=>{const p=join(root,'data',file);writeFileSync(p+'.tmp',JSON.stringify(value,null,1)+'\n');renameSync(p+'.tmp',p);};
export const repoKey=value=>{if(!value)return '';try{const u=new URL(value.startsWith('https:')?value:'https://github.com/'+value);return (u.hostname+u.pathname.replace(/\.git\/?$/,'').replace(/\/+$/,'')).toLowerCase();}catch{return '';}};
const compactError=e=>/unsafe/.test(String(e.message))?'unsafe-url':/timeout/.test(String(e.message))?'timeout':/body-limit/.test(String(e.message))?'body-limit':'network-or-response-error';
async function batch(items,fn,n=4){const out=[];let index=0;await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(index<items.length){const i=index++;out[i]=await fn(items[i],i);}}));return out;}
export function eligibleRepo(r,now) {
  return !!r&&!EXCLUDED_REPOS.has(String(r.full_name).toLowerCase())&&/^[\w.-]+\/[\w.-]+$/.test(r.full_name||'')&&!r.fork&&!r.archived&&!r.disabled&&r.visibility!=='private'&&r.stargazers_count>=500&&new Date(r.pushed_at)>=new Date(new Date(now)-180*86400000)&&!/(^|[-_])(awesome|tutorials?|courses?|interview|cheatsheet|roadmap|resources)([-_]|$)/i.test(r.name||'')&&!!String(r.description||'').trim();
}
function metaRecord(r,topic,now,previous){return {id:previous?.id||'gh-'+r.full_name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+createHash('sha256').update(r.full_name.toLowerCase()).digest('hex').slice(0,6),name:/[一-鿿]/.test(r.name)?r.full_name:r.name,repo:r.full_name,topic:topicFromTags(r.topics,topic),topics:(r.topics||[]).slice(0,12),description:String(r.description||'').slice(0,500),stars:r.stargazers_count,pushedAt:r.pushed_at,license:r.license?.spdx_id||null,homepage:r.homepage||'',checkedAt:now,discoveredAt:previous?.discoveredAt||now,active:true,readmeCheckedAt:now};}

export async function syncGithub({curated,discovery,state,get,now,limits={}}) {
  const cap=limits.admit??12,queries=limits.queries??6,result={status:'ok',discovered:0,admitted:0,checked:0,rejected:0,errors:[]};
  for(const r of discovery.tools)r.topic=topicFromTags(r.topics,r.topic);
  state.pending??=[];state.checked??={};state.queryIndex??=0;state.page??=1;
  const have=new Set([...curated.tools,...discovery.tools].map(t=>repoKey(t.repo))),pending=new Map(state.pending.map(t=>[repoKey(t.repo),t]));
  for(let i=0;i<queries;i++){
    const [topic,category]=QUERIES[state.queryIndex%QUERIES.length],cutoff=day(new Date(new Date(now)-180*86400000).toISOString());
    const u=new URL('https://api.github.com/search/repositories');u.searchParams.set('q',`topic:${topic} stars:>=500 pushed:>=${cutoff} archived:false fork:false`);u.searchParams.set('sort',state.page%2?'stars':'updated');u.searchParams.set('order','desc');u.searchParams.set('per_page','30');u.searchParams.set('page',String(state.page));
    try{const r=await get(u.href,{json:true,github:true});if(!good(r.status)||!Array.isArray(r.data?.items)||r.data.incomplete_results)throw new Error('search-unavailable');
      for(const x of r.data.items)if(eligibleRepo(x,now)&&!have.has(repoKey(x.full_name))&&!pending.has(repoKey(x.full_name))){pending.set(repoKey(x.full_name),{repo:x.full_name,topic:topicFromTags(x.topics,category),foundAt:now});result.discovered++;}
      state.queryIndex=(state.queryIndex+1)%QUERIES.length;if(state.queryIndex===0)state.page=state.page%3+1;
    }catch(e){result.errors.push('github-search-'+compactError(e));break;}
  }
  const queue=admissionQueue(pending.values(),now,cap);
  for(const candidate of queue){
    candidate.attemptedAt=now;
    try{
      const r=await get('https://api.github.com/repos/'+candidate.repo,{json:true,github:true});if(!good(r.status)){result.rejected++;if([404,410].includes(r.status))pending.delete(repoKey(candidate.repo));else result.errors.push('github-repository-http-'+r.status);continue;}
      if(!eligibleRepo(r.data,now)||have.has(repoKey(r.data.full_name))){pending.delete(repoKey(candidate.repo));result.rejected++;continue;}
      const readme=await get('https://api.github.com/repos/'+r.data.full_name+'/readme',{json:true,github:true});
      if(!good(readme.status)||readme.data?.encoding!=='base64'||Buffer.from(readme.data.content||'','base64').toString('utf8').trim().length<300){result.rejected++;if(![404,410].includes(readme.status))result.errors.push('github-readme-unavailable');continue;}
      discovery.tools.push(metaRecord(r.data,candidate.topic,now));have.add(repoKey(r.data.full_name));pending.delete(repoKey(candidate.repo));result.admitted++;
    }catch(e){result.rejected++;result.errors.push('github-admission-'+compactError(e));}
  }
  // Rotate by last ATTEMPT, so a blocked repository cannot starve the rest.
  const old=discovery.tools.filter(r=>r.discoveredAt!==now).sort((a,b)=>String(state.checked[a.id]||'').localeCompare(String(state.checked[b.id]||''))).slice(0,limits.verify??6);
  for(const r of old){state.checked[r.id]=now;result.checked++;
    try{const res=await get('https://api.github.com/repos/'+r.repo,{json:true,github:true});if(good(res.status)){r.checkedAt=now;r.active=!res.data.archived&&!res.data.disabled;r.archived=!!res.data.archived;r.stars=res.data.stargazers_count;r.pushedAt=res.data.pushed_at;r.topics=res.data.topics||r.topics;r.topic=topicFromTags(r.topics,r.topic);}else if([404,410].includes(res.status))r.active=false;else result.errors.push('github-recheck-http-'+res.status);}catch(e){result.errors.push('github-recheck-'+compactError(e));}
  }
  // No fixed catalogue cap; only the unreviewed queue is bounded.
  state.pending=[...pending.values()].slice(0,600);
  result.pending=state.pending.length;result.total=curated.tools.length+discovery.tools.filter(t=>t.active!==false).length;
  if(result.errors.length)result.status='degraded';else discovery.checkedAt=now;
  return result;
}

export async function pullRegistry({state,pool,agents,get,now,maxPages=12}) {
  state.checked??={};state.scanStarted??=now;
  const haveNames=new Set(agents.map(a=>a.registry?.name).filter(Boolean));
  const haveRepos=new Set(agents.map(a=>repoKey(a.repo_url||'')).filter(Boolean));
  const byName=new Map(pool.candidates.filter(c=>!haveNames.has(c.registry?.name)&&!haveRepos.has(repoKey(c.repo_url||''))).map(c=>[c.registry.name,c]));
  const result={pages:0,seen:0,discovered:0,errors:[]};
  while(result.pages<maxPages){
    const u=new URL(REGISTRY);u.searchParams.set('limit','100');u.searchParams.set('version','latest');if(state.cursor)u.searchParams.set('cursor',state.cursor);if(state.since)u.searchParams.set('updated_since',state.since);
    let r;try{r=await get(u.href,{json:true});if(!good(r.status)||!Array.isArray(r.data?.servers))throw new Error('registry-response');}catch(e){result.errors.push('mcp-registry-'+compactError(e));break;}
    result.pages++;
    for(const entry of r.data.servers){result.seen++;const s=entry.server,m=entry._meta?.['io.modelcontextprotocol.registry/official'];
      if(!s?.name||m?.isLatest===false)continue;
      if(m?.status==='deleted'||m?.status==='deprecated'){
        byName.delete(s.name);for(const a of agents)if(a.origin==='mcp-registry'&&a.registry?.name===s.name){a.registry={...a.registry,status:m.status,withdrawnAt:now};a.status='retired';}continue;
      }
      const c=candidateOf(entry,day(now));if(!c)continue;c.keys.pricing='unstated';
      if(haveNames.has(s.name)||haveRepos.has(repoKey(c.repo_url||'')))continue;
      if(!byName.has(s.name))result.discovered++;
      byName.set(s.name,c);
    }
    const next=r.data.metadata?.nextCursor||'';
    if(next&&next===state.cursor){result.errors.push('mcp-repeated-cursor');break;}
    state.cursor=next;
    if(!next){state.watermark=state.scanStarted;state.since=new Date(new Date(state.watermark)-86400000).toISOString();state.scanStarted=null;break;}
  }
  const used=new Set(agents.map(a=>a.slug));pool.candidates=[...byName.values()].map(c=>{let slug=c.slug,n=2;while(used.has(slug))slug=c.slug+'-'+n++;used.add(slug);return {...c,slug};});pool.source=REGISTRY;pool.pulled=day(now);pool.pages=result.pages;pool.seen=result.seen;pool.eligible=pool.candidates.length;pool.error=result.errors.join(', ')||null;pool.cap=null;
  return result;
}

export async function syncMcp({registry,pool,seeds,admissions,vocab,state,get,now,limits={}}) {
  const agents=registry.agents,today=day(now),result={status:'ok',admitted:0,checked:0,rejected:0,errors:[],...await pullRegistry({state,pool,agents,get,now,maxPages:limits.pages??12})};
  admissions.rejected??={};admissions.admitted??=[];
  for(const a of agents)if(a.origin==='mcp-registry'&&a.keys.pricing==='open-source'){a.keys.pricing='unstated';Object.assign(a,renderFields(a.keys,vocab));}
  for(const c of pool.candidates)if(c.origin==='mcp-registry')c.keys.pricing='unstated';
  const ids=new Set(agents.map(a=>a.slug)),repos=new Set(agents.map(a=>repoKey(a.repo_url||'')).filter(Boolean)),names=new Set(agents.map(a=>a.registry?.name).filter(Boolean));
  const attempted=new Map(Object.entries(admissions.rejected).map(([slug,a])=>[slug,a.attemptedAt||a.last_attempt||'']));
  pool.candidates=pool.candidates.filter(c=>!validateCandidate(c,vocab).length);
  const queue=[];
  const candidates=[...(seeds.candidates||[]),...pool.candidates].sort((a,b)=>String(attempted.get(a.slug)||'').localeCompare(String(attempted.get(b.slug)||'')));
  for(const original of candidates){
    const c=structuredClone(original),key=repoKey(c.repo_url||'');
    if(ids.has(c.slug)||key&&repos.has(key)||c.registry?.name&&names.has(c.registry.name))continue;
    if(attempted.get(c.slug)&&new Date(now)-new Date(attempted.get(c.slug))<86400000)continue;
    if(validateCandidate(c,vocab).length){result.rejected++;continue;}
    // Reserve in this batch as well as checking existing records.
    ids.add(c.slug);if(key)repos.add(key);if(c.registry?.name)names.add(c.registry.name);
    queue.push(c);if(queue.length>=(limits.admit??60))break;
  }
  const checks=await batch(queue,async c=>{
    try{safeURL(c.source_url);if(c.repo_url)safeURL(c.repo_url);
      const source=await get(c.source_url),repo=c.repo_url===c.source_url?source:c.repo_url?await get(c.repo_url):null;
      return {c,source:source.status,repo:repo?.status??null};
    }catch(e){return {c,source:null,repo:null,error:compactError(e)};}
  });
  for(const x of checks){
    if(!good(x.source)){const old=admissions.rejected[x.c.slug];result.rejected++;admissions.rejected[x.c.slug]={attempts:(old?.attempts||0)+1,first_attempt:old?.first_attempt||today,last_attempt:today,attemptedAt:now,source_http:x.source,repo_http:x.repo,reason:x.error||'source HTTP '+x.source};continue;}
    delete admissions.rejected[x.c.slug];
    const a=recordFrom(x.c,vocab,{source:x.source,repo:x.repo},{title:'',description:''},today);agents.push(a);result.admitted++;
    admissions.admitted.push({slug:a.slug,date:today,source_http:x.source,repo_http:x.repo});
  }
  const admittedNames=new Set(agents.map(a=>a.registry?.name).filter(Boolean)),admittedRepos=new Set(agents.map(a=>repoKey(a.repo_url||'')).filter(Boolean));
  pool.candidates=pool.candidates.filter(c=>!admittedNames.has(c.registry?.name)&&!admittedRepos.has(repoKey(c.repo_url||'')));
  const verify=agents.filter(a=>a.status!=='retired'&&a.first_seen!==today).sort((a,b)=>String(state.checked[a.slug]||'').localeCompare(String(state.checked[b.slug]||''))||a.slug.localeCompare(b.slug)).slice(0,limits.verify??40);
  const updates=await batch(verify,async a=>{state.checked[a.slug]=now;try{const s=await get(a.source_url),r=a.repo_url===a.source_url?s:a.repo_url?await get(a.repo_url):null;return {slug:a.slug,res:{source:s.status,repo:r?.status??null}};}catch{return {slug:a.slug,res:{source:null,repo:null}};}});
  for(const u of updates){const i=agents.findIndex(a=>a.slug===u.slug);agents[i]=applyCheck(agents[i],u.res,today);result.checked++;}
  if(checks.length&&checks.every(x=>x.source===null||x.source>=500))result.errors.push('mcp-admission-source-unavailable');
  if(updates.length&&updates.every(x=>x.res.source===null||x.res.source>=500))result.errors.push('mcp-recheck-source-unavailable');
  registry.checked=today;admissions.checked=today;admissions.admitted=admissions.admitted.slice(-3000);
  result.pending=pool.candidates.length;result.total=agents.length;result.status=result.errors.length?'degraded':'ok';
  return result;
}

export function summarize(previous,result,now,runURL){return {...result,attemptedAt:now,lastSuccessAt:result.status==='ok'?now:previous?.lastSuccessAt||null,runURL};}
export async function main(root=join(dirname(fileURLToPath(import.meta.url)),'..')) {
  const now=iso(),state=read(root,'catalog-sync-state.json',{}),status=read(root,'catalog-sync-status.json',{}),curated=read(root,'github-tools.json'),discovery=read(root,'github-discovery.json'),registry=read(root,'agent-watch.json'),pool=read(root,'agent-watch-candidates-registry.json'),admissions=read(root,'agent-watch-admissions.json');
  const runURL=process.env.GITHUB_RUN_ID?'https://github.com/f-tiger/agi-site/actions/runs/'+process.env.GITHUB_RUN_ID:null;
  const get=(url,opts={})=>requestURL(url,{...opts,token:opts.github?(process.env.GITHUB_TOKEN||''):''});
  for(const key of ['github','mcp']){
    let result;
    try{result=key==='github'?await syncGithub({curated,discovery,state:state.github,get,now}):await syncMcp({registry,pool,seeds:read(root,'agent-watch-candidates.json'),admissions,vocab:read(root,'agent-watch-vocab.json'),state:state.mcp,get,now});}
    catch(e){result={status:'degraded',admitted:0,errors:['unexpected-'+compactError(e)]};}
    status[key]=summarize(status[key],result,now,runURL);console.log(key+': '+JSON.stringify(result));
  }
  status.completedAt=iso();status.history=[{at:now,runURL,github:status.github,mcp:status.mcp},...(status.history||[])].slice(0,14);
  write(root,'github-discovery.json',discovery);write(root,'agent-watch.json',registry);write(root,'agent-watch-candidates-registry.json',pool);write(root,'agent-watch-admissions.json',admissions);write(root,'catalog-sync-state.json',state);write(root,'catalog-sync-status.json',status);
  write(root,'github-tool-ids.json',[...curated.tools.map(t=>t.id),...discovery.tools.filter(t=>t.active!==false).map(t=>t.id)]);
  if(status.github.status!=='ok'||status.mcp.status!=='ok')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error('catalog sync failed:',compactError(e));process.exitCode=1;});
