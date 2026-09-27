import test from 'node:test';import assert from 'node:assert/strict';
import {onRequestPost} from '../../functions/api/doc-events.js';
import {aggregateDocuments} from '../../functions/api/document-stats.js';
import {shareUrl} from '../../document-assets/sharing.mjs';
import {growthSlugs,affiliateUrl} from './growth-data.mjs';
import {GROWTH_SLUGS} from '../../document-assets/growth-core.mjs';
test('resource actions are path-bound and cannot carry private input or fake purchases',async()=>{
 const inserted=[];const env={HITS:{prepare:()=>({bind:(...a)=>({run:async()=>inserted.push(a)})})}};
 const send=body=>onRequestPost({env,request:new Request('https://thedollscout.com/api/doc-events',{method:'POST',headers:{origin:'https://thedollscout.com'},body:JSON.stringify(body)})});
 for(const [p,e] of [['/de/videos/upscayl','doc_video_load_upscayl'],['/zh/open-source/whisper','doc_project_download_whisper'],['/creator-kit','doc_gear_mic']]){assert.equal((await send({p,e})).status,204);assert.equal((await send({p:'/pdf-to-text',e})).status,400);assert.equal((await send({p,e,amount:100})).status,400);}
 for(const p of ['/videos/unknown','/open-source/private','/creator-kit?email=private'])assert.equal((await send({p,e:'doc_view'})).status,400);
 assert.equal((await send({p:'/creator-kit',e:'doc_purchase'})).status,400);assert.equal(inserted.length,3);
});
test('resource views and purchase intent cannot become tool completions or revenue',()=>{
 const report=aggregateDocuments([{d:'2026-09-27',ev:'doc_view',path:'/videos/audacity',ref:'',n:8},{d:'2026-09-27',ev:'doc_video_load_audacity',path:'/videos/audacity',ref:'',n:3},{d:'2026-09-27',ev:'doc_gear_mic',path:'/de/creator-kit',ref:'',n:2}]);
 assert.equal(report.resource_views,8);assert.equal(report.dedicated_tool_views,0);assert.equal(report.resource_actions.doc_gear_mic,2);assert.equal(report.events.doc_complete,undefined);assert.equal(report.revenue,undefined);assert.match(report.revenue_scope,/not orders or revenue/);
});
test('every public resource can be shared without query data; affiliate links preserve market ownership',()=>{
 assert.deepEqual(growthSlugs,GROWTH_SLUGS);
 for(const prefix of ['/','/de/','/zh/'])for(const slug of growthSlugs)assert.equal(shareUrl('https://thedollscout.com'+prefix+slug+'?secret=x#note'),'https://thedollscout.com'+prefix+slug+'?via=share');
 for(const lang of ['en','de','zh'])for(const kind of ['mic','light','storage']){const u=new URL(affiliateUrl(lang,kind));assert.equal(u.hostname,lang==='de'?'www.amazon.de':'www.amazon.com');assert.equal(u.searchParams.get('tag'),lang==='de'?'getecoback-21':'ecoback0d-20');}
 assert.throws(()=>shareUrl('https://evil.test/videos/upscayl'));assert.throws(()=>shareUrl('/videos/unknown'));
});
