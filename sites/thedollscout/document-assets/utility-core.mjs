// Bounded, local-only transformations. No network, persistence, or evaluation of input.
export const UTILITY_LIMITS=Object.freeze({jsonBytes:524288,jsonDepth:60,jsonNodes:20000,jsonChanges:1000,imageBytes:20*1024*1024,imageTotal:50*1024*1024,imagePixels:20000000,imageFiles:8});
const fail=code=>{throw new Error(code);};
const utf8=new TextEncoder();
export function parseJSONExact(text){
 if(typeof text!=='string'||utf8.encode(text).length>UTILITY_LIMITS.jsonBytes)fail('jsonSize');
 let i=0,nodes=0;const ws=()=>{while(/[\x20\t\n\r]/.test(text[i]||'!'))i++;};
 const bad=code=>{const error=new Error(code);error.line=text.slice(0,i).split('\n').length;error.column=i-(text.lastIndexOf('\n',i-1)+1)+1;throw error;};
 function string(){const start=i++;while(i<text.length){if(text[i]==='"'){i++;try{return JSON.parse(text.slice(start,i));}catch{bad('jsonSyntax');}}if(text[i]==='\\')i++;i++;}bad('jsonSyntax');}
 function value(depth){ws();if(depth>UTILITY_LIMITS.jsonDepth||++nodes>UTILITY_LIMITS.jsonNodes)bad('jsonComplex');const c=text[i];
  if(c==='"')return {t:'string',v:string()};
  if(c==='{'||c==='['){i++;ws();const object=c==='{',end=object?'}':']',v=[];const keys=new Set();if(text[i]===end){i++;return {t:object?'object':'array',v};}
   while(i<text.length){ws();let key;if(object){if(text[i]!=='"')bad('jsonSyntax');key=string();if(keys.has(key))bad('jsonDuplicate');keys.add(key);ws();if(text[i++]!==':')bad('jsonSyntax');}
    const child=value(depth+1);v.push(object?[key,child]:child);ws();if(text[i]===end){i++;return {t:object?'object':'array',v};}if(text[i++]!==',')bad('jsonSyntax');}
   bad('jsonSyntax');
  }
  for(const literal of ['true','false','null'])if(text.startsWith(literal,i)){i+=literal.length;return {t:'literal',v:literal};}
  const m=/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;m.lastIndex=i;const match=m.exec(text);if(!match)bad('jsonSyntax');i=m.lastIndex;
  const exp=match[0].split(/[eE]/)[1];if(exp&&(exp.replace(/^[+-]/,'').length>6||Math.abs(Number(exp))>100000))bad('jsonComplex');
  return {t:'number',v:match[0]};
 }
 const result=value(0);ws();if(i!==text.length)bad('jsonSyntax');return result;
}
export function formatJSONExact(node,{pretty=true,sort=false}={},level=0){
 if(node.t==='string')return JSON.stringify(node.v);
 if(node.t==='number'||node.t==='literal')return node.v;
 const object=node.t==='object',entries=object&&sort?[...node.v].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0):node.v;
 const items=entries.map(x=>object?JSON.stringify(x[0])+':'+(pretty?' ':'')+formatJSONExact(x[1],{pretty,sort},level+1):formatJSONExact(x,{pretty,sort},level+1));
 const open=object?'{':'[',close=object?'}':']';if(!items.length)return open+close;
 return pretty?open+'\n'+'  '.repeat(level+1)+items.join(',\n'+'  '.repeat(level+1))+'\n'+'  '.repeat(level)+close:open+items.join(',')+close;
}
function exactNumber(raw){let [coefficient,exp='0']=raw.toLowerCase().split('e');const negative=coefficient.startsWith('-');coefficient=coefficient.replace(/^-/,'');const [integer,fraction='']=coefficient.split('.');let digits=(integer+fraction).replace(/^0+/,'');if(!digits)return '0';const zeros=/0*$/.exec(digits)[0].length;digits=digits.slice(0,digits.length-zeros);return (negative?'-':'')+digits+'e'+(BigInt(exp)-BigInt(fraction.length)+BigInt(zeros));}
export function diffJSONExact(before,after){const changes=[];const pointer=s=>String(s).replace(/~/g,'~0').replace(/\//g,'~1');const show=n=>n===undefined?null:formatJSONExact(n,{pretty:false});
 function add(path,kind,a,b){if(changes.length>=UTILITY_LIMITS.jsonChanges)fail('jsonChanges');changes.push({path,kind,before:show(a),after:show(b)});}
 function walk(a,b,path){if(a===undefined)return add(path,'added',a,b);if(b===undefined)return add(path,'removed',a,b);if(a.t!==b.t)return add(path,'changed',a,b);
  if(a.t==='object'){const x=new Map(a.v),y=new Map(b.v);for(const key of new Set([...x.keys(),...y.keys()]))walk(x.get(key),y.get(key),path+'/'+pointer(key));}
  else if(a.t==='array'){for(let i=0;i<Math.max(a.v.length,b.v.length);i++)walk(a.v[i],b.v[i],path+'/'+i);}
  else if((a.t==='number'?exactNumber(a.v):a.v)!==(b.t==='number'?exactNumber(b.v):b.v))add(path,'changed',a,b);
 }walk(before,after,'');return changes;
}
export function fitImage(width,height,maxWidth,maxHeight){if(![width,height,maxWidth,maxHeight].every(Number.isInteger)||Math.min(width,height,maxWidth,maxHeight)<1||maxWidth>4096||maxHeight>4096)fail('imageDimensions');const ratio=Math.min(1,maxWidth/width,maxHeight/height);return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};}
export function imageHeader(buffer){const b=new Uint8Array(buffer),v=new DataView(b.buffer,b.byteOffset,b.byteLength);if(b.length<24||b.length>UTILITY_LIMITS.imageBytes)fail('imageSize');let width,height,type;const ascii=(p,n)=>String.fromCharCode(...b.slice(p,p+n));const u24=p=>b[p]|b[p+1]<<8|b[p+2]<<16;
 if(ascii(1,3)==='PNG'&&b[0]===137&&ascii(12,4)==='IHDR'){type='image/png';width=v.getUint32(16);height=v.getUint32(20);for(let p=8;p+12<=b.length;){const length=v.getUint32(p);if(p+12+length>b.length)fail('imageType');if(ascii(p+4,4)==='acTL')fail('imageAnimated');p+=12+length;}}
 else if(b[0]===255&&b[1]===216){type='image/jpeg';let p=2;while(p+4<=b.length){if(b[p++]!==255)fail('imageType');while(b[p]===255)p++;const marker=b[p++];if(marker===0xda||marker===0xd9)break;if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;const length=v.getUint16(p);if(length<2||p+length>b.length)fail('imageType');if([0xc0,0xc1,0xc2].includes(marker)){if(length<8)fail('imageType');height=v.getUint16(p+3);width=v.getUint16(p+5);break;}p+=length;}}
 else if(ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'){type='image/webp';const end=v.getUint32(4,true)+8;if(end>b.length)fail('imageType');for(let p=12;p+8<=end;){const kind=ascii(p,4),length=v.getUint32(p+4,true),d=p+8;if(d+length>end)fail('imageType');if(kind==='ANIM'||kind==='ANMF')fail('imageAnimated');if(kind==='VP8X'&&length>=10){if(b[d]&2)fail('imageAnimated');width=u24(d+4)+1;height=u24(d+7)+1;}if(!width&&kind==='VP8L'&&length>=5&&b[d]===0x2f){width=1+(b[d+1]|(b[d+2]&63)<<8);height=1+((b[d+2]>>6)|(b[d+3]<<2)|((b[d+4]&15)<<10));}if(!width&&kind==='VP8 '&&length>=10&&ascii(d+3,3)==='\x9d\x01\x2a'){width=v.getUint16(d+6,true)&16383;height=v.getUint16(d+8,true)&16383;}p=d+length+(length%2);}}
 else fail('imageType');
 if(!width||!height)fail('imageType');if(width*height>UTILITY_LIMITS.imagePixels||Math.max(width,height)>12000)fail('imagePixels');return {width,height,type};
}
const zoneFormat=new Map();
export function zoneParts(ms,zone){if(!zoneFormat.has(zone)){try{zoneFormat.set(zone,new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));}catch{fail('timeZone');}}return Object.fromEntries(zoneFormat.get(zone).formatToParts(ms).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));}
const partsUTC=p=>Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second||0);
export function resolveWallTime(value,zone,occurrence='reject'){
 const m=/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(value);if(!m)fail('timeDate');const [year,month,day,hour,minute]=m.slice(1).map(Number),naive=Date.UTC(year,month-1,day,hour,minute);const date=new Date(naive);if(year<1970||year>2100||date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||date.getUTCDate()!==day||hour>23||minute>59)fail('timeDate');
 const offsets=new Set();for(let h=-36;h<=36;h+=6){const t=naive+h*3600000;offsets.add(partsUTC(zoneParts(t,zone))-t);}const candidates=[...offsets].map(o=>naive-o).filter(t=>partsUTC(zoneParts(t,zone))===naive).sort((a,b)=>a-b);
 if(!candidates.length)fail('timeGap');if(candidates.length>1&&!['earlier','later'].includes(occurrence))fail('timeFold');return occurrence==='later'?candidates.at(-1):candidates[0];
}
export function planMeeting({local,zone,duration,zones,occurrence='reject'}){duration=Number(duration);if(!Number.isInteger(duration)||duration<5||duration>480)fail('timeDuration');if(!Array.isArray(zones)||zones.length>20)fail('timeZone');const start=resolveWallTime(local,zone,occurrence),end=start+duration*60000;return {start,end,sourceZone:zone,rows:[...new Set([zone,...zones])].map(z=>{const a=zoneParts(start,z),b=zoneParts(end,z),day=new Date(Date.UTC(a.year,a.month-1,a.day)).getUTCDay();return {zone:z,start:a,end:b,outside:day===0||day===6||a.hour<9||b.hour>18||(b.hour===18&&b.minute>0)||a.day!==b.day};})};}
export function calendarFile({start,end,title,description='',uid,now=Date.now()}){if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!Number.isFinite(now)||typeof uid!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(uid))fail('timeDate');const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');const stamp=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TDS//Local meeting planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+uid+'@thedollscout.com','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(start),'DTEND:'+stamp(end),'SUMMARY:'+escape(Array.from(String(title)).slice(0,120).join('')),'DESCRIPTION:'+escape(Array.from(String(description)).slice(0,2000).join('')),'END:VEVENT','END:VCALENDAR'];
 return lines.map(line=>{let current='',length=0,out=[];for(const ch of line){const n=utf8.encode(ch).length;if(length+n>75){out.push(current);current=' ';length=1;}current+=ch;length+=n;}out.push(current);return out.join('\r\n');}).join('\r\n')+'\r\n';
}
