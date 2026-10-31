import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {onRequest,MAX_MCP_REQUEST_BYTES} from '../../functions/mcp.js';import {TOOLS,SERVER,RESOURCES,DEMO_INPUT} from '../../collector-assets/mcp-contract.mjs';
import {styleProbability} from '../../collector-assets/style-odds-core.mjs';
import {buildDiscovery} from './discovery.mjs';
import {brands,locales,origin,updated,route} from './content.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const env={ASSETS:{fetch:async u=>{try{return new Response(await fs.readFile(path.join(root,new URL(u).pathname)))}catch{return new Response('',{status:404})}}}};
async function rpc(method,params={},options={}){const r=await onRequest({env,request:new Request('https://thedollscout.com/mcp',{method:'POST',headers:{'content-type':'application/json',...options.headers},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})})});return r.json();}
test('MCP discovery and schema come from the same shipped contract',async()=>{assert.deepEqual((await rpc('initialize')).result.serverInfo,SERVER);assert.deepEqual((await rpc('tools/list')).result.tools,TOOLS);assert.deepEqual((await rpc('resources/list')).result.resources,RESOURCES);for(const uri of RESOURCES.map(r=>r.uri))assert.ok((await rpc('resources/read',{uri})).result.contents[0].text);assert.equal((await rpc('resources/read',{uri:'https://example.com/private'})).error.code,-32602);});
test('assistant display plan agrees with the actual browser calculator and visible demo',async()=>{const j=await rpc('tools/call',{name:'plan_display_fit',arguments:DEMO_INPUT});assert.equal(j.result.isError,false);const result=j.result.structuredContent;assert.equal(result.count,12);assert.equal(result.columns,4);assert.equal(result.rows,3);assert.equal(result.rotated,false);const nofit=await rpc('tools/call',{name:'plan_display_fit',arguments:{...DEMO_INPUT,height:10}});assert.equal(nofit.result.structuredContent.count,0);const rotation=await rpc('tools/call',{name:'plan_display_fit',arguments:{width:10,depth:6,height:5,itemWidth:6,itemDepth:5,itemHeight:5,gap:0,rotate:true}});assert.equal(rotation.result.structuredContent.count,2);assert.equal(rotation.result.structuredContent.rotated,true);});
test('invalid and private parameters never become plausible calculator output',async()=>{for(const args of [{...DEMO_INPUT,width:'40'},{...DEMO_INPUT,rotate:'false'},{...DEMO_INPUT,gap:-1},{...DEMO_INPUT,privateFile:'secret'},{width:4},[]]){const j=await rpc('tools/call',{name:'plan_display_fit',arguments:args});assert.equal(j.result.isError,true);assert.equal(j.result.structuredContent,undefined);}assert.equal((await rpc('tools/call',{name:'secret_pull_probability',arguments:{oddsN:72,boxes:1.5}})).result.isError,true);assert.equal((await rpc('tools/call',{name:'read_private_collection'})).error.code,-32602);});
test('brand evidence, language fallback and browser-only boundary are accurate',async()=>{const g=(await rpc('tools/call',{name:'get_collecting_guide',arguments:{brand:'jellycat',language:'zh'}})).result.structuredContent;assert.equal(g.language,'zh');assert.match(g.officialSource,/jellycat.com/);const tools=(await rpc('tools/call',{name:'find_collector_tools',arguments:{task:'collection',language:'zh'}})).result.structuredContent.tools;assert.ok(tools.length);for(const t of tools.filter(t=>t.execution==='browser-only')){assert.equal(t.execution,'browser-only');assert.equal(t.languageFallback,t.id!=='series-checklists');assert.equal(t.selectedUrl,t.id==='series-checklists'?'https://thedollscout.com/zh/series':t.urls.en);assert.equal(t.mcpTool,undefined);}assert.deepEqual(tools.filter(t=>t.mcpTool).map(t=>t.mcpTool).sort(),['prepare_collection_checklist','search_collection_series']);const odds=(await rpc('tools/call',{name:'secret_pull_probability',arguments:{oddsN:72,boxes:12}})).result.structuredContent;assert.equal(odds.probabilityPercent,'15.5%');});
test('assistant discovery describes persistent browser checklists without granting remote access',async()=>{
 let generated;
 buildDiscovery({brands,locales,origin,updated,route,esc:String,emit:()=>{},write:(file,text)=>{if(file==='collector-assets/tool-capabilities.json')generated=JSON.parse(text);}});
 const expected=generated.tools.find(t=>t.id==='series-checklists');
 for(const language of ['en','de','zh']){
  const result=(await rpc('tools/call',{name:'find_collector_tools',arguments:{task:'collection',language}})).result.structuredContent;
  const checklist=result.tools.find(t=>t.id==='series-checklists');
  assert.equal(checklist.limitations,expected.limitations,'shipped MCP data must match its generator');
  assert.match(checklist.limitations,/same browser profile/);
  assert.match(checklist.limitations,/shared with the collection tracker across site languages and tabs/);
  assert.match(checklist.limitations,/JSON backups/);
  assert.match(checklist.limitations,/clearing browser data/);
  assert.match(checklist.limitations,/No cloud sync/);
  assert.match(checklist.limitations,/MCP cannot read or edit/);
  assert.doesNotMatch(checklist.limitations,/current tab only|resets on navigation/i);
  assert.equal(checklist.execution,'browser-only');
  assert.equal(checklist.mcpTool,undefined);
 }
});
test('malformed messages, oversized payloads and unexpected browser origins are rejected',async()=>{for(const [body,status]of [['{',200],[JSON.stringify([]),200],['x'.repeat(MAX_MCP_REQUEST_BYTES+1),413]]){const r=await onRequest({env,request:new Request('https://thedollscout.com/mcp',{method:'POST',body})});assert.equal(r.status,status);if(status===200)assert.ok((await r.json()).error);}const r=await onRequest({env,request:new Request('https://thedollscout.com/mcp',{method:'POST',headers:{origin:'https://untrusted.example'},body:'{}'})});assert.equal(r.status,403);});
test('transport accepts maximum documented lists, including UTF-8 and escaped Unicode',async()=>{
 for(const [ownedCharacter,wantedCharacter,escaped] of [['A','B',false],['藏','愿',false],['藏','愿',true]]){
  const names=character=>Array.from({length:100},(_,i)=>String(i).padStart(3,'0')+character.repeat(117));
  const args={seriesId:'smiski-museum',owned:names(ownedCharacter),wanted:names(wantedCharacter),language:'zh'};
  let body=JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'prepare_collection_checklist',arguments:args}});
  if(escaped)body=body.replace(/[\u0080-\uffff]/g,character=>'\\u'+character.charCodeAt(0).toString(16).padStart(4,'0'));
  const bytes=new TextEncoder().encode(body).byteLength;
  assert.ok(bytes>16384&&bytes<MAX_MCP_REQUEST_BYTES);
  const response=await onRequest({env,request:new Request('https://thedollscout.com/mcp?ci=1',{method:'POST',headers:{'content-type':'application/json','content-length':String(bytes)},body})});
  assert.equal(response.status,200);
  const result=(await response.json()).result;assert.equal(result.isError,false);
  assert.deepEqual(result.structuredContent.unmatchedOwned,args.owned);
  assert.deepEqual(result.structuredContent.unmatchedWanted,args.wanted);
  assert.deepEqual(result.structuredContent.owned,[]);assert.deepEqual(result.structuredContent.wanted,[]);
 }
});
test('request limit uses actual UTF-8 bytes and rejects oversized declared lengths',async()=>{
 const send=(body,headers={})=>onRequest({env,request:new Request('https://thedollscout.com/mcp?ci=1',{method:'POST',headers,body})});
 const ping=JSON.stringify({jsonrpc:'2.0',id:1,method:'ping'});
 const exact=ping+' '.repeat(MAX_MCP_REQUEST_BYTES-new TextEncoder().encode(ping).byteLength);
 const accepted=await send(exact);assert.equal(accepted.status,200);assert.deepEqual((await accepted.json()).result,{});
 assert.equal((await send(exact+' ')).status,413);
 const unicode='藏'.repeat(Math.floor(MAX_MCP_REQUEST_BYTES/3)+1);
 assert.ok(unicode.length<MAX_MCP_REQUEST_BYTES);assert.equal((await send(unicode)).status,413);
 assert.equal((await send(ping,{'content-length':String(MAX_MCP_REQUEST_BYTES+1)})).status,413);
});
test('style math handles regular replacement, secrets, known odds and endpoints',()=>{
 const regular=styleProbability({target:'regular',regularStyles:6,secretOddsN:72,boxes:12});
 assert.ok(Math.abs(regular.probabilityPerBox-71/432)<1e-12);
 const secret=styleProbability({target:'secret',secretOddsN:72,boxes:12});
 assert.ok(Math.abs(regular.probabilityPerBox*6+secret.probabilityPerBox-1)<1e-12);
 assert.ok(Math.abs(secret.probabilityAtLeastOne-Number(72n**12n-71n**12n)/Number(72n**12n))<1e-12);
 const exact=styleProbability({target:'printed',probabilityPercent:25,boxes:2});
 assert.equal(exact.probabilityAtLeastOne,.4375);assert.equal(exact.expectedCount,.5);
 for(const p of [0,100]){const r=styleProbability({target:'printed',probabilityPercent:p,boxes:100000});assert.equal(r.probabilityAtLeastOne,p/100);assert.equal(r.boxesFor50pct,p===0?null:1);}
 const small=styleProbability({target:'printed',probabilityPercent:1e-8,boxes:1});assert.ok(Math.abs(small.probabilityPerBox-small.probabilityAtLeastOne)<1e-20);
 for(const input of [{target:'regular',boxes:1,secretOddsN:72},{target:'secret',boxes:1.2,secretOddsN:72},{target:'secret',boxes:0,secretOddsN:72},{target:'printed',boxes:1,probabilityPercent:101},{target:'printed',boxes:1,probabilityPercent:NaN},{target:'printed',boxes:1,probabilityPercent:5,secretOddsN:72}])assert.throws(()=>styleProbability(input),RangeError);
});
test('style MCP matches browser math and rejects missing mode inputs',async()=>{
 const args={target:'regular',regularStyles:6,secretOddsN:72,boxes:12};
 const response=(await rpc('tools/call',{name:'calculate_style_probability',arguments:args})).result;
 assert.equal(response.isError,false);assert.deepEqual(response.structuredContent,{...styleProbability(args),source:'https://thedollscout.com/brands/labubu#style-probability'});
 const missing=(await rpc('tools/call',{name:'calculate_style_probability',arguments:{target:'printed',boxes:12}})).result;assert.equal(missing.isError,true);
 const catalog=(await rpc('tools/call',{name:'find_collector_tools',arguments:{task:'odds',language:'zh'}})).result.structuredContent;
 assert.ok(catalog.tools.some(t=>t.mcpTool==='calculate_style_probability'&&!t.languageFallback&&t.selectedUrl.endsWith('/zh/brands/labubu#style-probability')));
});

test('every brand page exposes a localized inline calculator to assistants',async()=>{
 for(const language of ['en','de','zh']){
  const prefix=language==='en'?'':'/'+language;
  const all=(await rpc('tools/call',{name:'find_collector_tools',arguments:{language}})).result.structuredContent.tools;
  for(const [brand,tool,anchor]of [['skullpanda','calculate_style_probability','style-probability'],['sonny-angel','calculate_style_probability','style-probability'],['skullpanda','plan_display_fit','display-fit'],['jellycat','plan_display_fit','display-fit']]){
   const url='https://thedollscout.com'+prefix+'/brands/'+brand+'#'+anchor;
   assert.ok(all.some(t=>t.selectedUrl===url&&t.mcpTool===tool&&!t.languageFallback));
   const guide=(await rpc('tools/call',{name:'get_collecting_guide',arguments:{brand,language}})).result.structuredContent;
   assert.ok(guide.toolUrls.includes(url));
  }
 }
 const fit=(await rpc('tools/call',{name:'plan_display_fit',arguments:{width:60,depth:30,height:40,itemWidth:20,itemDepth:15,itemHeight:25,gap:2,rotate:true}})).result.structuredContent;
 assert.equal(fit.count,3);assert.equal(fit.columns,3);assert.equal(fit.rows,1);assert.equal(fit.rotated,true);
});


test('budget and progress MCP tools execute the browser core and validate cross-field counts',async()=>{
 const budget=(await rpc('tools/call',{name:'compare_blind_box_budget',arguments:{budget:100,boxCost:15,fixedCost:10,confirmedCost:80,probabilityPercent:5}})).result;
 assert.equal(budget.isError,false);assert.equal(budget.structuredContent.boxes,6);assert.equal(budget.structuredContent.maxSpend,100);
 const progress=(await rpc('tools/call',{name:'estimate_collection_progress',arguments:{regularStyles:6,ownedStyles:4,boxes:6,secretPercent:0}})).result;
 assert.equal(progress.isError,false);assert.ok(Math.abs(progress.structuredContent.expectedNewRegularStyles-2*(1-(5/6)**6))<1e-12);
 assert.equal((await rpc('tools/call',{name:'estimate_collection_progress',arguments:{regularStyles:6,ownedStyles:7,boxes:6,secretPercent:0}})).result.isError,true);
 for(const brand of ['smiski','hirono','dimoo','molly'])for(const language of ['en','de','zh']){const g=(await rpc('tools/call',{name:'get_collecting_guide',arguments:{brand,language}})).result.structuredContent;assert.equal(g.brand,brand);assert.equal(g.language,language);assert.ok(g.toolUrls.some(u=>u.endsWith('#display-fit')));}
});


test('source search and collection comparison return actual results through JSON-RPC',async()=>{
 const catalog=JSON.parse(await fs.readFile(path.join(root,'collector-assets/series-catalog.json'),'utf8'));
 const museum=catalog.series.find(s=>s.id==='smiski-museum');
 const search=(await rpc('tools/call',{name:'search_collection_series',arguments:{query:'museum',brand:'smiski',language:'en'}})).result;
 assert.equal(search.isError,false);assert.ok(search.structuredContent.series.some(s=>s.seriesId===museum.id&&s.source===museum.source&&s.checked===museum.checked));
 const owned=['Smiski Dali','Smiski Pearl Earring'];
 const check=(await rpc('tools/call',{name:'prepare_collection_checklist',arguments:{seriesId:museum.id,owned,wanted:[],language:'zh'}})).result;
 assert.equal(check.isError,false);const result=check.structuredContent;
 assert.deepEqual(result.owned,[...museum.names.filter(n=>owned.includes(n))]);
 assert.deepEqual(result.notMarkedOwned,museum.names.filter(n=>!owned.includes(n)));
 assert.deepEqual(result.wanted,[]);assert.deepEqual(result.unmatchedOwned,[]);assert.equal(result.checked,museum.checked);assert.equal(result.source,museum.source);assert.ok(result.markdown.includes(museum.source));
 const unknown=(await rpc('tools/call',{name:'prepare_collection_checklist',arguments:{seriesId:museum.id,owned:['Unknown secret figure'],wanted:[]}})).result;
 assert.deepEqual(unknown.structuredContent.unmatchedOwned,['Unknown secret figure']);
 assert.equal((await rpc('tools/call',{name:'prepare_collection_checklist',arguments:{seriesId:'missing-series',owned:[]}})).result.structuredContent.found,false);
 const resource=(await rpc('resources/read',{uri:'https://thedollscout.com/collector-assets/series-catalog.json'})).result;
 assert.deepEqual(JSON.parse(resource.contents[0].text),catalog);
});
test('array and inherited-property input attacks fail without executing a tool',async()=>{
 const valid={seriesId:'smiski-museum',owned:[]};
 for(const args of [{...valid,owned:'Smiski Dali'},{...valid,owned:[{}]},{...valid,owned:[null]},{...valid,owned:[['Smiski Dali']]},{...valid,owned:Array(101).fill('A')},{...valid,owned:['A'.repeat(121)]},{...valid,wanted:{0:'Smiski Dali'}},{...valid,privateFile:'private'},{...valid,toString:'private'},JSON.parse('{"seriesId":"smiski-museum","owned":[],"__proto__":{}}')]){
  const response=(await rpc('tools/call',{name:'prepare_collection_checklist',arguments:args})).result;
  assert.equal(response.isError,true);assert.equal(response.structuredContent,undefined);
 }
 for(const args of [{query:'museum',limit:0},{query:'museum',limit:11},{query:'museum',brand:'labubu'},{query:'museum',language:'xx'},{query:''}])assert.equal((await rpc('tools/call',{name:'search_collection_series',arguments:args})).result.isError,true);
});
