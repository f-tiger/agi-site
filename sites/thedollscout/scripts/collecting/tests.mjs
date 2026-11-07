import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isRetiredPath,RETIRED_PREFIXES} from '../../functions/retired-paths.mjs';
import {isHubPath} from '../../document-assets/hub-core.mjs';
import {buildExpansion} from './expansion.mjs';
import {buildSeries,seriesState} from './series-pages.mjs';
import {displayFitHTML,fitParagraphs} from './display-fit.mjs';
import {brands,locales,origin,updated,route,copy} from './content.mjs';
import {lessons} from './learning.mjs';
test('retired routes remain gone across old aliases, language prefixes and encoded paths',()=>{
 for(const prefix of RETIRED_PREFIXES)for(const locale of ['','/en','/de','/zh','/th'])for(const suffix of ['','/','.html','/archived-page'])assert.equal(isRetiredPath(locale+prefix+suffix),true);
 for(const p of ['/VENDORS/old','/%76endors/old','/de/%2576endors/old','//guides//old','/vendors.htm'])assert.equal(isRetiredPath(p),true,p);
 for(const p of ['/','/de/','/brands/jellycat','/mcp','/llms-full.txt','/collector-guide','/document-tools','/pdf-to-text','/workbench/collectorledger','/api/member','/guides-new'])assert.equal(isRetiredPath(p),false,p);
});
test('digital hub moves without dropping historical aggregate support',()=>{
 for(const p of ['/document-tools','/de/document-tools','/zh/document-tools','/','/de/'])assert.equal(isHubPath(p),true);
 for(const p of ['/brands/jellycat','/image-compressor','/document-tools?file=secret'])assert.equal(isHubPath(p),false);
});

test('German display reference keeps HTML, citations and AI mirrors on the German calculator',()=>{
 const pages=[],files=new Map();
 buildExpansion({brands,locales,origin,updated,route,copy,esc:s=>s,art:()=>'',
  emit:(lang,slug,title,intro,body,paragraphs,schema)=>pages.push({lang,slug,body,paragraphs,schema}),
  write:(file,text)=>files.set(file,text)});
 const guides=JSON.parse(files.get('collector-assets/learning-guides.json')).guides;
 for(const lang of Object.keys(locales))for(const lesson of lessons){
  const expected=lesson.slug==='collecting/display-checklist'
   ? [['TDS display calculation',origin+(lang==='de'?'/de':'')+'/display-calculator']]
   : lesson.sources;
  const page=pages.find(p=>p.lang===lang&&p.slug===lesson.slug);
  for(const [name,url] of expected){
   assert.ok(page.body.includes(`<a href="${url}">${name}</a>`),`${lang}/${lesson.slug}: visible source`);
   assert.ok(page.paragraphs.includes(`${name}: ${url}`),`${lang}/${lesson.slug}: text mirror`);
  }
  assert.deepEqual(page.schema[0].citation,expected.map(s=>s[1]));
  assert.deepEqual(guides.find(g=>g.language===lang&&g.url===origin+route(lang,lesson.slug)).sources,expected);
 }
});

test('every series buying step goes directly to its localized display guide in HTML and text',()=>{
 const pages=[];
 buildSeries({brands,locales,origin,route,esc:s=>s,write:()=>{},
  emit:(lang,slug,title,intro,body,paragraphs)=>pages.push({lang,slug,body,paragraphs})});
 assert.ok(seriesState.series.length>0);
 for(const lang of Object.keys(locales))for(const series of seriesState.series){
  const page=pages.find(p=>p.lang===lang&&p.slug==='series/'+series.id);
  assert.ok(page,lang+'/'+series.id);
  const destination=route(lang,'shop/display-cases');
  const link=page.body.match(new RegExp('<a class="button" href="'+destination+'">([^<]+)</a>'));
  assert.ok(link,lang+'/'+series.id+': direct localized guide');
  assert.ok(page.paragraphs.includes(link[1]+': '+origin+destination),lang+'/'+series.id+': same text destination and label');
  assert.doesNotMatch(page.body+page.paragraphs.join('\n'),/collector-guide#accessories|展示配件指南（英文）/);
 }
});

test('brand display tools route plush and figure tasks to the correct localized buying guide',()=>{
 for(const lang of Object.keys(locales))for(const brand of brands){
  const html=displayFitHTML(lang,brand),paragraphs=fitParagraphs(lang,brand);
  const next=html.match(/<aside class="related-planning">[\s\S]*?<\/aside>/)?.[0];
  assert.ok(next,lang+'/'+brand.id);
  const destination=route(lang,brand.id==='jellycat'?'shop/plush-display':'shop/display-cases');
  const links=[...next.matchAll(/<a class="button" href="([^"]+)">([^<]+)<\/a>/g)];
  assert.equal(links.length,1,lang+'/'+brand.id+': one task-specific next step');
  assert.equal(links[0][1],destination);
  assert.ok(paragraphs.includes(links[0][2]+': '+origin+destination),lang+'/'+brand.id+': matching text mirror');
  for(const copy of next.matchAll(/<(?:h3|p)>([^<]+)<\/(?:h3|p)>/g))assert.ok(paragraphs.includes(copy[1]));
  assert.doesNotMatch(next+paragraphs.join('\n'),/collector-guide#accessories|[?&]tag=|英文/);
 }
});
