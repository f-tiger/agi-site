import test from 'node:test';
import assert from 'node:assert/strict';

test('read-only deployment smoke verifies assets and metadata without business or aggregate requests',async t=>{
 const previous=process.env.FLEET_READ_ONLY_PROBE;process.env.FLEET_READ_ONLY_PROBE='1';
 t.after(()=>{if(previous===undefined)delete process.env.FLEET_READ_ONLY_PROBE;else process.env.FLEET_READ_ONLY_PROBE=previous;});
 const asset='Public fixture asset data for local tests.',bytes=new TextEncoder().encode(asset),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
 const paths=[];
 t.mock.method(globalThis,'fetch',async(url,options={})=>{
  const parsed=new URL(url);paths.push(parsed.pathname);assert.equal(options.method||'GET','GET');
  assert.ok(!['/api/event','/api/pulse','/api/sec-concept'].includes(parsed.pathname),'read-only smoke must defer aggregate reads and skip business tests');
  if(parsed.pathname==='/api/config')return Response.json({site:parsed.hostname.split('.')[0],sales_enabled:false,measurement:true});
  if(parsed.pathname==='/missing-page')return new Response('Not found',{status:404});
  if(parsed.pathname.endsWith('/SHA256SUMS'))return new Response(hash+'  archive.tar.gz');
  return new Response(asset,{headers:{'Content-Type':parsed.pathname.endsWith('.wasm')?'application/wasm':'application/octet-stream'}});
 });
 await import('../scripts/smoke.mjs');assert.equal(paths.filter(path=>path==='/api/config').length,4);assert.ok(paths.includes('/vendor/sql-wasm.wasm'));
});
