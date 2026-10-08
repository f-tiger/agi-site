import assert from 'node:assert/strict';
import './test-catalog-network.mjs';
import {readFileSync} from 'node:fs';
import {syncGithub,pullRegistry,syncMcp,summarize,REGISTRY,repoKey,admissionQueue,topicFromTags,eligibleRepo} from './catalog-sync.mjs';
import {safeURL,publicIP,requestURL} from './catalog-network.mjs';
import {candidateOf} from './agent-watch-registry-pull.mjs';
import {mergeCatalog,discoveryCard} from '../lib/github-catalog.mjs';
const now='2026-10-02T13:00:00.000Z',tomorrow='2026-10-04T13:00:00.000Z';
const repo=(name,extra={})=>({full_name:'acme/'+name,name,description:'A maintained AI project',visibility:'public',stargazers_count:1200,pushed_at:'2026-10-01T00:00:00Z',fork:false,archived:false,...extra});
const entry=(name,extra={},meta={})=>({server:{name:'io.github.acme/'+name,description:'An MCP server',repository:{url:'https://github.com/acme/'+name},...extra},_meta:{'io.modelcontextprotocol.registry/official':{status:'active',isLatest:true,updatedAt:now,...meta}}});
const vocab=JSON.parse(readFileSync(new URL('../data/agent-watch-vocab.json',import.meta.url)));
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name);};
check('unsafe URLs, alternate ports, credentials and private addresses are blocked',()=>{
 for(const u of ['http://github.com/a/b','https://127.0.0.1/','https://2130706433/','https://169.254.169.254/','https://10.0.0.1/','https://[::1]/','https://[::ffff:127.0.0.1]/','https://admin:secret@github.com/','https://example.com:444/','https://host.internal/'])assert.throws(()=>safeURL(u));
 for(const ip of ['192.168.1.1','172.16.0.1','100.64.1.1','fc00::1','fe80::1'])assert.equal(publicIP(ip),false);
 assert.equal(safeURL('https://github.com/acme/tool').host,'github.com');assert.equal(publicIP('8.8.8.8'),true);
});
await assert.rejects(requestURL('https://untrusted.example/',{resolve:async()=>[{address:'127.0.0.1',family:4}],retries:0}),/unsafe-dns/);count++;
const curated={tools:[{id:'known',repo:'acme/known'}]},discovery={tools:[]},state={queryIndex:0,page:1,pending:[],checked:{}};
const api=async url=>url.includes('/search/')?{status:200,data:{items:[repo('known'),repo('new'),repo('new'),repo('old',{archived:true}),repo('fork',{fork:true}),repo('awesome-ai'),repo('tiny',{stargazers_count:3})]}}:url.endsWith('/readme')?{status:200,data:{encoding:'base64',content:Buffer.from('Official installation and usage documentation. '.repeat(12)).toString('base64')}}:{status:200,data:repo('new')};
const first=await syncGithub({curated,discovery,state,get:api,now,limits:{queries:1,verify:0}});
check('GitHub admission filters archives, forks, collections and duplicates',()=>{assert.equal(first.admitted,1);assert.equal(first.total,2);assert.equal(state.queryIndex,1);assert.equal(discovery.tools[0].repo,'acme/new');});
const card=discoveryCard(discovery.tools[0]);
check('automatic records do not fabricate licensing, hardware or installation evidence',()=>{assert.equal(card.mode,'review');assert.equal(card.kind,'project');assert.equal(card.origin,'automatic');assert.match(card.cost.en,/not imply free/);assert.match(card.caution.en,/No installation test/);});
check('duplicates are suppressed across editorial and automatic entries',()=>{assert.equal(mergeCatalog(curated,{tools:[...discovery.tools,...discovery.tools]}).tools.length,2);});
const before=structuredClone(discovery),failed=await syncGithub({curated,discovery,state,get:async()=>({status:429}),now:tomorrow,limits:{queries:1,verify:0}});
check('API failure preserves catalogue and last successful verification date',()=>{assert.equal(failed.status,'degraded');assert.deepEqual(discovery,before);assert.equal(state.queryIndex,1);assert.equal(summarize({lastSuccessAt:now},failed,tomorrow,null).lastSuccessAt,now);});
const networkFailure=new AggregateError([Object.assign(new Error('IPv6 unreachable'),{code:'ENETUNREACH'}),Object.assign(new Error('IPv4 timeout'),{code:'ETIMEDOUT'})]);
const failedMcpState={cursor:'unread-page',watermark:now,since:now,checked:{}};
const failedMcp=await syncMcp({registry:{agents:[]},pool:{candidates:[]},seeds:{candidates:[]},admissions:{rejected:{},admitted:[]},vocab,state:failedMcpState,now:tomorrow,get:async()=>{throw networkFailure;}});
check('transport exhaustion produces degraded MCP status without erasing the completed GitHub lane',()=>{
 assert.equal(failedMcp.status,'degraded');assert.deepEqual(failedMcp.errors,['mcp-registry-network-or-response-error']);
 assert.equal(failedMcpState.cursor,'unread-page');assert.equal(failedMcpState.watermark,now);
 const status={github:summarize(null,first,now,null),mcp:summarize({lastSuccessAt:now},failedMcp,tomorrow,null)};
 assert.equal(status.github.admitted,1);assert.equal(status.github.status,'ok');assert.equal(status.mcp.lastSuccessAt,now);assert.equal(status.mcp.attemptedAt,tomorrow);
});
await syncGithub({curated,discovery,state,get:async()=>({status:200,data:repo('new',{archived:true})}),now:tomorrow,limits:{queries:0,verify:1}});
check('archived automatic records leave public listings but retain history',()=>{assert.equal(discovery.tools[0].active,false);assert.equal(mergeCatalog(curated,discovery).tools.length,1);});

const mstate={cursor:'',since:null,watermark:null,scanStarted:null,checked:{}},pool={candidates:[]},agents=[];let calls=0;
const partial=await pullRegistry({state:mstate,pool,agents,now,maxPages:3,get:async url=>{calls++;return calls===1?{status:200,data:{servers:[entry('a')],metadata:{nextCursor:'page-two'}}}:{status:500};}});
check('MCP partial pagination persists candidates and cursor, never advances watermark',()=>{assert.equal(partial.errors.length,1);assert.equal(mstate.cursor,'page-two');assert.equal(mstate.watermark,null);assert.equal(pool.candidates.length,1);});
const seen=[];await pullRegistry({state:mstate,pool,agents,now:tomorrow,maxPages:2,get:async url=>{seen.push(new URL(url));return {status:200,data:{servers:[entry('b')],metadata:{}}};}});
check('MCP resumes the failed page and switches to overlapping incremental updates',()=>{assert.equal(seen[0].searchParams.get('cursor'),'page-two');assert.equal(pool.candidates.length,2);assert.equal(mstate.watermark,now);assert.equal(mstate.since,'2026-10-01T13:00:00.000Z');});
const a=candidateOf(entry('a'),now),alias=candidateOf(entry('alias',{repository:{url:'https://github.com/acme/a'}}),now),b=candidateOf(entry('b'),now),reg={agents:[],checked:'2026-10-01'},adm={rejected:{},admitted:[]};
const result=await syncMcp({registry:reg,pool:{candidates:[a,alias,b]},seeds:{candidates:[]},admissions:adm,vocab,state:{checked:{}},now,limits:{pages:0,verify:0},get:async url=>({status:url.endsWith('/b')?503:200})});
check('MCP reserves duplicate repositories within each batch and rejects unavailable official pages',()=>{assert.equal(result.admitted,1);assert.equal(reg.agents.length,1);assert.equal(adm.rejected[b.slug].last_attempt,'2026-10-02');assert.equal(reg.agents[0].keys.pricing,'unstated');});
await pullRegistry({state:{checked:{}},pool:{candidates:[]},agents:reg.agents,now:tomorrow,maxPages:1,get:async()=>({status:200,data:{servers:[entry('a',{}, {status:'deleted'})],metadata:{}}})});
check('an official deletion retires the matching automatic listing',()=>{assert.equal(reg.agents[0].status,'retired');assert.equal(reg.agents[0].registry.status,'deleted');});
const web=candidateOf(entry('website-only',{repository:undefined,websiteUrl:'https://example.com/mcp'}),now);
const webReg={agents:[{slug:'other-web',source_url:'https://other.example/',repo_url:null,first_seen:'2026-10-01',keys:{},origin:'curated'}]};
const webResult=await syncMcp({registry:webReg,pool:{candidates:[web]},seeds:{candidates:[]},admissions:{rejected:{},admitted:[]},vocab,state:{checked:{}},now,limits:{pages:0,verify:0},get:async()=>({status:200})});
check('website-only MCP servers are not collapsed into one empty repository key',()=>{assert.equal(repoKey(''),'');assert.equal(webResult.admitted,1);});
const collisionPool={candidates:[]};await pullRegistry({state:{checked:{}},pool:collisionPool,agents:[{slug:'acme-collide',repo_url:'https://github.com/other/existing'}],now,maxPages:1,get:async()=>({status:200,data:{servers:[entry('collide')],metadata:{}}})});
check('namespace slugs cannot collide with already-published records',()=>{assert.equal(collisionPool.candidates[0].slug,'acme-collide-2');});
check('daily admission mixes topic queues rather than letting one broad search fill every slot',()=>{const q=admissionQueue([{repo:'a',topic:'ai'},{repo:'b',topic:'ai'},{repo:'c',topic:'coding'},{repo:'d',topic:'audio'}],now,3);assert.deepEqual(q.map(x=>x.repo),['a','c','d']);});
check('publisher topics keep agents and coding out of model-training labels',()=>{assert.equal(topicFromTags(['llm','agents'],'models'),'agents');assert.equal(topicFromTags(['llm'],'models'),'ai');assert.equal(topicFromTags(['fine-tuning'],'ai'),'models');assert.equal(eligibleRepo(repo('autogen',{full_name:'microsoft/autogen'}),now),false);});
const rotation={tools:[{...before.tools[0],id:'older',repo:'acme/older',discoveredAt:'2026-09-01T00:00:00Z',checkedAt:'2026-09-02T00:00:00Z'},{...before.tools[0],id:'fresh',repo:'acme/fresh',checkedAt:now}]};
const checkedURLs=[];await syncGithub({curated:{tools:[]},discovery:rotation,state:{queryIndex:0,page:1,pending:[],checked:{older:'2026-09-02T00:00:00Z'}},now:tomorrow,limits:{queries:0,admit:0,verify:1},get:async url=>{checkedURLs.push(url);return {status:200,data:repo('older')};}});
check('new admissions do not starve older projects that have already been rechecked',()=>assert.deepEqual(checkedURLs,['https://api.github.com/repos/acme/older']));
const source=readFileSync(new URL('../../../.github/workflows/deploy-baipiaoji.yml',import.meta.url),'utf8');
check('daily discovery, durable commit and failure gate belong to the site workflow',()=>{assert.match(source,/cron: '30 0 \* \* \*'/);assert.match(source,/run: node scripts\/catalog-sync.mjs/);assert.match(source,/steps.catalog_sync.outcome/);assert.match(source,/steps.catalog_commit.outcome/);assert.match(source,/cancel-in-progress: false/);});
if(process.argv.includes('--dist')){
 for(const prefix of ['','en/']){const html=readFileSync(new URL('../dist/'+prefix+'index.html',import.meta.url),'utf8');check(prefix+'homepage exposes actual GitHub projects before the directory',()=>{assert.ok(html.indexOf('id="github-tools"')<html.indexOf('id="directory"'));assert.equal((html.match(/class="bpj-github-pick"/g)||[]).length,6);assert.match(html,/id="home-github-query"/);assert.match(html,/data-catalog-status="mcp"/);assert.match(html,/data-catalog-status="github"/);});}
 const published=JSON.parse(readFileSync(new URL('../dist/catalog-sync.json',import.meta.url)));check('public status is real source data',()=>assert.deepEqual(published,JSON.parse(readFileSync(new URL('../data/catalog-sync-status.json',import.meta.url)))));
}
console.log('PASS '+count+' catalogue automation and adversarial checks (fixtures, no network).');

