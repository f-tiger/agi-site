// One cached read of public fixed-label aggregates. No inputs, identities or new D1 query.
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {collectorWindow} from '../../functions/api/collector-growth.js';
import {EVENT_KIT_EVENTS, collectorEventAllowed} from '../../lib/collector-measurement.js';

const TOOL='prepare_swap_event_card';
const METRICS=Object.freeze({collector_event_prepare:'organizer_templates',collector_event_card:'participant_cards',collector_event_share:'links_copied',collector_event_text:'texts_copied',collector_event_recipient:'recipient_opens',collector_event_reuse:'own_card_starts',collector_event_print:'print_requests'});
const fail=()=>{throw Error('Event measurement unavailable or inconsistent; missing data is unknown, not zero.');};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
function sameCoverage(value,expected){
 if(!value||value.released!==expected.released||value.first_full_utc_day!==expected.first_full_utc_day||value.coveredDays!==expected.coveredDays)return false;
 return expected.measuredWindow===null?value.measuredWindow===null:value.measuredWindow?.start===expected.measuredWindow.start&&value.measuredWindow?.end_exclusive===expected.measuredWindow.end_exclusive;
}
function add(total,row,coverage){
 if(!Number.isSafeInteger(row.n)||row.n<0||!validDate(row.date)||!coverage.measuredWindow||row.date<coverage.measuredWindow.start||row.date>=coverage.measuredWindow.end_exclusive)fail();
 const next=total+row.n;if(!Number.isSafeInteger(next))fail();return next;
}
export function summarizeEventReport(data,{now=new Date()}={}){
 const generated=typeof data?.generated==='string'?Date.parse(data.generated):NaN;
 if(!data?.ok||data.unit!=='anonymous_events_not_users'||!Number.isFinite(generated)||generated>now.getTime()+60000||now.getTime()-generated>15*60000||!Array.isArray(data.browser)||!Array.isArray(data.mcp))fail();
 const expected=collectorWindow(new Date(generated));
 const sum=rows=>rows.reduce((total,row)=>{if(!row||!Number.isSafeInteger(row.n)||row.n<0||!Number.isSafeInteger(total+row.n))fail();return total+row.n;},0);
 if(expected.coveredDays){
  if(!data.counts||data.counts.browser_actions!==sum(data.browser)||data.counts.mcp_tool_calls!==sum(data.mcp))fail();
 }else if(data.counts!==null||data.browser.length||data.mcp.length)fail();
 for(const event of EVENT_KIT_EVENTS)if(!sameCoverage(data.event_coverage?.[event],expected.event_coverage[event]))fail();
 if(!sameCoverage(data.mcp_tool_coverage?.[TOOL],expected.mcp_tool_coverage[TOOL]))fail();
 const coverage=expected.event_coverage.collector_event_card,toolCoverage=expected.mcp_tool_coverage[TOOL];
 const counts=Object.fromEntries(Object.values(METRICS).map(name=>[name,coverage.coveredDays?0:null]));
 for(const row of data.browser){
  if(!EVENT_KIT_EVENTS.has(row?.event))continue;
  if(!collectorEventAllowed(row.event,row.path))fail();
  counts[METRICS[row.event]]=add(counts[METRICS[row.event]],row,expected.event_coverage[row.event]);
 }
 counts.mcp_results=toolCoverage.coveredDays?0:null;counts.mcp_no_results=toolCoverage.coveredDays?0:null;
 for(const row of data.mcp){
  if(row?.tool!==TOOL)continue;
  const key=row.result==='result'?'mcp_results':row.result==='no_result'?'mcp_no_results':null;
  if(!key)fail();counts[key]=add(counts[key],row,toolCoverage);
 }
 const status=coverage.coveredDays&&toolCoverage.coveredDays?'measured_complete_days':'pending_first_complete_day';
 const focus=status!=='measured_complete_days'?'await_first_complete_day':!counts.organizer_templates&&!counts.participant_cards&&!counts.mcp_results?'check_access_and_authorized_distribution':counts.links_copied&&!counts.recipient_opens?'check_shared_link_opening':counts.recipient_opens&&!counts.participant_cards?'check_recipient_to_own_card_path':'review_voluntary_external_adoption_evidence';
 return {ok:true,status,generated:data.generated,unit:'anonymous_actions_not_people',coverage:{browser:coverage,mcp:toolCoverage},counts,focus,
  external_adoption:'unverified',organizer_adoption:'unverified',repeat_use:'unverified',revenue:'unverified',
  limitations:'Preparation, copies, opens, own-card starts and print requests are separate actions. They are not unique participants, delivered shares, completed prints, activity attendance, matches, repeats or sales. QA and declared opt-outs are excluded; missing writes cannot be reconstructed.'};
}

export function healthSummary(report){
 if(!report?.ok)fail();
 const labels={await_first_complete_day:'Await the first complete UTC day; do not interpret missing coverage as zero.',check_access_and_authorized_distribution:'Review the working entry point and authorized distribution before adding features.',check_shared_link_opening:'Review whether shared links were delivered and can be opened; copied links alone do not establish use.',check_recipient_to_own_card_path:'Review the recipient-to-own-card path with voluntary feedback; unrelated anonymous actions are not a funnel.',review_voluntary_external_adoption_evidence:'Review independently supplied organizer adoption and repeat-task evidence.'};
 if(!Object.hasOwn(labels,report.focus))fail();
 const window=report.coverage.browser.measuredWindow;
 return ['TDS event-kit daily measurement health',`Status: ${report.status}`,`Coverage: ${window?window.start+' to '+window.end_exclusive+' (end exclusive)':'no complete observation day yet'}`,`Next check: ${labels[report.focus]}`,'External adoption, repeat use and revenue remain unverified. Counts and customer inputs are not printed in this public health summary.'].join('\n')+'\n';
}

export async function fetchEventReport({fetcher=fetch,now=new Date()}={}){
 const response=await fetcher('https://thedollscout.com/api/collector-growth',{headers:{'user-agent':'tds-daily-event-report/1.0'},signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!response.ok)fail();
 const raw=await response.text();if(raw.length>1000000)fail();
 let data;try{data=JSON.parse(raw);}catch{fail();}
 return summarizeEventReport(data,{now});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.slice(2).some(arg=>arg!=='--health-only'))throw Error('Use --health-only or no arguments.');
  const report=await fetchEventReport();
  console.log(process.argv.includes('--health-only')?healthSummary(report).trimEnd():JSON.stringify(report,null,2));
 }catch{
  console.error('Event measurement unavailable or inconsistent. Counts and adoption remain unknown; check the collector-growth endpoint and deployment.');
  process.exitCode=1;
 }
}
