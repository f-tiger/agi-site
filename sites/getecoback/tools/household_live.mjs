import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const origin='https://getecoback.com';
async function get(url){const r=await fetch(url,{headers:{'User-Agent':'getecoback-ci household-release'},signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,url);return r;}
const sitemap=await(await get(origin+'/sitemap.xml')).text();
for(const slug of ['wohnkosten-werkstatt','waeschetrockner-oder-luftentfeuchter','strommess-protokoll','geraete-austausch-rechner']){
 const url=origin+'/'+slug+'.html',r=await get(url),html=await r.text();assert.equal(r.url,url);assert.ok(html.includes('rel="canonical" href="'+url+'"'));assert.ok(sitemap.includes(url));assert.ok(html.includes('household.css'));assert.ok(html.includes('EB_TRACK'));assert.ok(!html.includes('<!--EB_USSWITCH-->'),'Explicit marketplace choice must not be auto-rewritten');
 if(slug==='waeschetrockner-oder-luftentfeuchter'){assert.ok(html.includes('amazon.com/s?k=dehumidifier&amp;tag=ecoback0d-20'));assert.ok(html.includes('amazon.de/s?k=Luftentfeuchter+Hygrostat&amp;tag=getecoback-21'));}assert.ok(!r.headers.get('x-robots-tag')?.includes('noindex'));console.log('PASS live household '+slug);
}
for(const name of ['household.css','household.mjs','household-math.mjs'])await get(origin+'/assets/'+name);
await get(origin+'/downloads/haushalt-messprotokoll.csv');
// Read-only aggregates, no raw search terms, referrers or subscriber records.
// 2026-09-26 D1 读预算:此前每次 eco 部署都现打 bpj /api/reach(≈150k 行扫描)与 agi /api/pulse(≈90k 行)
// 只为抄四个数字;09-25 全账号 D1 读被打满时它也在分子里。跨站的 ok/days/human_pv/humans_referred/ai_ref
// 现在改读仓里 heartbeat 每日写的 data/fleet-ai-referrals.json(同一批字段,同一口径),行上带快照日期;
// 只有 eco 自己的 /api/pulse 与 /api/trend 现查。输出形状不变。
const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..','..');
let snap;try{snap=JSON.parse(readFileSync(path.join(REPO,'data','fleet-ai-referrals.json'),'utf8'));}catch(e){snap={error:String(e)};}
const SITE_OF={'agiscorecard.com':'agiscorecard','baipiaoji.com':'baipiaoji','thedollscout.com':'thedollscout'};
const report={checked:new Date().toISOString(),note:'Filtered events are not verified people; site definitions differ. Cross-site rows are the fleet heartbeat snapshot (data/fleet-ai-referrals.json), not live reads; their date is snapshot_generated.',sites:[]};
for(const host of ['agiscorecard.com','baipiaoji.com','getecoback.com','thedollscout.com']){
 if(host==='getecoback.com'){
  try{const d=await(await get(origin+'/api/pulse')).json();report.sites.push({host,ok:d.ok,days:d.days??d.window_days,human_pv:d.human_pv,humans_referred:d.humans_referred,ai_ref:d.ai_ref});}catch(e){report.sites.push({host,error:String(e)});}
  continue;
 }
 const site=SITE_OF[host],row=(snap.sites||[]).find(s=>s.site===site);
 if(!row){const why=snap.error||(snap.errors||[]).find(e=>String(e).startsWith(site+':'))||'absent from snapshot';report.sites.push({host,error:'snapshot data/fleet-ai-referrals.json: '+why,snapshot_generated:snap.generated});continue;}
 // bpj 的 reach 只给 humans_referred(有来源的真人),其余站给 human_pv —— 与改造前现查时的字段一致。
 report.sites.push({host,ok:true,days:snap.window_days,human_pv:host==='baipiaoji.com'?undefined:row.human_pv,humans_referred:host==='baipiaoji.com'?row.human_pv:undefined,ai_ref:host==='baipiaoji.com'?undefined:row.ai_ref,snapshot_generated:snap.generated});
}
try{const d=await(await get(origin+'/api/trend')).json();report.eco={events:d.events,pages:d.pages,note:'7-day and previous-7-day bins include endpoint date boundaries; UA human/legacy filter. No confirmed conversions.'};}catch(e){report.eco={error:String(e)};}
console.log('HOUSEHOLD_BASELINE '+JSON.stringify(report));
