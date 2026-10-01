// Read one cached snapshot, then select dates locally. No extra D1 date queries.
import {readFileSync} from 'node:fs';
const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1]};
const days=Number(option('--days')||28);
if(!Number.isInteger(days)||days<7||days>90)throw Error('--days must be 7–90');
const file=option('--file');
const data=file?JSON.parse(readFileSync(file,'utf8')):await fetch('https://baipiaoji.com/api/reach?days='+days,{headers:{'User-Agent':'bpj-ci-home-report'},signal:AbortSignal.timeout(30000)}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()});
const home=data.homepage_signals;if(!home?.ok)throw Error('Homepage detail unavailable; do not interpret as zero. '+(home?.reason||'not_reported'));
const endDefault=new Date(Date.parse(home.window.until+'T00:00:00Z')-86400000).toISOString().slice(0,10);
const start=option('--start')||home.window.start,end=option('--end')||endDefault;
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
if(!validDate(start)||!validDate(end)||start<home.window.start||end>home.window.until||start>end)throw Error('Requested dates must be inside the measured window '+home.window.start+'–'+home.window.until);
const rows=home.daily_entries.filter(r=>r.date>=start&&r.date<=end),daily=home.daily.filter(r=>r.date>=start&&r.date<=end);
const sum=items=>items.reduce((n,r)=>n+r.n,0),group=key=>{const m=new Map();for(const r of rows)m.set(r[key],(m.get(r[key])||0)+r.n);return [...m].map(([id,n])=>({id,n})).sort((a,b)=>b.n-a.n||a.id.localeCompare(b.id));};
console.log(JSON.stringify({source:'https://baipiaoji.com/api/reach?days='+days,snapshot_generated:data.generated,window:{start,end,date_basis:'UTC',includes_partial_day:end===home.window.until},clicks:sum(rows),by_language:group('language'),by_block:group('block'),by_destination:group('destination'),daily,entries:rows,definitions:home.definitions},null,2));
