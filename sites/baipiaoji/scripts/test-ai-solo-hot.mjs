import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clean,publicURL,parseHN,parsePH,collectHot,HISTORY_DAYS} from './ai-solo-hot.mjs';
import {buildHotPages} from './ai-solo-hot-pages.mjs';
const now='2026-10-05T12:00:00.000Z';
const hit=(id,points=10,comments=3,date='2026-10-04T10:00:00Z')=>({objectID:String(id),title:'Show HN: AI photo app',url:'https://example.com/app?utm_source=hn',created_at:date,points,num_comments:comments});
const entry=(id,title='Skin diary AI',published='2026-10-04T10:00:00Z',url='https://www.producthunt.com/products/app-'+id)=>`<entry><id>tag:www.producthunt.com,2005:Post/${id}</id><published>${published}</published><title>${title}</title><link rel="alternate" href="${url}"/><content type="html">&lt;p&gt;A personal journal&lt;/p&gt;&lt;p&gt;&lt;a href=&quot;https://example.com&quot;&gt;More&lt;/a&gt;&lt;/p&gt;</content></entry>`;
const feed=(...entries)=>'<feed xmlns="http://www.w3.org/2005/Atom">'+entries.join('')+'</feed>';
const response=(body,status=200)=>new Response(body,{status});
const mocks=({hits=[hit(1)],xml=feed(entry(1)),failHN=false,failPH=false}={})=>async(url,options)=>{
 assert.equal(options.redirect,'error');assert(options.signal instanceof AbortSignal);
 if(url.startsWith('https://hn.algolia.com/api/v1/search?'))return failHN?response('error',503):response(JSON.stringify({hits,nbHits:950}));
 assert.equal(url,'https://www.producthunt.com/feed');return failPH?response('error',429):response(xml);
};

test('source text and project URLs cannot introduce executable HTML or unsafe links',()=>{
 assert.equal(clean('&lt;script&gt;alert(1)&lt;/script&gt;Hello &amp; goodbye'),'Hello & goodbye');
 assert.equal(clean('<![CDATA[<b>Photo</b> &#x1f4f8;]]>'),'Photo 📸');
 assert.equal(clean('x'.repeat(500)).length,180);
 for(const u of ['javascript:alert(1)','data:text/html,x','http://127.0.0.1/a','http://2130706433','http://172.20.0.1/','http://192.168.2.1','http://user:pass@example.com','http://office.local'])assert.equal(publicURL(u),null,u);
 assert.equal(publicURL('https://example.com/app?utm_source=x&id=5#hi'),'https://example.com/app?id=5');
});
test('HN window, valid metrics, deduplication and rank order retain the source scale',()=>{
 const result=parseHN({hits:[hit(1,5),hit(2,20,2),hit(3,20,8),hit(2,999),hit(4,100,1,'2026-09-28T11:59:59Z'),hit(5,100,1,'2026-10-06T00:00:00Z'),hit(6,null),hit(7,-1),hit(8,'50'),hit('bad'),{...hit(9),url:'javascript:alert(1)'}]},now);
 assert.deepEqual(result.map(x=>[x.id,x.rank,x.points]),[['hn-3',1,20],['hn-2',2,20],['hn-9',3,10],['hn-1',4,5]]);
 assert.equal(result[2].url,null);assert(result.every(x=>x.aiSignal&&x.consumerSignal&&x.reviewStatus==='unreviewed'&&x.teamScope==='unknown'));
 assert.equal(parseHN({hits:Array.from({length:120},(_,i)=>hit(i+1))},now).length,100);
 assert.throws(()=>parseHN({},now),/invalid-json-shape/);
});
test('Product Hunt is a dated launch feed, with no invented votes or ranks',()=>{
 const xml=feed(entry(1),entry(1),entry(2,'Another','2026-10-05T01:00:00Z'),entry(3,'Old','2026-09-01T00:00:00Z'),entry(4,'Bad','2026-10-04T00:00:00Z','javascript:alert(1)'),entry(5,'Wrong host','2026-10-04T00:00:00Z','https://evil.example/'));
 const result=parsePH(xml,now);assert.deepEqual(result.map(x=>x.id),['ph-2','ph-1']);
 assert(result.every(x=>x.points===null&&x.comments===null&&x.rank===null));
 assert.equal(result[1].summary,'A personal journal');assert(result[1].consumerSignal);
 assert.throws(()=>parsePH('<html>blocked</html>',now),/invalid-feed/);
});
test('first sample and same-day rerun establish one baseline without fabricated growth',async()=>{
 const first=await collectHot({now,fetchImpl:mocks()});
 assert.equal(first.history.length,2);assert(first.sources.every(s=>s.status==='ok'&&s.observedAt===now));
 assert(first.sources.flatMap(s=>s.items).every(x=>x.comparisonDate===null&&x.pointsChange===null&&x.rankChange===null));
 const second=await collectHot({previous:first,now:'2026-10-05T13:00:00Z',fetchImpl:mocks({hits:[hit(1,15)]})});
 assert.equal(second.history.length,2);assert.equal(second.sources[0].items[0].pointsChange,null);
 assert.equal(second.history.find(x=>x.source==='hn').items[0].points,15);
 assert(first.sources[0].limited);assert.equal(first.sources[0].available,950);
});
test('later sampling days compare with actual previous-day observations and allow negative changes',async()=>{
 const first=await collectHot({now:'2026-10-04T12:00:00Z',fetchImpl:mocks({hits:[hit(1,20),hit(2,10)]})});
 const next=await collectHot({previous:first,now,fetchImpl:mocks({hits:[hit(1,18),hit(2,30),hit(3,25)]})});
 const byId=new Map(next.sources[0].items.map(x=>[x.id,x]));
 assert.equal(byId.get('hn-1').comparisonDate,'2026-10-04');assert.equal(byId.get('hn-1').pointsChange,-2);assert.equal(byId.get('hn-1').rankChange,-2);
 assert.equal(byId.get('hn-2').rankChange,1);assert.equal(byId.get('hn-3').seenBefore,false);assert.equal(byId.get('hn-3').pointsChange,null);
 assert.equal(next.sources[1].items[0].seenBefore,true);assert.equal(next.sources[1].items[0].rankChange,null);
});
test('partial failures retain last-good content and observation dates without false history',async()=>{
 const first=await collectHot({now:'2026-10-04T12:00:00Z',fetchImpl:mocks()});
 const snapshot=JSON.stringify(first);
 const next=await collectHot({previous:first,now,fetchImpl:mocks({failHN:true})});
 assert.equal(JSON.stringify(first),snapshot,'Do not mutate prior state');
 assert.equal(next.sources[0].status,'error');assert.equal(next.sources[0].reason,'HTTP-503');assert.equal(next.sources[0].observedAt,first.sources[0].observedAt);assert.deepEqual(next.sources[0].items,first.sources[0].items);assert.equal(next.sources[0].lastAttemptAt,now);
 assert.equal(next.sources[1].status,'ok');assert.equal(next.history.filter(x=>x.day==='2026-10-05').length,1);
 const sameDay=await collectHot({previous:next,now:'2026-10-05T13:00:00Z',fetchImpl:mocks({failHN:true,failPH:true})});
 assert.deepEqual(sameDay.history,next.history,'Keep earlier same-day success through later outage');
 const empty=await collectHot({now,fetchImpl:mocks({failHN:true,failPH:true})});assert(empty.sources.every(s=>s.observedAt===null&&s.items.length===0));
});
test('the rolling history retains at most 14 calendar days and never rewrites case data',async()=>{
 const casesFile=new URL('../data/ai-solo-cases.json',import.meta.url),before=readFileSync(casesFile,'utf8');
 let previous={};
 for(let i=0;i<20;i++){const date=new Date(Date.parse(now)+i*86400000).toISOString();previous=await collectHot({previous,now:date,fetchImpl:mocks({hits:[hit(1,10+i,3,date)],xml:feed(entry(1,'Skin diary AI',date))})});}
 assert.equal(previous.history.length,HISTORY_DAYS*2);assert.equal(previous.history[0].day,'2026-10-11');assert.equal(previous.history.at(-1).day,'2026-10-24');assert.equal(readFileSync(casesFile,'utf8'),before);
});
test('malformed, empty, oversized and rejected requests cannot erase good data or leak error secrets',async()=>{
 const first=await collectHot({now,fetchImpl:mocks()});
 for(const fetchImpl of [async()=>response('<html>bad</html>'),mocks({hits:[],xml:feed()}),async()=>response('x'.repeat(512*1024+1)),async()=>{throw Error('secret-token-123');},async()=>new Response('x',{headers:{'content-length':String(512*1024+1)}})]){
  const next=await collectHot({previous:first,now:'2026-10-06T12:00:00Z',fetchImpl});
  assert(next.sources.every(s=>s.status==='error'&&s.observedAt===now&&s.items.length===1));assert(!JSON.stringify(next).includes('secret-token'));
 }
});
test('scheduler persists monitor snapshots before building without adding a cron',()=>{
 const yml=readFileSync(new URL('../../../.github/workflows/deploy-baipiaoji.yml',import.meta.url),'utf8');
 assert(yml.includes("if: github.event_name != 'push'\n        run: node scripts/ai-solo-hot.mjs"));
 assert(yml.indexOf('run: node scripts/ai-solo-hot.mjs')<yml.indexOf('- name: Commit refreshed data'));
 assert.equal((yml.match(/- cron:/g)||[]).length,1);
});
test('bilingual rendering handles empty outages and escapes original publisher copy',async()=>{
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const empty=await collectHot({now,fetchImpl:mocks({failHN:true,failPH:true})});
 for(const zh of [true,false]){
  let html='',written;
  const opts={BASE:'https://baipiaoji.com'+(zh?'':'/en'),zh,esc:escape,render:(_p,_t,_d,body)=>{html=body;},write:(_p,s)=>{written=JSON.parse(s);}};
  buildHotPages({...opts,snapshot:empty});assert(html.includes(zh?'没有可展示的成功采样':'No successful sample to show'));assert(html.includes('data-hot-stale>'));assert.deepEqual(written,empty);
  const data=await collectHot({now,fetchImpl:mocks()});data.sources[0].items[0].title='<img src=x onerror="alert(1)"> 原始中文 TODO';data.sources[0].items[0].url='javascript:alert(1)';
  buildHotPages({...opts,snapshot:data});assert(html.includes('&lt;img'));assert(!html.includes('<img'));assert(!html.includes('href="javascript:'));assert(html.includes('data-source-original'));assert(html.includes(zh?'首次基线':'Baseline sample'));assert(!html.includes('NaN')&&!html.includes('undefined'));
 }
});
