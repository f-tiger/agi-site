import test from 'node:test';
import assert from 'node:assert/strict';
import {collectorWindow} from '../../functions/api/collector-growth.js';
import {summarizeEventReport,healthSummary,fetchEventReport} from './event-report.mjs';

function fixture(generated='2026-11-02T06:00:00.000Z',browser=[],mcp=[]){
 return {ok:true,unit:'anonymous_events_not_users',generated,...collectorWindow(new Date(generated)),browser,mcp,
  counts:{browser_actions:browser.reduce((n,row)=>n+row.n,0),mcp_tool_calls:mcp.reduce((n,row)=>n+row.n,0)}};
}
const now=new Date('2026-11-02T06:01:00.000Z');
const row=(event,n=1)=>({date:'2026-11-01',event,path:'/collecting/event-kit',n});
test('Pending coverage stays unknown; successful measured empty windows report action zeros only',()=>{
 const data=fixture('2026-11-01T06:00:00.000Z'),pending=summarizeEventReport(data,{now:new Date(data.generated)});
 assert.equal(pending.status,'pending_first_complete_day');assert.ok(Object.values(pending.counts).every(n=>n===null));
 const measured=summarizeEventReport(fixture(),{now});assert.equal(measured.status,'measured_complete_days');
 assert.ok(Object.values(measured.counts).every(n=>n===0));
 for(const key of ['external_adoption','organizer_adoption','repeat_use','revenue'])assert.equal(measured[key],'unverified');
});
test('Distinct fixed actions and MCP results remain separate without identities or inferred funnels',()=>{
 const data=fixture(undefined,[row('collector_event_prepare',2),row('collector_event_card',3),row('collector_event_share',4),row('collector_event_recipient',5),row('collector_event_reuse',6),row('collector_event_text',7),row('collector_event_print',8)],
  [{date:'2026-11-01',tool:'prepare_swap_event_card',result:'result',n:9},{date:'2026-11-01',tool:'prepare_swap_event_card',result:'no_result',n:10}]);
 data.private_input='PRIVATE';const report=summarizeEventReport(data,{now});
 assert.deepEqual(report.counts,{organizer_templates:2,participant_cards:3,links_copied:4,texts_copied:7,recipient_opens:5,own_card_starts:6,print_requests:8,mcp_results:9,mcp_no_results:10});
 assert.doesNotMatch(JSON.stringify(report),/PRIVATE/);assert.equal(report.repeat_use,'unverified');
 const summary=healthSummary(report);assert.doesNotMatch(summary,/"counts"|organizer_templates|participant_cards|links_copied|PRIVATE/);
 assert.match(summary,/External adoption, repeat use and revenue remain unverified/);
});
test('Unavailable, stale, future, incomplete and inconsistent reports cannot be relabeled zero',()=>{
 for(const edit of [
  d=>{d.ok=false;},d=>{delete d.event_coverage;},d=>{delete d.mcp_tool_coverage;},d=>{d.counts=null;},
  d=>{d.generated='2026-11-02T05:40:00Z';},d=>{d.generated='2026-11-02T07:00:00Z';},d=>{d.generated='bad';},
  d=>{d.event_coverage.collector_event_card.coveredDays=28;},d=>{d.browser=[row('collector_event_card',-1)];},
  d=>{d.browser=[{...row('collector_event_card'),date:'2026-10-31'}];d.counts.browser_actions=1;},
  d=>{d.browser=[{...row('collector_event_card'),path:'/collecting/event-kit#PRIVATE'}];d.counts.browser_actions=1;},
  d=>{d.mcp=[{date:'2026-11-01',tool:'prepare_swap_event_card',result:'PRIVATE',n:1}];d.counts.mcp_tool_calls=1;}
 ]){const data=fixture();edit(data);assert.throws(()=>summarizeEventReport(data,{now}),/unknown, not zero/);}
});
test('Daily report performs one normal cached read, with no probe bypass, tool call or retry',async()=>{
 const calls=[];const fetcher=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(fixture()),{status:200});};
 const report=await fetchEventReport({fetcher,now});assert.equal(report.ok,true);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://thedollscout.com/api/collector-growth');
 assert.equal(calls[0].options.headers['x-probe'],undefined);assert.equal(calls[0].options.redirect,'error');
 let attempts=0;await assert.rejects(()=>fetchEventReport({now,fetcher:async()=>{attempts++;return new Response('PRIVATE upstream error',{status:503});}}),/unknown, not zero/);assert.equal(attempts,1);
});
