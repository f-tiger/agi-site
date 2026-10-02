import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GITHUB_TOOLS} from './github-tools-pages.mjs';
import {matchesTool,githubSearchURL,GITHUB_TOOL_IDS} from '../lib/github-tools.mjs';
import {onRequestPost} from '../functions/api/hit.js';
import {searchResults} from '../lib/search-results.mjs';
import {githubToolSearch} from './github-tools-pages.mjs';
const items=GITHUB_TOOLS.tools,byId=id=>items.find(t=>t.id===id);
assert.deepEqual(items.map(t=>t.id),GITHUB_TOOL_IDS);
for(const t of items){
 assert.ok(t.github.repo===t.repo&&Number.isSafeInteger(t.github.stars)&&t.github.stars>=0&&!t.github.archived);
 for(const value of [t.url,...t.sources,t.github.source])assert.equal(new URL(value).protocol,'https:');
 for(const lang of ['zh','en']){for(const field of ['task','description','cost','caution'])assert.ok(t[field][lang]);assert.equal(t.steps[lang].length,3);}
}
for(const [q,id]of [['我想压缩视频','handbrake'],['手机电脑互传','localsend'],['compress image','squoosh'],['流程图','drawio'],['password manager','keepassxc'],['obsproject/obs-studio','obs']])assert.ok(matchesTool(byId(id),q),q);
assert.ok(!matchesTool(byId('sharex'),'',{platform:'macos'}));
assert.ok(!matchesTool(byId('immich'),'',{mode:'web'}));
assert.ok(items.every(t=>!matchesTool(t,'unfindableuniquetask12345')));
for(const base of ['https://baipiaoji.com','https://baipiaoji.com/en']){
 const results=searchResults(githubToolSearch(base,true),'localsend');
 assert.equal(results[0].u,base+'/github-tools/#localsend','global search must land on the matched project');
 assert.ok(searchResults(githubToolSearch(base,true),'画图').length>1,'distinct tool anchors remain distinct results');
}
const unsafe='javascript:alert(1) <img src=x onerror=alert(1)>';
const handoff=new URL(githubSearchURL(unsafe));assert.equal(handoff.origin,'https://github.com');assert.equal(handoff.searchParams.get('q'),unsafe);
async function hit(p,headers={},extra={}){const rows=[];await onRequestPost({request:new Request('https://baipiaoji.com/api/hit',{method:'POST',headers,body:JSON.stringify({p,e:'github_tools',l:'zh',...extra})}),env:{HITS:{prepare:()=>({bind:(...v)=>({run:async()=>rows.push(v)})})}}});return rows;}
assert.equal((await hit('/github-tools/open/localsend')).length,1);
assert.equal((await hit('/github-tools/search-hit/catalog',{}, {r:'https://private.example/search?q=private'}))[0][4],'');
for(const p of ['/github-tools/open/unknown','/github-tools/view/localsend','/github-tools/search-hit/email','/github-tools/open/localsend?private=secret'])assert.equal((await hit(p)).length,0,p);
for(const headers of [{dnt:'1'},{'sec-gpc':'1'},{referer:'https://baipiaoji.com/github-tools/?__probe=1'},{'user-agent':'Playwright'},{'user-agent':'curl/8'}])assert.equal((await hit('/github-tools/open/localsend',headers)).length,0);
if(process.argv.includes('--dist'))for(const prefix of ['','en/']){
 const read=p=>readFileSync(new URL('../dist/'+p,import.meta.url),'utf8'),html=read(prefix+'github-tools/index.html'),data=JSON.parse(read(prefix+'github-tools.json'));
 assert.equal((html.match(/data-tool-id=/g)||[]).length,items.length);
 assert.deepEqual(data.tools.map(t=>t.id),GITHUB_TOOL_IDS);
 assert.ok(html.includes('rel="canonical" href="https://baipiaoji.com/'+prefix+'github-tools/"'));
 assert.ok(read('sitemap.xml').includes('https://baipiaoji.com/'+prefix+'github-tools/</loc>'));
 assert.ok(read(prefix+'index.html').includes('data-home-block="github-tools"'));
 assert.ok(JSON.parse(read(prefix+'search-index.json')).some(t=>t.u.endsWith('/github-tools/#localsend')));
 assert.ok(read('llms.txt').includes('/github-tools.json'));
 assert.ok(html.includes('data-gh-event="vendor"'));
}
console.log('PASS GitHub catalogue: task search, setup/device boundaries, source metadata, safe handoff, privacy/QA filtering and published discovery.');
