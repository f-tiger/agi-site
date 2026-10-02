import assert from 'node:assert/strict';
import {SERVER,TOOLS,RESOURCES,DEMO_INPUT} from '../../collector-assets/mcp-contract.mjs';
const origin='https://thedollscout.com';
async function rpc(method,params={}){const r=await fetch(origin+'/mcp?ci=1',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','User-Agent':'tds-ci-selfcheck/1.0','x-probe':'mcp-release'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);const j=await r.json();assert.ok(!j.error,JSON.stringify(j.error));return j.result;}
assert.deepEqual((await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'tds-ci-selfcheck',version:'1'}})).serverInfo,SERVER);
assert.deepEqual((await rpc('tools/list')).tools,TOOLS);
assert.deepEqual((await rpc('resources/list')).resources,RESOURCES);
const fit=await rpc('tools/call',{name:'plan_display_fit',arguments:DEMO_INPUT});assert.equal(fit.isError,false);assert.equal(fit.structuredContent.count,12);assert.equal(fit.structuredContent.columns,4);
const style=await rpc('tools/call',{name:'calculate_style_probability',arguments:{target:'regular',regularStyles:6,secretOddsN:72,boxes:12}});assert.equal(style.isError,false);assert.ok(Math.abs(style.structuredContent.probabilityPerBox-71/432)<1e-12);assert.match(style.structuredContent.model,/Assumption/);
const guide=await rpc('tools/call',{name:'get_collecting_guide',arguments:{brand:'jellycat',language:'zh'}});assert.equal(guide.structuredContent.language,'zh');assert.match(guide.structuredContent.officialSource,/jellycat.com/);
const catalog=await rpc('tools/call',{name:'find_collector_tools',arguments:{task:'collection',language:'zh'}});assert.ok(catalog.structuredContent.tools.every(t=>t.execution==='browser-only'&&t.languageFallback));
for(const resource of RESOURCES){const r=await rpc('resources/read',{uri:resource.uri});assert.equal(r.contents[0].uri,resource.uri);assert.ok(JSON.parse(r.contents[0].text));}
for(const p of ['/for-agents','/de/for-agents','/zh/for-agents','/.well-known/mcp.json','/mcp/server.json']){const r=await fetch(origin+p,{headers:{'x-probe':'mcp-release','User-Agent':'tds-ci-selfcheck/1.0'},signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,p);}
const budget=await rpc('tools/call',{name:'compare_blind_box_budget',arguments:{budget:100,boxCost:15,fixedCost:10,confirmedCost:80,probabilityPercent:5}});assert.equal(budget.structuredContent.boxes,6);assert.equal(budget.structuredContent.maxSpend,100);
const progress=await rpc('tools/call',{name:'estimate_collection_progress',arguments:{regularStyles:6,ownedStyles:4,boxes:6,secretPercent:0}});assert.ok(Math.abs(progress.structuredContent.expectedNewRegularStyles-2*(1-(5/6)**6))<1e-12);
const smiski=await rpc('tools/call',{name:'get_collecting_guide',arguments:{brand:'smiski',language:'de'}});assert.equal(smiski.structuredContent.brand,'smiski');
console.log(JSON.stringify({mcp:'verified',version:SERVER.version,tools:TOOLS.map(t=>t.name),resources:RESOURCES.length,displayExample:fit.structuredContent.count,privateCollectionAccess:false}));
