import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GITHUB_TOOLS} from './github-tools-pages.mjs';
import {matchesTool,githubSearchURL,GITHUB_TOOL_IDS,MODES,KINDS,TOPICS,PLATFORMS} from '../lib/github-tools.mjs';
import {onRequestPost} from '../functions/api/hit.js';
import {searchResults} from '../lib/search-results.mjs';
import {githubToolSearch} from './github-tools-pages.mjs';
const items=GITHUB_TOOLS.tools,byId=id=>items.find(t=>t.id===id);
assert.deepEqual(items.map(t=>t.id),GITHUB_TOOL_IDS);
assert.equal(new Set(items.map(t=>t.id)).size,items.length);
assert.equal(new Set(items.map(t=>t.repo.toLowerCase())).size,items.length,'no duplicate forks or aliases');
assert.ok(items.length>=80&&items.filter(t=>t.ai).length>=68,'owner-requested AI expansion');
for(const t of items){
 assert.ok(t.github.repo===t.repo&&Number.isSafeInteger(t.github.stars)&&t.github.stars>=0&&!t.github.archived);
 for(const value of [t.url,...t.sources,t.github.source])assert.equal(new URL(value).protocol,'https:');
 assert.ok(MODES[t.mode]&&KINDS[t.kind]);assert.ok(t.topics.length&&t.topics.every(k=>TOPICS[k]));assert.ok(t.platforms.every(p=>PLATFORMS[p]));
 if(t.kind==='model')assert.equal(t.mode,'code','model weights must not be presented as ready-to-use websites');
 for(const lang of ['zh','en']){for(const field of ['task','description','cost','caution','requirements'])assert.ok(t[field][lang]);assert.equal(t.steps[lang].length,3);}
}
for(const [q,id]of [['本地聊天','jan'],['文档问答','anythingllm'],['AI编程','cline'],['语音转文字','whisper'],['Qwen','qwen'],['Perplexica','vane'],['lobechat','lobehub'],['网页抓取','firecrawl']])assert.ok(matchesTool(byId(id),q),q);
assert.ok(matchesTool(byId('qwen'),'',{topic:'ai',kind:'model'}));
assert.ok(!matchesTool(byId('jan'),'',{kind:'model'}));
assert.ok(!matchesTool(byId('qwen'),'',{mode:'web'}));
assert.ok(!matchesTool(byId('excalidraw'),'',{topic:'ai'}));
assert.ok(matchesTool(byId('excalidraw'),'',{topic:'everyday',kind:'app'}));
assert.ok(byId('f5-tts').cost.en.includes('CC-BY-NC'),'weight license must not be conflated with MIT code');
assert.ok(items.every(t=>!['FlowiseAI/Flowise','RooCodeInc/Roo-Code','microsoft/autogen'].includes(t.repo)));
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
 assert.ok(html.includes('id="github-topic"')&&html.includes('id="github-kind"')&&html.includes('id="github-more"'));
 assert.ok(data.tools.every(t=>typeof t.requirements==='string'&&t.kind&&t.topics.length));
 assert.ok(html.includes('rel="canonical" href="https://baipiaoji.com/'+prefix+'github-tools/"'));
 assert.ok(read('sitemap.xml').includes('https://baipiaoji.com/'+prefix+'github-tools/</loc>'));
 assert.ok(read(prefix+'index.html').includes('data-home-block="github-tools"'));
 assert.ok(JSON.parse(read(prefix+'search-index.json')).some(t=>t.u.endsWith('/github-tools/#localsend')));
 assert.ok(read('llms.txt').includes('/github-tools.json'));
 assert.ok(html.includes('data-gh-event="vendor"'));
}
console.log('PASS GitHub catalogue: task search, setup/device boundaries, source metadata, safe handoff, privacy/QA filtering and published discovery.');
