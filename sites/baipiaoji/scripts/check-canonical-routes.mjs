import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {canonicalUrls} from './canonical-urls.mjs';
assert.equal(canonicalUrls('https://baipiaoji.com/en/index.html https://baipiaoji.com/tools/grok.html?x=1#cost https://other.example/x.html'), 'https://baipiaoji.com/en/ https://baipiaoji.com/tools/grok?x=1#cost https://other.example/x.html');
const files=[];function walk(dir){for(const x of readdirSync(dir,{withFileTypes:true})){const p=join(dir,x.name);x.isDirectory()?walk(p):files.push(p);}}walk('dist');
let checked=0;
for(const file of files.filter(p=>p.endsWith('.html'))){
 const text=readFileSync(file,'utf8'),match=text.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
 if(!match)continue;
 const url=new URL(match[1]);assert.equal(url.hostname,'baipiaoji.com',file);
 assert.ok(!url.pathname.endsWith('.html'),file+' canonical points at a redirect');
 const path=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname+'.html';
 assert.equal('dist'+path,file,file+' has a mismatched canonical');checked++;
 for(const m of text.matchAll(/<link[^>]+hreflang="[^"]+"[^>]+href="([^"]+)"/g))assert.ok(!new URL(m[1]).pathname.endsWith('.html'),file+' hreflang redirect');
}
const sitemap=readFileSync('dist/sitemap.xml','utf8');
for(const [,loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)){
 const p=new URL(loc).pathname;assert.ok(!p.endsWith('.html'),loc);
 assert.ok(existsSync('dist'+(p.endsWith('/')?p+'index.html':p+'.html')),loc+' missing page');
}
assert.ok(checked>1000,'Unexpectedly incomplete build');console.log(`Canonical routes verified: ${checked} pages; sitemap targets exist and use public URLs.`);
