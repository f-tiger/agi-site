import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {campaignMetadata,refEvidence} from '../../document-assets/video-campaign.mjs';
import {onRequestPost} from '../../functions/api/doc-events.js';
import {VIDEO_QUERY,aggregateVideo,onRequestGet} from '../../functions/api/video-growth.js';
import {DOCUMENT_QUERY,aggregateDocuments} from '../../functions/api/document-stats.js';
const campaign='?utm_source=youtube&utm_medium=organic_video&utm_campaign=tds-image-01';
test('campaign requires exact source, medium, page and event; referrers reject lookalikes',()=>{
 assert.deepEqual(campaignMetadata(campaign,'/image-compressor','doc_view'),{c:'tds-image-01',s:'youtube'});
 for(const [q,p,e] of [[campaign,'/json-compare','doc_view'],[campaign.replace('organic_video','email'),'/image-compressor','doc_view'],[campaign,'/image-compressor','doc_delivery_complete']])assert.deepEqual(campaignMetadata(q,p,e),{});
 assert.equal(refEvidence('youtube','m.youtube.com'),'referrer');assert.equal(refEvidence('youtube','youtube.com.evil.test'),'other');assert.equal(refEvidence('youtube','foo.pages.dev'),'internal');assert.equal(refEvidence('tiktok',''),'tag_only');
});
test('collector mirrors atomically, rejects extra input, and suppresses privacy and probes',async()=>{
 const rows=[],batches=[];const env={HITS:{prepare:sql=>({bind:(...args)=>({sql,args,run:async()=>rows.push(args)})}),batch:async statements=>{batches.push(statements);for(const x of statements)rows.push(x.args);}}};
 const body={p:'/image-compressor',e:'doc_image_complete',r:'https://www.youtube.com/watch?v=PRIVATE',c:'tds-image-01',s:'youtube'};
 const send=(b=body,headers={},query='')=>onRequestPost({env,request:new Request('https://thedollscout.com/api/doc-events'+query,{method:'POST',headers:{origin:'https://thedollscout.com','user-agent':'Mozilla/5.0',...headers},body:JSON.stringify(b)})});
 assert.equal((await send()).status,204);assert.equal(batches.length,1);assert.equal(rows.length,2);assert.deepEqual(rows.map(x=>x[5]),['doc_image_complete','vid_tdsimage01_youtube_complete']);assert(rows.every(x=>x[4]==='www.youtube.com'));
 for(const b of [{...body,filename:'private'},{...body,s:'other'},{...body,p:'/json-compare'},{...body,c:'other'},{...body,e:'doc_utility_export',text:'secret'}])assert.equal((await send(b)).status,400);
 for(const h of [{dnt:'1'},{'sec-gpc':'1'},{'x-probe':'1'},{'user-agent':'HeadlessChrome'}])assert.equal((await send(body,h)).status,204);
 assert.equal((await send(body,{},'?ci=1')).status,204);assert.equal(rows.length,2);
 assert.equal((await send(body,{origin:'https://evil.test'})).status,403);
});
test('actual SQL separates sample/channels and complete days; mirror does not inflate documents report',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE hits(d,ev,path,ref);CREATE INDEX hits_d ON hits(d);');
 const add=(ev,day='-1 day',path='/image-compressor',ref='www.youtube.com')=>db.prepare("INSERT INTO hits VALUES(date('now',?),?,?,?)").run(day,ev,path,ref);
 for(const e of ['view','complete','export','sample'])add('vid_tdsimage01_youtube_'+e);
 add('vid_tdsimage01_tiktok_view','-1 day','/image-compressor','');add('doc_view');add('doc_image_sample');add('vid_tdsimage01_youtube_view','0 days');add('vid_tdsimage01_youtube_view','-15 days');add('vid_tdsimage01_youtube_view','-1 day','/other');
 const report=aggregateVideo(db.prepare(VIDEO_QUERY).all());assert.equal(report.reduce((n,r)=>n+r.n,0),5);assert.equal(report.find(x=>x.event==='sample').n,1);assert.equal(report.find(x=>x.source==='tiktok').evidence,'tag_only');
 const legacy=aggregateDocuments(db.prepare(DOCUMENT_QUERY).all());assert.deepEqual(legacy.events,{doc_view:1});assert.equal(legacy.excluded.doc_image_sample,1);db.close();
});
test('missing storage remains unknown and no raw hosts enter report',async()=>{
 assert.equal((await onRequestGet({env:{}})).status,503);
 const res=await onRequestGet({env:{HITS:{prepare:()=>({all:async()=>({results:[{ev:'vid_tdsimage01_youtube_view',ref:'private.example',n:2}]})})}}});const j=await res.json();assert.equal(j.metric,'browser_events_not_users');assert.equal(j.window.complete_utc_days,14);assert.equal(j.rows[0].evidence,'other');assert(!JSON.stringify(j).includes('private.example'));
});
