import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sites,hubHost} from '../public/catalog.mjs';
import {csvExamples,csvRows,publicMetadata} from '../public/experience.mjs';
import {run} from '../public/engine.mjs';
import worker from '../worker.mjs';
const env={ASSETS:{fetch:async request=>{
 try{return new Response(await readFile('dist'+new URL(request.url).pathname));}
 catch{return new Response('Missing',{status:404});}
}}};
const get=(host,path)=>worker.fetch(new Request('https://'+host+path),env);
for(const site of sites)test(site.id+': downloadable preparation inputs reproduce the real engine result',async()=>{
 const input=structuredClone(site.sample),templates=csvExamples(site.id);
 for(const item of templates){
  const response=await get(site.host,item.path);
  assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Type'),/text\/csv/);
  assert.match(response.headers.get('Content-Disposition'),/^attachment;/);
  assert.equal(response.headers.get('X-Robots-Tag'),'noindex');
  input[item.group]=csvRows(await response.text(),site.sample[item.group][0]);
  assert.deepEqual(input[item.group],site.sample[item.group]);
  assert.equal((await get(hubHost,item.path)).status,404);
 }
 assert.deepEqual(run(site.id,input),run(site.id,site.sample));
 for(const page of ['guide.html','examples.html']){
  const html=await(await get(site.host,'/'+page)).text();
  assert.ok(html.includes('id="prepare-records"'));
  assert.ok(html.includes('href="/#editor-details"'));
  for(const item of templates)assert.ok(html.includes('href="'+item.path+'"'));
  if(!templates.length)assert.match(html,/individual settings/);
 }
 assert.equal(publicMetadata(site.id).csvTemplates.length,templates.length);
 assert.equal((await get(site.host,'/examples/unknown-template.csv')).status,404);
 assert.equal((await get(site.host,'/examples/'+site.id+'/../private-template.csv')).status,404);
});
