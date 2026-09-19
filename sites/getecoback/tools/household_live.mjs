import assert from 'node:assert/strict';
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
const report={checked:new Date().toISOString(),note:'Filtered events are not verified people; site definitions differ.',sites:[]};
for(const host of ['agiscorecard.com','baipiaoji.com','getecoback.com','thedollscout.com']){
 try{const endpoint=host==='baipiaoji.com'?'/api/reach?days=28':'/api/pulse';const d=await(await get('https://'+host+endpoint)).json();report.sites.push({host,ok:d.ok,days:d.days??d.window_days,human_pv:d.human_pv,humans_referred:d.humans_referred,ai_ref:d.ai_ref});}catch(e){report.sites.push({host,error:String(e)});}
}
try{const d=await(await get(origin+'/api/trend')).json();report.eco={events:d.events,pages:d.pages,note:'7-day and previous-7-day bins include endpoint date boundaries; UA human/legacy filter. No confirmed conversions.'};}catch(e){report.eco={error:String(e)};}
console.log('HOUSEHOLD_BASELINE '+JSON.stringify(report));
