import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {onRequest} from '../../functions/mcp.js';import {TOOLS,SERVER,RESOURCES,DEMO_INPUT} from '../../collector-assets/mcp-contract.mjs';
import {styleProbability} from '../../collector-assets/style-odds-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const env={ASSETS:{fetch:async u=>{try{return new Response(await fs.readFile(path.join(root,new URL(u).pathname)))}catch{return new Response('',{status:404})}}}};
async function rpc(method,params={},options={}){const r=await onRequest({env,request:new Request('https://thedollscout.com/mcp',{method:'POST',headers:{'content-type':'application/json',...options.headers},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})})});return r.json();}
test('MCP discovery and schema come from the same shipped contract',async()=>{assert.deepEqual((await rpc('initialize')).result.serverInfo,SERVER);assert.deepEqual((await rpc('tools/list')).result.tools,TOOLS);assert.deepEqual((await rpc('resources/list')).result.resources,RESOURCES);for(const uri of RESOURCES.map(r=>r.uri))assert.ok((await rpc('resources/read',{uri})).result.contents[0].text);assert.equal((await rpc('resources/read',{uri:'https://example.com/private'})).error.code,-32602);});
test('assistant display plan agrees with the actual browser calculator and visible demo',async()=>{const j=await rpc('tools/call',{name:'plan_display_fit',arguments:DEMO_INPUT});assert.equal(j.result.isError,false);const result=j.result.structuredContent;assert.equal(result.count,12);assert.equal(result.columns,4);assert.equal(result.rows,3);assert.equal(result.rotated,false);const nofit=await rpc('tools/call',{name:'plan_display_fit',arguments:{...DEMO_INPUT,height:10}});assert.equal(nofit.result.structuredContent.count,0);const rotation=await rpc('tools/call',{name:'plan_display_fit',arguments:{width:10,depth:6,height:5,itemWidth:6,itemDepth:5,itemHeight:5,gap:0,rotate:true}});assert.equal(rotation.result.structuredContent.count,2);assert.equal(rotation.result.structuredContent.rotated,true);});
test('invalid and private parameters never become plausible calculator output',async()=>{for(const args of [{...DEMO_INPUT,width:'40'},{...DEMO_INPUT,rotate:'false'},{...DEMO_INPUT,gap:-1},{...DEMO_INPUT,privateFile:'secret'},{width:4},[]]){const j=await rpc('tools/call',{name:'plan_display_fit',arguments:args});assert.equal(j.result.isError,true);assert.equal(j.result.structuredContent,undefined);}assert.equal((await rpc('tools/call',{name:'secret_pull_probability',arguments:{oddsN:72,boxes:1.5}})).result.isError,true);assert.equal((await rpc('tools/call',{name:'read_private_collection'})).error.code,-32602);});
test('brand evidence, language fallback and browser-only boundary are accurate',async()=>{const g=(await rpc('tools/call',{name:'get_collecting_guide',arguments:{brand:'jellycat',language:'zh'}})).result.structuredContent;assert.equal(g.language,'zh');assert.match(g.officialSource,/jellycat.com/);const tools=(await rpc('tools/call',{name:'find_collector_tools',arguments:{task:'collection',language:'zh'}})).result.structuredContent.tools;assert.ok(tools.length);for(const t of tools){assert.equal(t.execution,'browser-only');assert.equal(t.languageFallback,true);assert.equal(t.mcpTool,undefined);}const odds=(await rpc('tools/call',{name:'secret_pull_probability',arguments:{oddsN:72,boxes:12}})).result.structuredContent;assert.equal(odds.probabilityPercent,'15.5%');});
test('malformed messages, oversized payloads and unexpected browser origins are rejected',async()=>{for(const [body,status]of [['{',200],[JSON.stringify([]),200],['x'.repeat(16385),413]]){const r=await onRequest({env,request:new Request('https://thedollscout.com/mcp',{method:'POST',body})});assert.equal(r.status,status);if(status===200)assert.ok((await r.json()).error);}const r=await onRequest({env,request:new Request('https://thedollscout.com/mcp',{method:'POST',headers:{origin:'https://untrusted.example'},body:'{}'})});assert.equal(r.status,403);});
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
