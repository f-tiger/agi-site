import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import {VIDEO_MCP_TOOLS,VIDEO_MCP_PRIVACY,buildVideoMcpCatalog,validateVideoArgs,runVideoTool} from '../lib/video-mcp.mjs';
import {evaluateVideo} from '../assets/video-fit-core.mjs';
import rules from '../data/video-platforms.json' with {type:'json'};
import manifest from '../video-mcp/server.json' with {type:'json'};
import {onRequest} from '../functions/api/video-mcp.js';

const complete={mode:'draft',contentType:'app',goal:'views',audience:'需要整理账单的普通用户',durationSeconds:30,aspect:'vertical',opening:'result',proof:'demo',captions:'yes',audio:'clear',rights:'confirmed',ai:'not_applicable',commercial:'not_applicable',claim:'supported',destination:'not_applicable'};
const cohort={id:'official-day',platform:'红果',metric:'snapshot_heat',label:'2026-10-11 · 红果AI剧热播榜',unit:'热度值',reportId:'official-report',records:[{title:'示例剧',value:1200,sourceRank:2},{title:'另一部',value:9000,sourceRank:1}]};
const report={id:'official-report',publisher:'红果官方公开榜单',url:'https://hongguoduanju.com/rank/hot-ai-drama',observedAt:'2026-10-11',checkedAt:'2026-10-11',method:'热度不是播放量'};
const source={version:3,updatedAt:'2026-10-11',taxonomy:{genres:[{id:'urban',label:'都市'}]},notice:'Public catalogue; playback and authorization unverified.',items:[
 {id:'a',title:'示例剧',category:'urban',genre:'都市',channel:'stories',tags:['职场'],format:'AI剧（来源标注）',synopsis:'用户自报与公开资料不得当作已观影。',url:'https://baipiaoji.com/manju/a',source:'https://example.com/source',publisher:'第三方',checkedAt:'2026-10-04',consumerEntry:{url:'https://hongguoduanju.com/detail?series_id=123',label:'到红果查看',official:true,kind:'official',action:'official_open'},metrics:[{value:1200,sourceRank:2,cohort}]},
 {id:'b',title:'搜索条目',category:'urban',genre:'都市',channel:'stories',tags:['职场'],format:'AI漫剧',url:'https://baipiaoji.com/manju/b',checkedAt:'2026-10-04',consumerEntry:{url:'https://www.douyin.com/search/test',label:'去抖音搜索',official:false,kind:'search',action:'platform_search'},metrics:[]},
 {id:'c',title:'另一部',category:'urban',genre:'都市',channel:'stories',tags:[],format:'AI剧',url:'https://baipiaoji.com/manju/c',consumerEntry:{url:'https://hongguoduanju.com/detail?series_id=456',label:'到红果查看',official:true,kind:'official',action:'official_open'},metrics:[{value:9000,sourceRank:1,cohort}]}
]};
const catalog=buildVideoMcpCatalog(source,{reviewedAt:'2026-10-11',cohorts:[cohort],reports:[report],notice:'热度不是播放量'});
const makeEnv=(data=catalog)=>({ASSETS:{async fetch(request){assert.equal(request.url,'https://baipiaoji.com/manju/mcp-catalog.json');return Response.json(data);}},get HITS(){throw Error('Private MCP must never access analytics or input persistence.');}});
const env=makeEnv();
async function request(message,{method='POST',headers={},body,environment=env}={}){
 const response=await onRequest({request:new Request('https://baipiaoji.com/api/video-mcp?__probe=1',{method,headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','User-Agent':'bpj-ci-selfcheck',...headers},...(method==='GET'?{}:{body:body??JSON.stringify(message)})}),env:environment});
 const text=await response.text();return {status:response.status,headers:response.headers,body:text?JSON.parse(text):null};
}
const rpc=(method,params={})=>({jsonrpc:'2.0',id:1,method,params});
const call=(name,args={},options)=>request(rpc('tools/call',{name,arguments:args}),options);

test('manifest endpoint, negotiate/list/ping and notifications match a stateless read-only server',async()=>{
 assert.equal(manifest.name,'io.github.f-tiger/bpj-video-tools');assert.equal(manifest.remotes[0].url,'https://baipiaoji.com/api/video-mcp');
 for(const protocolVersion of ['2025-11-25','2025-06-18','2025-03-26','future-version']){
  const r=await request(rpc('initialize',{protocolVersion,capabilities:{},clientInfo:{name:'fixture',version:'1'}}));
  assert.equal(r.status,200);assert.equal(r.body.result.serverInfo.version,manifest.version);assert.equal(r.body.result.protocolVersion,protocolVersion==='future-version'?'2025-11-25':protocolVersion);assert.equal(r.headers.get('Cache-Control'),'no-store');
 }
 const list=await request(rpc('tools/list'));assert.deepEqual(list.body.result.tools,VIDEO_MCP_TOOLS);assert.equal(list.body.result.tools.length,3);
 for(const tool of list.body.result.tools){assert.equal(tool.inputSchema.additionalProperties,false);assert.deepEqual(tool.annotations,{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false});}
 const ping=await request(rpc('ping'));assert.deepEqual(ping.body.result,{});
 const notification=await request({jsonrpc:'2.0',method:'notifications/initialized'});assert.equal(notification.status,202);assert.equal(notification.body,null);
});

test('complete declarations reuse the real engine, do not read files, persist or call a model',async()=>{
 const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('No external network allowed');};
 try{
  const r=await call('evaluate_video_publish',complete);assert.equal(r.status,200);assert.equal(r.body.result.isError,undefined);
  const actual=r.body.result.structuredContent,expected=evaluateVideo(complete,null,rules);
  for(const key of ['version','status','mode','measured','supplied','unknown','conflicts','blockers','priority','topActions','platforms'])assert.deepEqual(actual[key],expected[key]);
  assert.deepEqual(actual.priority,['douyin','kuaishou']);assert.equal(actual.measured,null);assert.equal(actual.privacy,VIDEO_MCP_PRIVACY);assert(!JSON.stringify(actual).includes(complete.audience));assert(!JSON.stringify(actual.limitations).includes('文件只在本地读取'));assert.deepEqual(JSON.parse(r.body.result.content[0].text),actual);
  const tutorial=await call('evaluate_video_publish',{...complete,contentType:'tutorial',durationSeconds:240,aspect:'horizontal',proof:'steps'});assert.deepEqual(tutorial.body.result.structuredContent.priority,['bilibili']);
 }finally{globalThis.fetch=originalFetch;}
});

test('unknown evidence stays incomplete; known rights/AI conflicts block priority candidates',async()=>{
 const empty=(await call('evaluate_video_publish',{})).body.result.structuredContent;assert.equal(empty.status,'needs-info');assert.deepEqual(empty.priority,[]);for(const label of ['目标受众','视频时长','画幅','素材权利','AI 内容标识','内容类型','本条视频目标'])assert(empty.unknown.some(item=>item.startsWith(label)),label);
 for(const missing of ['goal','contentType','rights','ai','audience']){const args={...complete};delete args[missing];const output=(await call('evaluate_video_publish',args)).body.result.structuredContent;assert.equal(output.status,'needs-info',missing);assert.deepEqual(output.priority,[]);if(missing==='goal')assert(output.platforms.every(p=>p.experiment===null));}
 const revise=(await call('evaluate_video_publish',{...complete,rights:'uncertain',ai:'unlabelled'})).body.result.structuredContent;assert.equal(revise.status,'revise');assert(revise.blockers.length>=2);assert.deepEqual(revise.priority,[]);
 const conflict=(await call('evaluate_video_publish',{...complete,goal:'try'})).body.result.structuredContent;assert.equal(conflict.status,'revise');assert(conflict.conflicts.length);
});

test('runtime schema rejects files, URLs, scripts, injection keys, invalid enums and numeric bounds without echo',async()=>{
 for(const args of [{mode:'file'},{media:{url:'https://private.invalid/video'}},{url:'https://private.invalid/video'},{audience:'https://private.invalid/video'},{title:'private unpublished script'},{rights:true},{durationSeconds:0},{durationSeconds:-1},{durationSeconds:86401},{durationSeconds:'30'},{captions:'verified'},JSON.parse('{"__proto__":{"polluted":true}}'),{audience:'a'.repeat(121)},{audience:'a\nsecret'},[],null]){
  const r=await call('evaluate_video_publish',args);assert.equal(r.body.result.isError,true,JSON.stringify(args));assert.equal(r.body.result.structuredContent.error,'invalid_arguments');assert(!JSON.stringify(r.body.result).includes('private.invalid'));assert(!JSON.stringify(r.body.result).includes('private unpublished'));
 }
 assert.throws(()=>validateVideoArgs('evaluate_video_publish',{durationSeconds:NaN}));assert.throws(()=>validateVideoArgs('evaluate_video_publish',{durationSeconds:Infinity}));assert.equal({}.polluted,undefined);
});

test('source status, checked dates, and source wording are preserved separately from editorial checks',async()=>{
 const output=(await call('get_video_platform_rules',{platform:'weixin'})).body.result.structuredContent;
 assert.equal(output.checkedAt,rules.checkedAt);assert.equal(output.version,rules.version);assert.deepEqual(output.platforms,[rules.platforms.find(p=>p.id==='weixin')]);assert.equal(output.platforms[0].sources[0].evidenceStatus,'official_url_located_fulltext_inaccessible');assert.deepEqual(output.globalEvidence,rules.globalEvidence);assert.equal(output.measurementContract.privacy,VIDEO_MCP_PRIVACY);
 assert.equal((await call('get_video_platform_rules')).body.result.structuredContent.platforms.length,6);
});

test('compact catalogue preserves source dates, official/search distinction, metrics and bounded same-cohort ordering',async()=>{
 assert(!JSON.stringify(catalog).includes('"records"'));assert.equal(catalog.items[0].metrics[0].cohortId,'official-day');assert.deepEqual(catalog.cohorts[0].report,report);
 const ranked=(await call('search_manju',{cohort:'official-day',sort:'source_rank',limit:1})).body.result.structuredContent;assert.equal(ranked.returned,1);assert.equal(ranked.totalMatches,2);assert.equal(ranked.items[0].id,'c');assert.equal(ranked.items[0].metrics[0].value,9000);assert.equal(ranked.cohorts[0].metric,'snapshot_heat');assert.equal(ranked.cohorts[0].unit,'热度值');assert.equal(ranked.cohorts[0].report.observedAt,'2026-10-11');assert(!('plays' in ranked.items[0]));
 const found=(await call('search_manju',{query:'示例',officialOnly:true})).body.result.structuredContent;assert.equal(found.items[0].checkedAt,'2026-10-04');assert.equal(found.updatedAt,'2026-10-11');assert.equal(found.items[0].consumerEntry.official,true);
 const platformSearch=(await call('search_manju',{query:'搜索条目'})).body.result.structuredContent;assert.equal(platformSearch.items[0].consumerEntry.kind,'search');assert.equal(platformSearch.items[0].consumerEntry.official,false);assert.deepEqual(platformSearch.items[0].metrics,[]);
 const tags=(await call('search_manju',{query:'都市 职场',category:'urban'})).body.result.structuredContent;assert.equal(tags.totalMatches,2);
 const miss=(await call('search_manju',{query:'this video is not in the published catalogue'})).body.result.structuredContent;assert.equal(miss.totalMatches,0);assert.deepEqual(miss.items,[]);assert.equal(miss.crawlTriggered,false);
 for(const args of [{limit:0},{limit:21},{sort:'source_rank'},{cohort:'missing'},{category:'missing'},{query:'x'.repeat(121)}])assert.equal((await call('search_manju',args)).body.result.isError,true);
});

test('transport rejects malformed/private origin/oversize requests and returns bounded service errors',async()=>{
 assert.equal((await request(rpc('ping'),{method:'GET'})).status,405);
 for(const Origin of ['https://attacker.invalid','null',''])assert.equal((await request(rpc('ping'),{headers:{Origin}})).status,403);
 assert.equal((await request(rpc('ping'),{headers:{Origin:'https://baipiaoji.com'}})).status,200);
 assert.equal((await request(rpc('ping'),{headers:{'MCP-Protocol-Version':'unsupported'}})).status,400);
 assert.equal((await request(rpc('ping'),{headers:{'Content-Type':'text/plain'}})).status,415);
 assert.equal((await request(null,{body:'x'.repeat(16385)})).status,413);
 assert.equal((await request(null,{body:'{'})).body.error.code,-32700);
 for(const message of [[],null,{jsonrpc:'2.0',id:{secret:'hidden'},method:'ping'},{jsonrpc:'1.0',id:1,method:'ping'},rpc('ping',[]),{jsonrpc:'2.0',method:'tools/list'}])assert.equal((await request(message)).body.error.code,-32600);
 assert.equal((await request(rpc('initialize'))).body.error.code,-32602);
 assert.equal((await request(rpc('tools/list',{cursor:'invalid'}))).body.error.code,-32602);
 assert.equal((await request(rpc('unknown_method'))).body.error.code,-32601);
 assert.equal((await call('unknown_tool')).body.error.code,-32602);
 const broken={ASSETS:{fetch:()=>{throw Error('sensitive internal failure');}}};const fail=await call('search_manju',{}, {environment:broken});assert.equal(fail.body.result.isError,true);assert.equal(fail.body.result.structuredContent.error,'temporarily_unavailable');assert(!JSON.stringify(fail).includes('sensitive internal'));
});

test('published compact asset matches full catalogue projection when dist is available',async()=>{
 const full=new URL('../dist/manju/catalog.json',import.meta.url),insights=new URL('../dist/manju/insights.json',import.meta.url),compact=new URL('../dist/manju/mcp-catalog.json',import.meta.url);
 if(!existsSync(full)||!existsSync(insights))return;
 const published=JSON.parse(readFileSync(full)),evidence=JSON.parse(readFileSync(insights)),projected=buildVideoMcpCatalog(published,evidence);
 assert.equal(projected.items.length,published.items.length);assert(!JSON.stringify(projected).includes('"records"'));assert(Buffer.byteLength(JSON.stringify(projected))<2*1024*1024);
 for(const item of projected.items){assert.match(item.url,/^https:\/\/baipiaoji\.com\/manju\//);assert.deepEqual(item.consumerEntry,published.items.find(i=>i.id===item.id).consumerEntry);}
 if(existsSync(compact))assert.deepEqual(JSON.parse(readFileSync(compact)),projected);
 const actual=await runVideoTool('search_manju',{officialOnly:true,limit:20},makeEnv(projected));assert.equal(actual.returned,20);assert(actual.items.every(item=>item.consumerEntry.official));assert(actual.cohorts.some(c=>c.report?.observedAt));
});

test('a worker bounds repeated tool invocations without durable counters or raw input persistence',async()=>{
 const options={headers:{'CF-Connecting-IP':'203.0.113.77'}};
 for(let i=0;i<120;i++)assert.equal((await call('get_video_platform_rules',{platform:'weixin'},options)).status,200);
 const denied=await call('get_video_platform_rules',{platform:'weixin'},options);assert.equal(denied.status,429);assert.equal(denied.headers.get('Retry-After'),'60');assert.equal(denied.body.error.code,-32029);assert(!JSON.stringify(denied).includes('203.0.113.77'));
 assert.equal((await call('get_video_platform_rules',{}, {headers:{'CF-Connecting-IP':'203.0.113.78'}})).status,200);
});
