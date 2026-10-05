import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../startup-mcp/server.json',import.meta.url),'utf8'));
async function call(method,params={}){const response=await fetch(manifest.remotes[0].url+'?__probe=1',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','User-Agent':'bpj-ci-selfcheck'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(25000)});return {status:response.status,body:await response.json()};}
const init=await call('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'bpj-install-check',version:'1'}});assert.equal(init.status,200);assert.equal(init.body.result.serverInfo.version,manifest.version);
const list=await call('tools/list');assert.equal(list.status,200);assert.equal(list.body.result.tools.length,5);
const preview=await call('tools/call',{name:'startup_preview',arguments:{language:'en'}});assert.equal(preview.status,200);assert(preview.body.result.structuredContent.data.reviewedCount>0);
const paid=await call('tools/call',{name:'get_startup_radar',arguments:{}});assert.equal(paid.status,401);assert.equal(paid.body.error,'startup_key_required');
console.log('PASS startup MCP live: initialize, tools/list, real free preview, missing-key rejection; no paid account or payment was created.');
