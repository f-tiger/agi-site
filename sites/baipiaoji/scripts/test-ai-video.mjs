import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadAiVideoCatalog} from '../lib/ai-video-catalog.mjs';
import {filterWorks,suggestWorks,relatedWorks,formatDuration,sourceGroups} from '../assets/ai-video-core.mjs';
import {buildAiVideo,aiVideoSearch} from './ai-video-pages.mjs';

const data=loadAiVideoCatalog(),works=data.works;
const root='https://baipiaoji.com/en/ai-video/';
const generated={};buildAiVideo({write:(path,body)=>generated[path]=body,pushPage:()=>{}});
const live=process.argv.includes('--live'),distCheck=!live&&!process.argv.includes('--unit');
const sha=await import('node:crypto').then(({createHash})=>value=>createHash('sha256').update(value).digest('hex'));
async function publishedResource(relative){
 if(!live)return fs.readFileSync(new URL('../dist/'+relative,import.meta.url),'utf8');
 const uri=new URL(relative==='en/ai-video/index.html'?'en/ai-video/':relative==='en/index.html'?'en/':relative,'https://baipiaoji.com/');uri.searchParams.set('__probe','1');
 const response=await fetch(uri,{headers:{'User-Agent':'BPJ Framepick release verification (__probe; read-only)'},signal:AbortSignal.timeout(25000)});
 assert.equal(response.status,200,`Live resource ${relative}: HTTP ${response.status}`);
 if(relative==='en/ai-video/index.html')assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag')||''),'Canonical page must be indexable');
 return response.text();
}
test('Source filtering includes shared recognitions and ranks only within that source',()=>{
 const reply=filterWorks(works,{source:'reply-2026',sort:'source-rank'});
 assert.equal(reply.length,7);
 assert.equal(reply[0].title,'A Face Only A Mother Could Love');
 assert.deepEqual(reply.slice(0,3).map(work=>work.sourceId==='reply-2026'?work.rank:work.additionalRecognitions.find(item=>item.sourceId==='reply-2026').rank),[1,2,3]);
 assert.equal(new Set(filterWorks(works).map(work=>work.id)).size,works.length);
 assert.equal(sourceGroups(works,data.sources).flatMap(group=>group.works).length,works.length);
});
test('Search handles common science fiction aliases without inventing matches',()=>{
 const fiction=filterWorks(works,{query:'science fiction'}).map(work=>work.id);
 assert.ok(fiction.length>0);
 assert.deepEqual(filterWorks(works,{query:'sci-fi'}).map(work=>work.id),fiction);
 assert.deepEqual(filterWorks(works,{query:'sci fi'}).map(work=>work.id),fiction);
 assert.equal(filterWorks(works,{query:'FP_PRIVATE_QUERY_2026_NO_MATCH'}).length,0);
 assert.equal(suggestWorks(works,'face')[0].title,'A Face Only A Mother Could Love');
 assert.equal(suggestWorks(works,'').length,0);
});
test('Unknown runtime remains unknown and is excluded from the short-runtime filter',()=>{
 const short=filterWorks(works,{shortOnly:true});assert.ok(short.length>0);
 assert.ok(short.every(work=>work.durationSeconds>0&&work.durationSeconds<=300));
 const sorted=filterWorks(works,{sort:'shortest'});assert.equal(sorted.at(-1).durationSeconds,null);
 assert.equal(formatDuration(null),'Runtime unverified');assert.equal(formatDuration(470),'7m 50s');
});
test('Recommendations have explicit metadata reasons and local saved filtering is exact',()=>{
 const related=relatedWorks(works,works[0]);assert.ok(related.length>0);
 assert.ok(related.every(item=>item.work.id!==works[0].id&&item.reasons.length>0));
 assert.deepEqual(filterWorks(works,{savedOnly:true,saved:[works[0].id]}),[works[0]]);
 assert.deepEqual(filterWorks(works,{savedOnly:true,saved:['unknown']}),[]);
});
test('Generated page is one source-backed English canonical with crawlable works and explicit limits',()=>{
 const output={},pages=[];buildAiVideo({write:(path,body)=>output[path]=body,pushPage:(url)=>pages.push(url)});
 const html=output['en/ai-video/index.html'];
 assert.deepEqual(pages,['https://baipiaoji.com/en/ai-video/']);
 assert.equal((html.match(/data-fp-work=/g)||[]).length,works.length);
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
 assert.match(html,/<html lang="en">/);assert.doesNotMatch(html,/hreflang="zh/);
 assert.match(html,/name="referrer" content="no-referrer"/);
 assert.match(html,/Source published: Unknown/);assert.match(html,/not a US or European audience popularity chart/);
 assert.doesNotMatch(html,/<iframe/);assert.doesNotMatch(html,/'@type':'VideoObject'|AggregateRating/);
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([^]*?)<\/script>/)[1]);
 assert.equal(schema.mainEntity.itemListOrder,'https://schema.org/ItemListUnordered');
 assert.equal(schema.mainEntity.numberOfItems,works.length);
 assert.ok(schema.mainEntity.itemListElement.every(work=>work['@type']==='CreativeWork'&&work.citation));
 assert.equal(JSON.parse(output['en/ai-video/catalog.json']).works.length,works.length);
 assert.match(output['en/ai-video/catalog.md'],/No media licence is granted/);
 const exported=JSON.parse(output['en/ai-video/catalog.json']);
 assert.equal(exported.guides.length,3);
 for(const guide of exported.guides){assert.ok(html.includes(`id="${guide.id}"`));assert.ok(html.includes(guide.intro));assert.ok(output['en/ai-video/catalog.md'].includes(guide.intro));for(const work of guide.works)assert.ok(works.some(item=>item.id===work.id));}
 for(const work of works.filter(item=>item.summaryKind==='source-note'))assert.ok(html.includes('<strong>Source note:</strong> '+work.summary.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')));
 assert.match(html,/property="og:image" content="https:\/\/baipiaoji\.com\/framepick-share\.png"/);assert.match(html,/name="twitter:card" content="summary_large_image"/);
 assert.equal(schema.publisher.name,'BPJ');assert.equal(schema.isPartOf.url,'https://baipiaoji.com/');assert.equal(schema.image,'https://baipiaoji.com/framepick-share.png');
 const share=output['framepick-share.png'];assert.equal(share.subarray(1,4).toString(),'PNG');assert.equal(share.readUInt32BE(16),1200);assert.equal(share.readUInt32BE(20),630);
 assert.ok((html.match(/loading="eager"/g)||[]).length<=3,'Only the three featured images load eagerly');
 assert.equal((html.match(/data-fp-work="[^"]+" hidden/g)||[]).length,0,'All catalogue entries are visible in SSR before progressive enhancement');
 assert.ok(aiVideoSearch().every(item=>item.q===item.q.toLowerCase()));
});

if(live||distCheck)test(`${live?'Live HTTP':'Final dist'} release contains the current catalogue, assets, GA4 and discovery links`,async()=>{
 const paths=['en/ai-video/index.html','en/ai-video/catalog.json','en/ai-video/catalog.md','ai-video.css','ai-video.js','ai-video-core.mjs','en/index.html','en/search-index.json','sitemap.xml','llms.txt'];
 const contents=await Promise.all(paths.map(publishedResource)),resources=Object.fromEntries(paths.map((path,index)=>[path,contents[index]]));
 let share;
 if(live){const response=await fetch('https://baipiaoji.com/framepick-share.png?__probe=1',{headers:{'User-Agent':'BPJ Framepick release verification (__probe; read-only)'},signal:AbortSignal.timeout(25000)});assert.equal(response.status,200);assert.match(response.headers.get('content-type')||'',/^image\/png(?:;|$)/i);share=Buffer.from(await response.arrayBuffer());}
 else share=fs.readFileSync(new URL('../dist/framepick-share.png',import.meta.url));
 assert.equal(share.subarray(1,4).toString(),'PNG');assert.equal(share.readUInt32BE(16),1200);assert.equal(share.readUInt32BE(20),630);assert.equal(sha(share),sha(generated['framepick-share.png']),'Current share image body');
 const html=resources['en/ai-video/index.html'];
 assert.match(html,/<html lang="en">/);assert.match(html,/<link rel="canonical" href="https:\/\/baipiaoji\.com\/en\/ai-video\/">/);
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);assert.doesNotMatch(html,/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
 assert.equal((html.match(/data-fp-work=/g)||[]).length,works.length);assert.doesNotMatch(html,/hreflang="zh/);
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([^]*?)<\/script>/)[1]);
 assert.equal(schema['@type'],'CollectionPage');assert.equal(schema.dateModified,data.updatedAt);assert.equal(schema.mainEntity.numberOfItems,works.length);
 const registry=JSON.parse(fs.readFileSync(new URL('../../../tools/fleet-analytics/registry.json',import.meta.url),'utf8'));
 assert.equal((html.match(/data-ga4-id=/g)||[]).length,1,'Exactly one installed analytics channel');
 assert.ok(html.includes(`data-ga4-id="${registry.bpj.id}"`));assert.ok(html.includes(`data-ga4-page="${root}"`));assert.match(html,/\/analytics-assets\/consent\.mjs\?v=[a-f0-9]+/);
 for(const file of ['ai-video.css','ai-video.js']){
  const version=new RegExp('/'+file.replace('.','\\.')+'\\?v=([a-f0-9]+)');assert.equal(html.match(version)?.[1],generated['en/ai-video/index.html'].match(version)?.[1],`Current ${file} version`);
 }
 for(const file of ['ai-video.css','ai-video.js','ai-video-core.mjs'])assert.equal(sha(resources[file]),sha(generated[file]),`Current ${file} body`);
 const catalogue=JSON.parse(resources['en/ai-video/catalog.json']);assert.equal(catalogue.updatedAt,data.updatedAt);assert.deepEqual(catalogue.sources,data.sources);assert.deepEqual(catalogue.works,works);
 assert.equal(resources['en/ai-video/catalog.md'],generated['en/ai-video/catalog.md'],'Current source-dated Markdown');
 assert.ok(resources['en/index.html'].includes('/en/ai-video/'));
 const search=JSON.parse(resources['en/search-index.json']);assert.ok(search.some(item=>item.u===root&&/framepick/i.test(item.n)));
 assert.ok(search.some(item=>item.u===root+'#work-'+works[0].id));
 assert.ok(resources['sitemap.xml'].includes('<loc>'+root+'</loc>'));assert.ok(resources['llms.txt'].includes(root));
 console.log(`${live?'LIVE':'DIST'} verified ${paths.length+1} public resources including the share image; metadata source ${data.updatedAt}; HTTP checks do not prove GA4 backend receipt, viewing or adoption.`);
});
