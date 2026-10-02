import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {edition,origin,brands,locales,route} from './content.mjs';
import {isRetiredPath} from '../../functions/retired-paths.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),args=process.argv.slice(2),live=args.includes('--live'),out=args.includes('--out')?path.resolve(args[args.indexOf('--out')+1]):root;
const file=p=>path.join(out,p.replace(/^\//,'')+(p.endsWith('/')?'index.html':path.extname(p)?'':'.html'));
async function read(p){if(!live)return fs.readFileSync(file(p),'utf8');let last;for(let i=0;i<4;i++){try{const r=await fetch(origin+p,{headers:{'x-probe':'collector-release','user-agent':'tds-release-probe'},signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,p);return await r.text();}catch(e){last=e;if(i<3)await new Promise(r=>setTimeout(r,2500));}}throw last;}
const manifest=JSON.parse(await read('/collector-assets/manifest.json'));assert.equal(manifest.edition,edition);assert.equal(manifest.records.length,Object.keys(locales).length*(brands.length+1));
const sitemap=await read('/sitemap.xml');
for(const record of manifest.records){const p=new URL(record.url).pathname,html=await read(p);assert.ok(html.includes(`data-collector-edition="${edition}"`),p);assert.equal((html.match(/<h1[ >]/g)||[]).length,1,p);assert.ok(html.includes(`rel="canonical" href="${record.url}"`),p);assert.ok(!/noindex|tds-archive-note|TDS now focuses|rating.*adult|age-gate|ds_age_ok|yourdoll/i.test(html),p);for(const [lang,l]of Object.entries(locales))assert.ok(html.includes(`hreflang="${l.tag}" href="${origin+route(lang,record.slug)}"`),p);assert.equal(sitemap.split('<loc>'+record.url+'</loc>').length-1,1,p);assert.ok((await read(new URL(record.textUrl).pathname)).includes(record.url));
 const ld=JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)[1]);assert.ok(ld['@graph'].some(x=>x.name==='The Doll Scout'));
 if(!live)for(const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)){const u=new URL(m[1],origin);assert.ok(fs.existsSync(file(u.pathname)),p+' broken link '+u.pathname);}
 if(!record.slug){assert.ok(html.includes('collector-world.webp'));assert.ok(html.includes('fetchpriority="high"'));assert.ok(html.includes('id="tools"'));assert.ok(html.includes('https://baipiaoji.com'));}
}
for(const url of [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]))assert.equal(isRetiredPath(new URL(url).pathname),false,url);
for(const file of ['/llms.txt','/llms-full.txt']){const text=await read(file);assert.ok(text.startsWith('# The Doll Scout'));for(const b of brands)assert.ok(text.includes('/brands/'+b.id));assert.ok(text.includes('/document-assets/llms.txt'));}
const retired=['/vendors/yourdoll','/de/vendors/yourdoll','/VENDORS/yourdoll','/%76endors/yourdoll','/scam-check','/guides/importing'];
if(live)for(const p of retired){const r=await fetch(origin+p,{headers:{'x-probe':'collector-release','user-agent':'tds-release-probe'},redirect:'manual',signal:AbortSignal.timeout(20000)});assert.ok([404,410].includes(r.status),p+' must be gone, got '+r.status);}
if(!live){const forbidden=/rating["']?\s*(?:content=)?["']?adult|ds_age_ok|yourdoll|(?:sex[- ]doll|realdoll|wm-doll)/i;function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['scripts','content','functions','node_modules','.agents','.git'].includes(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(/\.(html|xml|txt|json|svg)$/i.test(e.name))assert.ok(!forbidden.test(fs.readFileSync(f,'utf8')),'Retired content in '+f);}}walk(out);}
console.log(`Collector release verified: ${manifest.records.length} localized pages, canonical links, brand sources, text mirrors and retired-content rules (${live?'production':'build'}).`);
