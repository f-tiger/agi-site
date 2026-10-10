import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Read-only release check: live requests never execute page scripts or send events.
const live=process.argv.includes('--live');
const base='https://baipiaoji.com';
const canonical=base+'/manju/video-fit';
const rules=JSON.parse(readFileSync(new URL('../data/video-platforms.json',import.meta.url),'utf8'));
const ids=['douyin','kuaishou','xiaohongshu','bilibili','weixin','toutiao'];
const decode=value=>String(value).replace(/&#(?:x([\da-f]+)|(\d+));/gi,(_,hex,decimal)=>String.fromCodePoint(parseInt(hex||decimal,hex?16:10))).replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([,key,double,single])=>[key.toLowerCase(),decode(double??single)]));
const visible=html=>decode(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const scripts=html=>[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map(([,tag,text])=>({attributes:attrs(tag),text}));
const links=html=>[...html.matchAll(/<a\b[^>]*>/gi)].map(([tag])=>attrs(tag).href).filter(Boolean);
const flattenSchema=value=>Array.isArray(value)?value.flatMap(flattenSchema):value&&typeof value==='object'?[value,...flattenSchema(value['@graph']||[])]:[];
const hasType=(entry,type)=>[entry['@type']].flat().includes(type);

async function get(path){
 if(!live)return {text:readFileSync(new URL('../dist/'+path,import.meta.url),'utf8'),headers:null};
 const url=new URL(path.replace(/index\.html$/,'').replace(/\.html$/,''),base+'/');
 url.searchParams.set('__probe','1');
 const response=await fetch(url,{headers:{'user-agent':'bpj-ci-selfcheck'},signal:AbortSignal.timeout(25000)});
 assert.equal(response.status,200,`Expected published resource: ${path}`);
 const destination=new URL(response.url);
 assert.equal(destination.origin,base,`Unexpected redirect origin: ${path}`);
 assert.equal(destination.pathname,url.pathname,`Unexpected redirect path: ${path}`);
 return {text:await response.text(),headers:response.headers};
}

const paths=['manju/video-fit.html','manju/video-fit.json','manju/video-fit.md','video-fit.js','video-fit.css','video-fit-core.mjs','sitemap.xml','search-index.json','llms.txt','manju/index.html'];
const resources=await Promise.allSettled(paths.map(get));
const failures=resources.flatMap((result,index)=>result.status==='rejected'?[new Error(`${paths[index]}: ${result.reason.message}`,{cause:result.reason})]:[]);
if(failures.length)throw new AggregateError(failures,'Video-fit resources are missing or unavailable');
const [page,json,markdown,client,css,core,sitemap,search,llms,home]=resources.map(result=>result.value);
const html=page.text,text=visible(html),pageScripts=scripts(html),pageLinks=links(html);

const canonicals=[...html.matchAll(/<link\b[^>]*>/gi)].map(([tag])=>attrs(tag)).filter(a=>a.rel==='canonical');
assert.equal(canonicals.length,1,'Exactly one canonical is required');
assert.equal(canonicals[0].href,canonical);
const title=visible(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
assert.match(title,/视频.*评估|评估.*视频/,'Title must describe the video assessment tool');
const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag])=>attrs(tag));
const descriptions=metas.filter(a=>a.name?.toLowerCase()==='description');
assert.equal(descriptions.length,1,'Exactly one description is required');
assert.match(descriptions[0].content,/视频/);
assert.match(descriptions[0].content,/评估|适配|测试/);
assert.ok(descriptions[0].content.length>=30,'Description must explain the useful scope');
const headings=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
assert.equal(headings.length,1,'Exactly one H1 is required');
assert.match(visible(headings[0][1]),/视频/);
for(const robots of metas.filter(a=>['robots','googlebot','bingbot'].includes(a.name?.toLowerCase())))assert.doesNotMatch(robots.content||'',/noindex|none/i,'Public tool must be indexable');
if(page.headers)assert.doesNotMatch(page.headers.get('x-robots-tag')||'',/noindex|none/i,'Public tool must not have a noindex header');

const embedded=pageScripts.filter(s=>s.attributes.id==='video-fit-rules');
assert.equal(embedded.length,1,'The page needs exactly one public rule dataset');
assert.equal(embedded[0].attributes.type,'application/json');
assert.deepEqual(JSON.parse(embedded[0].text),rules,'Published rule data differs from reviewed source');
const schemas=pageScripts.filter(s=>s.attributes.type==='application/ld+json').flatMap(s=>flattenSchema(JSON.parse(s.text)));
const applications=schemas.filter(s=>hasType(s,'WebApplication'));
assert.equal(applications.length,1,'Describe the real browser tool with WebApplication');
const application=applications[0];
assert.equal(application.url,canonical);
assert.equal(application.isAccessibleForFree,true);
assert.equal(Number(application.offers?.price),0);
assert.equal(application.offers?.priceCurrency,'CNY');
assert.equal(application.dateModified,rules.checkedAt,'Rule review date must not change on every build');
for(const type of ['VideoObject','AggregateRating'])assert.ok(!schemas.some(s=>hasType(s,type)),`Do not invent ${type} for this assessment tool`);
const faqs=schemas.filter(s=>hasType(s,'FAQPage'));
assert.equal(faqs.length,1,'One visible FAQ must have matching structured data');
assert.ok(Array.isArray(faqs[0].mainEntity)&&faqs[0].mainEntity.length>=3,'Cover scope, privacy and interpretation in FAQ');
for(const question of faqs[0].mainEntity){
 assert.equal(question['@type'],'Question');
 assert.equal(question.acceptedAnswer?.['@type'],'Answer');
 for(const part of [question.name,question.acceptedAnswer.text]){
  assert.ok(typeof part==='string'&&part.trim(),'FAQ questions and answers must be present');
  assert.ok(text.includes(visible(part)),`Structured FAQ must also be visible: ${part.slice(0,60)}`);
  assert.ok(markdown.text.includes(part),'Markdown must retain the same FAQ explanations');
 }
}

assert.deepEqual(rules.platforms.map(p=>p.id).sort(),[...ids].sort(),'Review exactly the six supported platforms');
for(const platform of rules.platforms){
 assert.ok(text.includes(platform.name),`Missing crawlable platform: ${platform.name}`);
 assert.ok(markdown.text.includes(platform.name),`Missing Markdown platform: ${platform.name}`);
 assert.ok(platform.sources.length>0&&platform.editorialRules.length>0,'Each platform needs evidence and separate editorial advice');
}
const sources=[rules.globalEvidence,...rules.platforms.flatMap(p=>p.sources)].filter(Boolean);
for(const source of sources){
 assert.equal(new URL(source.url).protocol,'https:','Public evidence must link to its HTTPS source');
 assert.match(source.checkedAt||rules.checkedAt,/^\d{4}-\d{2}-\d{2}$/);
 assert.ok(pageLinks.includes(source.url),`Missing crawlable official source: ${source.id}`);
 assert.ok(text.includes(source.title)&&text.includes(source.summary),`Missing source explanation: ${source.id}`);
 assert.ok(text.includes(source.checkedAt||rules.checkedAt),`Missing source review date: ${source.id}`);
 assert.ok(markdown.text.includes(source.url)&&markdown.text.includes(source.summary),`Missing Markdown evidence: ${source.id}`);
}
assert.match(text,/编辑建议/,'Distinguish editorial advice from official rules');
assert.match(text,/官方规则|公开规则/);
assert.match(text,/本机|当前浏览器/);
assert.match(text,/不上传/);
assert.match(text,/不识别画面|不自动理解视频|不会自动理解视频/);
assert.match(text,/不提供爆款概率|不预测爆款|不会给出爆款概率/);
assert.match(text,/视频号官方规则全文.*(?:无法读取|未读取)/,'Disclose the inaccessible WeChat rule text');
assert.match(text,/不是官方流量周期/,'Observation windows must not masquerade as platform rules');
assert.ok(pageLinks.includes('/manju/video-fit.json')&&pageLinks.includes('/manju/video-fit.md'),'Expose public machine-readable methods from the page');

// Mirrors contain reviewed rules/method only; private inputs and reports have no public slot.
const publicData=JSON.parse(json.text);
const {name,url,description,faq,...publicRules}=publicData;
assert.ok(typeof name==='string'&&name.includes('视频'));
assert.equal(url,canonical);
assert.ok(typeof description==='string'&&description.includes('不预测'));
assert.deepEqual(publicRules,rules,'Public JSON may contain reviewed rules, never runtime inputs or reports');
assert.deepEqual(faq,faqs[0].mainEntity.map(q=>({question:q.name,answer:q.acceptedAnswer.text})));
assert.ok(markdown.text.includes(canonical)&&markdown.text.includes(rules.checkedAt));
assert.match(markdown.text,/不上传视频/);
assert.match(markdown.text,/不自动理解视频内容|不识别画面/);
const initialReport=html.match(/<section\b(?=[^>]*\bid="vf-result")[^>]*>([\s\S]*?)<\/section>/i);
assert.ok(initialReport,'Interactive report region must exist');
assert.equal(visible(initialReport[1]),'','No private or fabricated report may be baked into public HTML');
for(const [,content] of html.matchAll(/<textarea\b[^>]*>([\s\S]*?)<\/textarea>/gi))assert.equal(content.trim(),'','Public form must not retain user text');
for(const [tag] of html.matchAll(/<input\b[^>]*>/gi)){
 const a=attrs(tag);
 if(['audience','hook','summary','title','current','baseline','baselineCount'].includes(a.name))assert.ok(!a.value,'Public form must not retain user inputs');
}

const schemaUrls=[...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([,loc])=>decode(loc));
assert.equal(schemaUrls.filter(u=>u===canonical).length,1,'Canonical tool route must appear once in the sitemap');
assert.ok(!schemaUrls.includes(canonical+'.json')&&!schemaUrls.includes(canonical+'.md'),'Public mirrors must not become competing sitemap pages');
const searchRows=JSON.parse(search.text);
assert.ok(Array.isArray(searchRows)&&searchRows.some(row=>row.u===canonical),'Site search must discover the canonical tool');
assert.ok(llms.text.includes(canonical),'llms.txt must link to the canonical tool');
assert.ok(llms.text.includes('/manju/video-fit.json')||llms.text.includes('/manju/video-fit.md'),'llms.txt must expose a public method mirror');
assert.ok(links(home.text).some(href=>new URL(href,base).href===canonical),'Video homepage must link to the tool');

const clientTags=pageScripts.filter(s=>s.attributes.src&&new URL(s.attributes.src,base).pathname==='/video-fit.js');
assert.equal(clientTags.length,1,'Load the interactive script once');
assert.equal(clientTags[0].attributes.type,'module');
assert.ok([...html.matchAll(/<link\b[^>]*>/gi)].map(([tag])=>attrs(tag)).some(a=>a.rel==='stylesheet'&&a.href&&new URL(a.href,base).pathname==='/video-fit.css'),'Load the tool stylesheet');
assert.match(client.text,/video-fit-core\.mjs/,'The UI must use the shared evaluation module');
assert.match(css.text,/\.vf-/,'Published stylesheet must contain tool styles');
assert.match(core.text,/\bevaluateVideo\b/);
assert.match(core.text,/\bcomparePerformance\b/);
for(const [resource,label] of [[client,'JavaScript'],[css,'CSS'],[core,'core module']]){
 assert.ok(resource.text.trim().length>100,`${label} must not be empty`);
 assert.doesNotMatch(resource.text,/^\s*(?:<!doctype html|<html\b)/i,`${label} must not be a fallback HTML page`);
 if(resource.headers)assert.doesNotMatch(resource.headers.get('content-type')||'',/text\/html/i,`${label} must have a non-HTML content type`);
}

console.log(`PASS video-fit ${live?'live':'local'}: canonical SEO, six-platform evidence, visible FAQ/schema agreement, public-only JSON/Markdown, discovery and three assets; read-only selfcheck, no analytics events.`);
