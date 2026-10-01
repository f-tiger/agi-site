import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {onRequestPost} from '../functions/api/hit.js';
import {SKILL_FILES} from './skill-discovery.mjs';
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const valid={p:'/distribution/work-plan/calculate/external/edited',e:'distribution',l:'en',r:'https://publisher.example/private?email=must-not-store'};
async function hit(body,headers={}){const rows=[];await onRequestPost({request:new Request('https://baipiaoji.com/api/hit',{method:'POST',headers,body:JSON.stringify(body)}),env:{HITS:{prepare:()=>({bind:(...args)=>({run:async()=>rows.push(args)})})}}});return rows;}
const rows=await hit(valid);ok(rows.length===1&&rows[0][4]==='publisher.example','valid action stores only domain');
for(const body of [{...valid,p:'/distribution/work-plan/calculate/external/404'},{...valid,l:'private'},{...valid,p:valid.p+'?email=x'}])ok((await hit(body)).length===0,'reject arbitrary input data');
for(const headers of [{'dnt':'1'},{'sec-gpc':'1'},{referer:'https://baipiaoji.com/embed/work-plan?__probe=1'},{'user-agent':'Playwright'},{'user-agent':'bpj-ci-selftest'}])ok((await hit(valid,headers)).length===0,'server privacy/QA gate');
const source=readFileSync(new URL('../assets/work-plan-distribution.js',import.meta.url),'utf8');
for(const setting of ['dnt','gpc','webdriver','probe','local','normal']){
 const sends=[];const window={};window.self=window;window.top=window;
 const navigator={doNotTrack:setting==='dnt'?'1':null,globalPrivacyControl:setting==='gpc',webdriver:setting==='webdriver'};
 const context={window,navigator,location:{hostname:setting==='local'?'localhost':'baipiaoji.com',search:setting==='probe'?'?__probe=1':''},document:{referrer:'',documentElement:{lang:'en'},getElementById:()=>null,querySelectorAll:()=>[]},URL,URLSearchParams,fetch:async(...args)=>sends.push(args)};
 vm.runInNewContext(source,context);window.bpjDistribution(valid.p);ok(sends.length===(setting==='normal'?1:0),'client gate '+setting);
}
if(process.argv.includes('--dist')){
 for(const folder of ['agent-skills','skills']){
  const base=new URL('../dist/.well-known/'+folder+'/',import.meta.url),index=JSON.parse(readFileSync(new URL('index.json',base),'utf8'));
  ok(index.skills.length===1&&index.skills[0].name==='bpj-codex-efficiency','single product discovery');
  assert.deepEqual(index.skills[0].files,Object.keys(SKILL_FILES));checks++;
  for(const [file,digest] of Object.entries(SKILL_FILES))ok(createHash('sha256').update(readFileSync(new URL('bpj-codex-efficiency/'+file,base))).digest('hex')===digest,'release bytes '+file);
 }
 for(const prefix of ['','en/']){
  const html=readFileSync(new URL('../dist/'+prefix+'embed/work-plan.html',import.meta.url),'utf8');
  ok(html.includes('content="noindex,follow"')&&!html.includes('gtag')&&!html.includes('bpj.js'),'isolated noindex widget');
  const index=readFileSync(new URL('../dist/sitemap.xml',import.meta.url),'utf8');ok(!index.includes('/embed/'),'no duplicate search pages');
 }
}
console.log('PASS '+checks+' distribution privacy, action and source integrity checks.');
