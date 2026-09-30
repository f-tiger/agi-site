// Original bounded local checks; no model calls, uploads or external dependencies.
export function subtitles(text,{cps=20,line=42}={}){
 if(typeof text!=='string'||text.length>500000)throw Error('size');
 if(!Number.isFinite(cps)||cps<1||cps>100||!Number.isInteger(line)||line<10||line>200)throw Error('threshold');
 const blocks=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim().split(/\n\s*\n/),issues=[];let count=0,previousEnd=0,previousStart=-1;
 const stamp=s=>{const m=/^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/.exec(s);return m?(+m[1]*3600 + +m[2]*60 + +m[3])*1000 + +m[4]:NaN;};
 for(let b=0;b<blocks.length;b++){const lines=blocks[b].split('\n');if(/^\d+$/.test(lines[0]))lines.shift();const timing=lines.shift()||'',m=/^(\S+)\s+-->\s+(\S+)$/.exec(timing);const start=m?stamp(m[1]):NaN,end=m?stamp(m[2]):NaN;
 const add=code=>issues.push({item:b+1,code});if(!Number.isFinite(start)||!Number.isFinite(end)){add('invalid_timestamp');continue;}count++;
 if(end<=start)add('nonpositive_duration');if(start<previousStart)add('out_of_order');if(start<previousEnd)add('overlap');previousStart=start;previousEnd=Math.max(previousEnd,end);
 const plain=lines.join('\n').replace(/<[^>]*>/g,'').trim();if(!plain)add('empty_caption');if(lines.length>2)add('many_lines');if(lines.some(s=>Array.from(s.replace(/<[^>]*>/g,'')).length>line))add('long_line');
 if(end>start&&Array.from(plain.replace(/\s/g,'')).length/((end-start)/1000)>cps)add('fast_reading');
 }if(!text.trim())return {kind:'subtitles',count:0,issues:[{item:0,code:'empty_input'}],thresholds:{cps,line}};
 return {kind:'subtitles',count,issues,thresholds:{cps,line}};
}
export function csv(text){
 if(typeof text!=='string'||text.length>500000)throw Error('size');const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"'){if(field)throw Error('csv');quoted=true;}else if(c===','){row.push(field);field='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw Error('csv');row.push(field);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function workflow(text,{now,staleHours=24,expected=1}={}){
 const at=Date.parse(now);if(!Number.isFinite(at)||!Number.isFinite(staleHours)||staleHours<=0||staleHours>8760||!Number.isInteger(expected)||expected<0||expected>10000)throw Error('threshold');
 const rows=csv(text),header=rows.shift()?.map(s=>s.replace(/^\uFEFF/,'').trim());const required=['run_id','finished_at','status','output_count'];if(!header||required.some(k=>!header.includes(k))||new Set(header).size!==header.length)throw Error('schema');
 const issues=[],seen=new Set(),counted=new Set();let successes=0,latest=null;
 rows.forEach((r,i)=>{const item=i+2,add=code=>issues.push({item,code});if(r.length!==header.length){add('malformed_row');return;}const v=Object.fromEntries(header.map((k,j)=>[k,r[j].trim()]));if(!v.run_id)add('missing_id');else if(seen.has(v.run_id))add('duplicate_run');else seen.add(v.run_id);
 // Require explicit timezone. Locale-dependent timestamps would silently alter freshness.
 const time=/(?:Z|[+-]\d\d:\d\d)$/.test(v.finished_at)?Date.parse(v.finished_at):NaN;if(!Number.isFinite(time))add('invalid_timestamp');else{if(time>at)add('future_timestamp');if(at-time>staleHours*3600000)add('stale_run');latest=Math.max(latest??0,time);}
 const status=v.status.toLowerCase();if(!['success','failed','running','cancelled'].includes(status))add('unknown_status');else if(status!=='success')add('not_success');
 const output=v.output_count!==''?Number(v.output_count):NaN;if(!Number.isInteger(output)||output<0)add('invalid_count');else if(status==='success'&&output===0)add('empty_output');if(status==='success'&&Number.isFinite(time)&&time<=at&&at-time<=staleHours*3600000&&!counted.has(v.run_id)){successes++;counted.add(v.run_id);}
 });if(successes<expected)issues.push({item:0,code:'missing_expected_runs'});if(!rows.length)issues.push({item:0,code:'empty_input'});
 return {kind:'workflow',count:rows.length,successes,issues,thresholds:{now,staleHours,expected},latest:latest===null?null:new Date(latest).toISOString()};
}
export const examples={subtitles:'1\n00:00:00,000 --> 00:00:02,000\nWelcome to the demo.\n\n2\n00:00:01,800 --> 00:00:02,000\nThis caption overlaps and is too fast to read.\n',workflow:'run_id,finished_at,status,output_count\nexample-1,2026-10-01T00:00:00Z,success,0\nexample-1,2026-10-01T00:01:00Z,failed,0\n'};
