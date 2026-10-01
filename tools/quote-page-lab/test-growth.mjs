import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {quoteEventPath,parseQuoteEvent,toolRecommendation} from './growth.mjs';
import {onRequestPost} from '../../sites/baipiaoji/functions/api/hit.js';
import {readQuoteSignals,QUOTE_SIGNAL_SQL} from '../../sites/baipiaoji/lib/quote-signals.js';
import {HITS_INDEXES} from '../../sites/baipiaoji/lib/hits-schema.js';
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE hits(d TEXT,path TEXT,lang TEXT,country TEXT,ref TEXT,ev TEXT)');
for(const index of HITS_INDEXES)sql.exec(index);
const db={prepare:query=>({bind:(...params)=>({all:async()=>({results:sql.prepare(query).all(...params)}),run:async()=>sql.prepare(query).run(...params)})})};
async function hit(path,lang='en'){return onRequestPost({env:{HITS:db},request:new Request('https://baipiaoji.com/api/hit',{method:'POST',body:JSON.stringify({p:path,l:lang,e:'quote'})})});}
assert.deepEqual(Object.keys(toolRecommendation('en')).sort(),['text','title','url']);
assert.equal(toolRecommendation('evil?client=secret').url,'https://baipiaoji.com/studio/quote-builder?source=share');
assert.equal(quoteEventPath('own_edit','youtube'),'/quote-builder/own_edit/youtube');
for(const bad of ['/quote-builder/own_edit/name@example.com','/quote-builder/client-name','/quote-builder/link_copied/share?email=a','/quote-builder/own_edit/direct/extra']){assert.equal(parseQuoteEvent(bad),null);await hit(bad);}
assert.equal(sql.prepare('SELECT count(*) n FROM hits').get().n,0);
for(const p of ['/quote-builder/entry_open/video-tool','/quote-builder/demo_preview/video-tool','/quote-builder/demo_start/video-tool','/quote-builder/builder_open/video-guide','/quote-builder/own_edit/video-guide','/quote-builder/link_copied/video-guide','/quote-builder/client_open/client','/quote-builder/summary_copied/client','/quote-builder/builder_open'])await hit(p);
await hit('/quote-builder/builder_open/direct','ci');
const today=new Date().toISOString().slice(0,10);
sql.prepare('INSERT INTO hits VALUES (?,?,?,?,?,?)').run(today,'/quote-builder/own_edit/direct','ci','','','quote');
sql.prepare('INSERT INTO hits VALUES (?,?,?,?,?,?)').run('2020-01-01','/quote-builder/own_edit/direct','en','','','quote');
const data=await readQuoteSignals(db,today);
assert.equal(data.ok,true);assert.equal(data.actions.builder_open,2);assert.equal(data.actions.own_edit,1);
assert.equal(data.actions.summary_copied,1);assert.equal(data.actions.file_generated,0);
assert.equal(data.actions.entry_open,1);assert.equal(data.actions.demo_start,1);assert.deepEqual(data.entry_sources,{'video-tool':1});
assert.deepEqual(data.builder_entries,{'video-guide':1,legacy:1});
const failed=await readQuoteSignals({prepare:()=>{throw Error('offline')}},today);assert.equal(failed.entry_sources,null);assert.equal(failed.actions,null);assert.equal(failed.ok,false);
const plan=sql.prepare('EXPLAIN QUERY PLAN '+QUOTE_SIGNAL_SQL).all(today).map(x=>x.detail).join(' ');assert(plan.includes('hits_events'),'bounded event index required');
assert(!/unique users|verified clients/.test(data.definitions.unit));
if(process.argv.includes('--dist')){
 const tools=JSON.parse(readFileSync(new URL('../../sites/baipiaoji/data/tools.json',import.meta.url),'utf8'));
 const read=p=>readFileSync(new URL('../../sites/baipiaoji/dist/'+p,import.meta.url),'utf8');
 for(const pre of ['','en/']){
  const page=read(pre+'studio/video-quote.html'),url='https://baipiaoji.com/'+pre+'studio/video-quote';
  assert(page.includes(`rel="canonical" href="${url}"`));
  assert(page.includes('demo=1')&&page.includes('source=video-guide'));
  assert(page.includes('og:image')&&page.includes('quote-social-'+(pre?'en':'zh')+'.png'));
  for(const file of [pre+'video/index.html',pre+'discover/index.html',pre+'search-index.json','llms.txt','sitemap.xml'])assert(read(file).includes(url),file);
  for(const tool of tools){const html=read(pre+'tools/'+tool.slug+'.html');assert.equal(html.includes('data-quote-entry'),tool.category==='video',tool.slug+' relevance');if(tool.category==='video')assert(html.includes('source=video-tool'));}
  assert(read(pre+'c/video.html').includes('source=video-category'));
  const png=readFileSync(new URL('../../sites/baipiaoji/dist/studio-assets/quote-social-'+(pre?'en':'zh')+'.png',import.meta.url));assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 }
}
console.log('Quote growth: fixed event paths, missing≠zero, legacy/CI boundaries, indexed SQL and bilingual discovery pass.');
