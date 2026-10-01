// Summary-only local backups: never retain source captions, run IDs or filenames.
const codes={subtitles:['invalid_timestamp','nonpositive_duration','out_of_order','overlap','empty_caption','many_lines','long_line','fast_reading','empty_input'],workflow:['malformed_row','missing_id','duplicate_run','invalid_timestamp','future_timestamp','stale_run','unknown_status','not_success','invalid_count','empty_output','missing_expected_runs','empty_input']};
const integer=n=>Number.isInteger(n)&&n>=0&&n<=500000;
export function validate(r){
 if(!r||r.schema!=='agi-delivery-summary-v1'||r.engine!==1||!codes[r.kind]||typeof r.id!=='string'||! /^[a-zA-Z0-9-]{1,80}$/.test(r.id)||typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt))||!integer(r.count)||!r.flags||Array.isArray(r.flags))throw Error('Invalid summary');
 const flags={};for(const [code,n]of Object.entries(r.flags)){if(!codes[r.kind].includes(code)||!integer(n)||!n)throw Error('Invalid flags');flags[code]=n;}
 const p=r.thresholds;if(!p||typeof p!=='object')throw Error('Missing thresholds');let thresholds;
 if(r.kind==='subtitles'){if(!Number.isFinite(p.cps)||p.cps<1||p.cps>100||!Number.isInteger(p.line)||p.line<10||p.line>200)throw Error('Invalid thresholds');thresholds={cps:p.cps,line:p.line};}
 else{if(typeof p.now!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(p.now)||!Number.isFinite(Date.parse(p.now))||!Number.isFinite(p.staleHours)||p.staleHours<=0||p.staleHours>8760||!Number.isInteger(p.expected)||p.expected<0||p.expected>10000||!integer(r.successes)||r.successes>r.count)throw Error('Invalid workflow thresholds');thresholds={now:new Date(p.now).toISOString(),staleHours:p.staleHours,expected:p.expected};}
 return {schema:r.schema,engine:1,id:r.id,createdAt:new Date(r.createdAt).toISOString(),kind:r.kind,count:r.count,...(r.kind==='workflow'?{successes:r.successes}:{}),thresholds,flags};
}
export function snapshot(report,id,createdAt=new Date().toISOString()){
 const flags={};for(const issue of report.issues)flags[issue.code]=(flags[issue.code]||0)+1;
 return validate({...report,schema:'agi-delivery-summary-v1',engine:1,id,createdAt,flags});
}
export function decode(text){if(text.length>100000)throw Error('Backup too large');const data=JSON.parse(text);if(data?.schema!=='agi-delivery-history-v1'||!Array.isArray(data.reports)||data.reports.length>20)throw Error('Invalid backup');const reports=data.reports.map(validate);if(new Set(reports.map(r=>r.id)).size!==reports.length)throw Error('Duplicate IDs');return reports;}
export function encode(reports){return JSON.stringify({schema:'agi-delivery-history-v1',reports:reports.map(validate)},null,2);}
export function compare(before,after){
 const a=validate(before),b=validate(after);
 if(a.kind!==b.kind)return {blocked:'kind'};
 if(JSON.stringify(a.thresholds)!==JSON.stringify(b.thresholds))return {blocked:'thresholds'};
 if(a.count!==b.count)return {blocked:'coverage'};
 return {rows:[...new Set([...Object.keys(a.flags),...Object.keys(b.flags)])].sort().map(code=>({code,before:a.flags[code]||0,after:b.flags[code]||0,delta:(b.flags[code]||0)-(a.flags[code]||0)}))};
}
