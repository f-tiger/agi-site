import test from 'node:test';
import assert from 'node:assert/strict';
import {initSwapKit} from '../../collector-assets/swap-kit-ui.mjs';
import {swapKitHTML,swapParagraphs} from './swap-kit.mjs';
import {route} from './content.mjs';
import {businessEvent} from '../../../../tools/fleet-analytics/business.mjs';
import {onRequestPost} from '../../functions/api/ev.js';

function fixture(){const nodes=new Map();for(const name of ['labels','status','print','share'])nodes.set(name,{hidden:true,textContent:'',addEventListener(_,fn){this.click=fn;}});nodes.get('labels').textContent=JSON.stringify({url:'https://thedollscout.com/collecting/trading-meetup-checklist',copied:'copied',failed:'failed',printing:'requested'});return {nodes,root:{querySelector:s=>nodes.get(s.match(/swap-(\w+)/)[1])}};}
test('Only successful canonical-link copy counts; print is explicitly a request, never completion',async()=>{
 const {nodes,root}=fixture(),calls=[],copied=[];let printed=0;
 initSwapKit(root,n=>calls.push(n),{clipboard:{writeText:async s=>copied.push(s)},print:()=>printed++});
 assert.equal(nodes.get('share').hidden,false);await nodes.get('share').click();
 assert.deepEqual(copied,['https://thedollscout.com/collecting/trading-meetup-checklist']);
 assert.equal(nodes.get('status').textContent,'copied');nodes.get('print').click();
 assert.equal(printed,1);assert.deepEqual(calls,['collector_swap_link_copy','collector_swap_print_request']);assert.equal(nodes.get('status').textContent,'requested');
 const f=fixture(),failed=[];initSwapKit(f.root,n=>failed.push(n),{clipboard:{writeText:async()=>{throw Error('denied');}}});await f.nodes.get('share').click();assert.deepEqual(failed,[]);assert.equal(f.nodes.get('status').textContent,'failed');
});
test('Localized worksheet has blank rows, canonical destinations and no collection input',()=>{
 for(const lang of ['en','de','zh']){const html=swapKitHTML(lang,route,s=>s),text=swapParagraphs(lang,route).join('\n');assert.equal((html.match(/<tbody>/g)||[]).length,2);assert.equal((html.match(/<td>/g)||[]).length,18);assert.doesNotMatch(html,/<(?:input|textarea|form)\b|utm_|localStorage|official partner/i);assert.ok(html.includes(route(lang,'series/smiski-museum')));assert.ok(text.includes(route(lang,'series/sonny-angel-snack-series')));assert.ok(html.includes('https://thedollscout.com'+route(lang,'collecting/trading-meetup-checklist')));}
});
test('GA4 and D1 reject other routes, arbitrary payloads and QA for swap actions',async()=>{
 for(const name of ['collector_swap_link_copy','collector_swap_print_request']){
  for(const prefix of ['/','/de/','/zh/']){const p=prefix+'collecting/trading-meetup-checklist';assert.deepEqual(businessEvent('thedollscout.com',p,{name}),{name,tool_id:'trading-meetup-checklist'});assert.equal(businessEvent('thedollscout.com',p,{name,input:'PRIVATE'}),null);}
  assert.equal(businessEvent('thedollscout.com','/collection-tracker',{name}),null);
  for(const [p,extra,qa,expected]of [['/collecting/trading-meetup-checklist',{},false,1],['/de/collecting/trading-meetup-checklist',{},false,1],['/members',{},false,0],['/collecting/trading-meetup-checklist?ci=1',{},false,0],['/collecting/trading-meetup-checklist',{input:'PRIVATE'},false,0],['/collecting/trading-meetup-checklist',{},true,0]]){
   const rows=[],pending=[],request=new Request('https://thedollscout.com/api/ev'+(qa?'?ci=1':''),{method:'POST',headers:{origin:'https://thedollscout.com','user-agent':'Mozilla/5.0'},body:JSON.stringify({p,e:name,r:'',...extra})});
   await onRequestPost({request,env:{HITS:{prepare(){return {bind(...values){return {run:async()=>rows.push(values)}}}}}},waitUntil:p=>pending.push(p)});await Promise.all(pending);assert.equal(rows.length,expected,p);}
 }
});
