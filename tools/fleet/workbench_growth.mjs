/** Daily read-only workbench audit. No payments, posting, or ranking claims. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {products,sites} from '../revenue-studio/catalog.mjs';
import {languages,siteLanguages,route} from '../revenue-studio/i18n.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export function inventory(){return Object.keys(sites).flatMap(site=>siteLanguages[site].flatMap(lang=>[null,...products.filter(p=>p.site===site)].map(p=>({site,lang,id:p?.id||'hub',form:!!p?.fields.length,url:sites[site].origin+route(site,lang,p?.id||'')}))));}
function tags(html,name){return [...html.matchAll(new RegExp('<'+name+'\\b[^>]*>','gi'))].map(m=>Object.fromEntries([...m[0].matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(a=>[a[1].toLowerCase(),a[2]])));}
export function inspectPage(item,html,headers={}){
 const errors=[],check=(ok,message)=>{if(!ok)errors.push(message);},links=tags(html,'link');
 check(links.filter(x=>x.rel==='canonical'&&x.href===item.url).length===1,'canonical');
 check(new RegExp('<html\\b[^>]*lang=["\']'+languages[item.lang].tag+'["\']','i').test(html),'language');
 check(html.includes(`data-product="${item.id==='hub'?'':item.id}"`),'product');
 check(!/noindex|none/i.test(headers['x-robots-tag']||'')&&!tags(html,'meta').some(x=>/robots|googlebot|bingbot/i.test(x.name||'')&&/noindex|none/i.test(x.content||'')),'indexable');
 for(const lang of siteLanguages[item.site])check(links.some(x=>x.rel==='alternate'&&x.hreflang===languages[lang].tag&&x.href===sites[item.site].origin+route(item.site,lang,item.id==='hub'?'':item.id)),'hreflang:'+lang);
 check(links.some(x=>x.hreflang==='x-default'),'x-default');
 const schemas=[...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
 try{check(schemas.length>0&&schemas.every(m=>!!JSON.parse(m[1])),'structured_data');}catch{errors.push('structured_data');}
 if(item.id!=='hub'){check(html.includes('id="method"'),'static_method');check(html.includes('id="sharing"'),'citation_entry');if(item.form)check(html.includes('id="create-widget"'),'embed_entry');}
 return errors;
}
export async function audit({get,now=new Date().toISOString(),queue=null}={}){
 const rows=inventory(),resources=new Map(),siteChecks=[];
 const read=url=>{if(!resources.has(url))resources.set(url,get(url));return resources.get(url);};
 // One serial lane per owned domain, at most four requests in flight.
 await Promise.all(Object.keys(sites).map(async site=>{
  const siteCheck={site,errors:[],discovery_pages:0};siteChecks.push(siteCheck);
  try{
   const manifestResponse=await read(sites[site].origin+'/workbench-assets/manifest.json');
   if(manifestResponse.status!==200)throw Error('manifest');
   const manifest=JSON.parse(manifestResponse.text);
   if(manifest.site!==site||!Array.isArray(manifest.wired))throw Error('manifest');
   for(const relative of manifest.wired){
    if(typeof relative!=='string'||relative.startsWith('/')||relative.includes('..')||!relative.endsWith('.html'))throw Error('manifest');
    let sourceUrl=sites[site].origin+'/'+relative,source=await read(sourceUrl);
    for(let hop=0;hop<3&&[301,302,307,308].includes(source.status);hop++){
     sourceUrl=new URL(source.headers?.location||'',sourceUrl).href;
     if(new URL(sourceUrl).origin!==sites[site].origin)throw Error('external_discovery_redirect');
     source=await read(sourceUrl);
    }
    if(source.status!==200||!source.text.includes('workbench-discovery'))siteCheck.errors.push('discovery:'+relative);
    siteCheck.discovery_pages++;
   }
   for(const asset of ['app.mjs','core.mjs',...siteLanguages[site].map(l=>'locales/'+l+'.json')]){
    const a=await read(sites[site].origin+'/workbench-assets/'+asset);
    if(a.status!==200||a.text.length<100||/^\s*<!doctype html/i.test(a.text))siteCheck.errors.push('runtime:'+asset);
   }
  }catch{siteCheck.errors.push('discovery_or_runtime_unavailable');}
  for(const row of rows.filter(x=>x.site===site)){
   row.errors=[];
   try{
    const r=await read(row.url);row.status=r.status;
    if(r.status!==200)throw Error('http_'+r.status);
    if(r.url&&r.url!==row.url)row.errors.push('redirected_canonical');
    row.errors.push(...inspectPage(row,r.text,r.headers));
    const sitemap=await read(sites[site].origin+'/sitemap.xml');
    if(sitemap.status!==200||!sitemap.text.includes('<loc>'+row.url+'</loc>'))row.errors.push('sitemap');
    if(row.id!=='hub'){
     const md=await read(row.url.replace(/\.html$/,'')+'.md');
     if(md.status!==200||!md.text.includes('Canonical: '+row.url))row.errors.push('text_mirror');
     if(row.form){const w=await read(sites[site].origin+'/workbench-assets/widgets/'+row.lang+'/'+row.id+'.txt');if(w.status!==200||!w.text.includes('<!doctype html>')||!w.text.includes(row.id))row.errors.push('standalone_widget');}
    }
   }catch(e){row.errors.push(e.message==='timeout'?'timeout':e.message.startsWith('http_')?e.message:'request_failed');}
   row.ok=row.errors.length===0;
  }
 }));
 let checkout={ready:null,status:'unavailable'};
 try{const r=await read('https://baipiaoji.com/api/ads?doctor=1'),d=JSON.parse(r.text);checkout={ready:r.status===200&&d.ok===true&&d.selling===true&&d.mode==='live'&&d.rails?.wallet===true&&d.web3?.watch_healthy===true,status:r.status===200?'observed':'unavailable',real_payment_verified:null};}catch{}
 const queueFresh=queue?.as_of===now.slice(0,10),campaigns=queueFresh?queue.campaigns||[]:[];
 return {as_of:now,kind:'owned_page_health_not_market_validation',ok:rows.every(r=>r.ok)&&siteChecks.every(s=>!s.errors.length),site_checks:siteChecks,counts:{products:products.length,pages:rows.length,passed:rows.filter(r=>r.ok).length,failed:rows.filter(r=>!r.ok).length,widget_versions:rows.filter(r=>r.form).length},pages:rows,checkout,marketing:{queue_fresh:queueFresh,draft_ready:queueFresh?campaigns.filter(c=>c.state==='draft_ready').length:null,blocked:queueFresh?campaigns.filter(c=>c.state==='blocked').map(c=>({id:c.id,reasons:c.blockers})):null,sends:0},outcomes:{indexed_pages:null,third_party_backlinks:null,ai_citations:null,qualified_visits:null,own_task_completions:null,paid_buyers:null,net_revenue:null},next_actions:[...siteChecks.filter(s=>s.errors.length).map(s=>({priority:'repair',url:sites[s.site].origin,reason:s.errors.join(', ')})),...rows.filter(r=>!r.ok).map(r=>({priority:'repair',url:r.url,reason:r.errors.join(', ')})),...(!checkout.ready?[{priority:'checkout',reason:'Verify BPJ live Web3 readiness before promoting paid placements.'}]:[]),...(!queueFresh?[{priority:'measurement',reason:'Marketing queue is missing or stale; do not reuse old readiness.'}]:[]),{priority:'evidence',reason:'Import dated Search Console/Bing, referral and settled-payment evidence before claiming acquisition or revenue.'}],notes:['A passing page is not an indexed page, backlink, user, sale or membership.','Checkout readiness does not verify a real transfer. No transfer is initiated.','Only owned public URLs are fetched. No form inputs, wallet addresses or raw doctor response are stored.']};
}
export function markdown(r){return ['# 工具增长运行报告','',`检查时间：${r.as_of}`,`整体结果：${r.ok?'通过':'需处理'}；入口/运行文件异常站点 ${r.site_checks.filter(s=>s.errors.length).length}。`,`工具 ${r.counts.products}；语言页面 ${r.counts.pages}；通过 ${r.counts.passed}；异常 ${r.counts.failed}。`,`独立嵌入版本 ${r.counts.widget_versions}；BPJ Web3 就绪：${r.checkout.ready===null?'未知':r.checkout.ready?'是':'否'}。`,`营销草稿就绪：${r.marketing.draft_ready??'未知'}；本流程外发：0。`,'','健康检查通过不等于收录、真实访客或付费。新增收录、第三方外链、AI 引用、工具完成与净营收均待真实数据确认。','','| 站点 | 通过 / 页面 |','|---|---|',...Object.keys(sites).map(s=>`| ${s} | ${r.pages.filter(x=>x.site===s&&x.ok).length} / ${r.pages.filter(x=>x.site===s).length} |`),'','## 待处理','',...r.next_actions.map(x=>`- ${x.priority}: ${x.url||''} ${x.reason}`),''].join('\n');}
async function get(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch(url,{signal:controller.signal,redirect:'manual',headers:{'User-Agent':'agi-site-workbench-healthbot/1.0'}});const text=await r.text();return {status:r.status,url:r.url,text,headers:{'x-robots-tag':r.headers.get('x-robots-tag')||'',location:r.headers.get('location')||''}};}catch(e){throw Error(e.name==='AbortError'?'timeout':'fetch_failed');}finally{clearTimeout(timer);}
}
async function main(){
 const args=process.argv.slice(2),out=args.includes('--out')?path.resolve(args[args.indexOf('--out')+1]):path.join(root,'data/autopilot/workbench'),check=args.includes('--check');
 let queue=null;try{queue=JSON.parse(fs.readFileSync(path.join(root,'data/autopilot/marketing/queue.json'),'utf8'));}catch{}
 const report=await audit({get,queue});
 if(!check){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'latest.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(out,'latest.md'),markdown(report));let history=[];try{history=JSON.parse(fs.readFileSync(path.join(out,'history.json'),'utf8'));}catch{}history=history.filter(x=>x.as_of.slice(0,10)!==report.as_of.slice(0,10));history.push({as_of:report.as_of,...report.counts,checkout_ready:report.checkout.ready});fs.writeFileSync(path.join(out,'history.json'),JSON.stringify(history.slice(-30),null,2)+'\n');}
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n'+markdown(report));
 console.log(JSON.stringify({as_of:report.as_of,...report.counts,ok:report.ok,site_errors:report.site_checks.filter(s=>s.errors.length),checkout_ready:report.checkout.ready,queue_fresh:report.marketing.queue_fresh}));
 if(!report.ok)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
