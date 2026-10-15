// Execute the shipped client modules with a minimal DOM and closed-network fixtures.
// This complements, but does not replace, test-attribution-browser.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {buildMembers} from './build.mjs';
import {buildStartupMcpPages} from '../../sites/baipiaoji/scripts/startup-mcp-pages.mjs';
import {messages} from './messages.mjs';
import {memberContext,portalURL} from '../revenue-studio/member-copy.mjs';
import {sites} from '../revenue-studio/catalog.mjs';
const source='bpj-startup-research',tmp=fs.mkdtempSync(path.join(os.tmpdir(),'member-attribution-ui-'));
const app=fs.readFileSync(new URL('./app.mjs',import.meta.url),'utf8'),contextCode=fs.readFileSync(new URL('./context.mjs',import.meta.url),'utf8');
for(const site of Object.keys(sites))buildMembers({site,out:path.join(tmp,site)});
function element(){return {value:'',textContent:'',checked:false,disabled:false,hidden:false,className:'',append(){},replaceChildren(){},setAttribute(){},scrollIntoView(){}};}
let scenarios=0;
async function check(site,query,expected,{account=false,lang='en'}={}){
 const elements=new Map(),links=['zh','en'].map(lang=>({getAttribute:()=>lang,href:''})),checkout=[];
 const document={body:{dataset:{language:lang,memberSite:site}},hidden:false,getElementById(id){if(id==='startup-mcp')return null;if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,querySelectorAll:()=>links};
 const location=new URL(sites[site].origin+'/members'+query),products=JSON.parse(fs.readFileSync(path.join(tmp,site,'member-assets/products.json'),'utf8'));
 const fetch=async(url,options)=>{
  if(url.startsWith('/member-assets/products.json'))return Response.json(products);
  assert.ok(['/api/member','/api/account-member'].includes(url),'unexpected request');
  if(!options?.body)return Response.json({ok:true,ready:true});
  const body=JSON.parse(options.body);
  if(body.action==='status')return Response.json({ok:true,exists:true,active:false,key_backed_up:true,user:{id:'fixture-account',username:'fixture'}});
  if(body.action==='orders')return Response.json({ok:true,orders:[]});
  assert.equal(body.action,'checkout');checkout.push({url,body});return Response.json({ok:true,order:{id:'fixture-order',state:'pending',payment:{amount:'9.000001',address:'fixture',expires:1}}});
 };
 const sandbox=vm.createContext({document,location,URL,URLSearchParams,Response,fetch,crypto,AbortSignal,TextEncoder,Uint8Array,window:{opener:null},sessionStorage:{getItem(){return '';},setItem(){},removeItem(){}},setInterval(){},setTimeout(){},confirm(){throw Error('unexpected confirmation');}});
 const mod=new vm.SourceTextModule(app,{context:sandbox});
 await mod.link(specifier=>{assert.match(specifier,/messages\.mjs/);return new vm.SyntheticModule(['messages'],function(){this.setExport('messages',messages);},{context:sandbox});});await mod.evaluate();
 const ui=new vm.SourceTextModule(contextCode,{context:sandbox});await ui.link(specifier=>{assert.match(specifier,/member-copy\.mjs/);return new vm.SyntheticModule(['memberContext','portalURL'],function(){this.setExport('memberContext',memberContext);this.setExport('portalURL',portalURL);},{context:sandbox});});await ui.evaluate();
 if(account)await document.getElementById('account-use').onclick();
 else{document.getElementById('key').value='1'.repeat(64);await document.getElementById('login').onclick();}
 document.getElementById('key-saved').checked=true;document.getElementById('consent').checked=true;await document.getElementById('checkout').onclick();
 assert.equal(checkout.length,1);assert.equal(checkout[0].body.source,expected);assert.equal(checkout[0].url,account?'/api/account-member':'/api/member');
 assert.deepEqual(Object.keys(checkout[0].body).sort(),account?['accept_terms','account_id','action','key_saved','nonce','source']:['accept_terms','action','key_saved','nonce','source']);
 for(const a of links){const u=new URL(a.href);assert.equal(u.origin,location.origin);assert.equal(u.searchParams.get('source'),site==='bpj'&&new URLSearchParams(location.search).get('source')===source?source:null);if(query.includes('__ci'))assert.equal(u.searchParams.get('__ci'),'1');if(site==='bpj'&&query.includes('source='+source+'#startup-mcp'))assert.equal(u.hash,'#startup-mcp');}
 scenarios++;
}
try{
 for(const lang of ['zh','en']){
  let html='';const BASE=sites.bpj.origin+(lang==='zh'?'':'/en');buildStartupMcpPages({BASE,zh:lang==='zh',esc:String,write(){},render(_r,_t,_d,body){html=body;}});
  const href=html.match(/href="([^"]+)" data-solo-event="mcp-setup"/)[1];assert.equal(href,BASE+'/members?source='+source+'#startup-mcp');
  const u=new URL(href);await check('bpj',u.search+u.hash,source,{lang});
  const memberFile=path.join(tmp,'bpj',lang==='zh'?'members.html':'en/members.html'),memberHtml=fs.readFileSync(memberFile,'utf8');
  assert.doesNotMatch(memberHtml,/googletagmanager|gtag\(|analytics\.js/);assert.match(memberHtml,/app\.mjs\?v=startup-source2/);assert.match(memberHtml,/context\.mjs\?v=bpj-source2/);
 }
 await check('bpj','?source='+source+'#startup-mcp',source,{account:true});
 await check('bpj','?__ci=1&source='+source+'#startup-mcp',source);
 for(const tool of ['launchdesk','bpj-video-variants'])await check('bpj','?tool='+tool+'&source='+source,tool);
 await check('bpj','?tool=billlens&source='+source,source);
 await check('bpj','?tool=launchdesk&source=unknown','launchdesk');
 for(const query of ['','?source=unknown','?source=BPJ-STARTUP-RESEARCH','?source=%20'+source,'?tool='+source])await check('bpj',query,'');
 for(const site of ['agi','eco','tds'])await check(site,'?source='+source,'');
 assert.ok(!JSON.parse(fs.readFileSync(path.join(tmp,'bpj/member-assets/products.json'),'utf8')).some(p=>p.id===source));
 console.log(`${scenarios} executed-client attribution fixtures passed; bilingual generated CTA, auth modes, language links, privacy and site isolation. Browser rendering is checked separately.`);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
