export const FILE_EDITION='2026-09-25.1';
export const LIMITS=Object.freeze({files:20,bytes:64*1024*1024,fileBytes:20*1024*1024,pages:200,pixels:16_000_000,outputBytes:100*1024*1024});
export const DEFAULTS=Object.freeze({width:1200,height:1200,fit:'contain',format:'jpeg',quality:85,background:'#ffffff',remove:false,tolerance:30,paper:'a4'});
export function settings(raw={}){
  const num=(k,min,max)=>Number.isFinite(Number(raw[k]))&&raw[k]!==''?Math.min(max,Math.max(min,Math.round(Number(raw[k])))):DEFAULTS[k];
  return {width:num('width',64,3000),height:num('height',64,3000),fit:['contain','cover'].includes(raw.fit)?raw.fit:DEFAULTS.fit,format:['jpeg','png','webp'].includes(raw.format)?raw.format:DEFAULTS.format,quality:num('quality',10,100),background:/^#[\da-f]{6}$/i.test(raw.background||'')?raw.background.toLowerCase():DEFAULTS.background,remove:raw.remove===true,tolerance:num('tolerance',0,100),paper:['a4','original'].includes(raw.paper)?raw.paper:DEFAULTS.paper};
}
export function recipe(kind,raw){const s=settings(raw);return {v:1,kind,...(kind==='pdf'?{paper:s.paper}:{width:s.width,height:s.height,fit:s.fit,format:s.format,quality:s.quality,background:s.background,remove:s.remove,tolerance:s.tolerance})};}
export function readRecipe(raw,kind){if(!raw||raw.v!==1||raw.kind!==kind)throw Error('recipe');return settings(raw);}
export function pages(range,count){
  if(!Number.isInteger(count)||count<1||count>LIMITS.pages)throw Error('pages');
  if(!String(range).trim())return Array.from({length:count},(_,i)=>i);
  if(String(range).length>1500)throw Error('range');
  const out=[];
  for(const part of String(range).split(',')){
    const m=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m)throw Error('range');
    const a=Number(m[1]),b=Number(m[2]||m[1]);if(a<1||b<1||a>count||b>count)throw Error('range');
    for(let i=a;;i+=a>b?-1:1){out.push(i-1);if(out.length>LIMITS.pages)throw Error('pages');if(i===b)break;}
  }return out;
}
export function geometry(w,h,width,height,fit){
  const scale=fit==='cover'?Math.max(width/w,height/h):Math.min(width/w,height/h);
  return {x:(width-w*scale)/2,y:(height-h*scale)/2,width:w*scale,height:h*scale};
}
export function safeName(name,index,extension){
  const stem=String(name).replace(/\.[^.]*$/,'').replace(/[^\p{L}\p{N}_ -]/gu,'_').trim().slice(0,70)||'image';
  return String(index+1).padStart(2,'0')+'-'+stem+'.'+extension;
}
// Remove only background pixels connected to a border. Interior matching colours survive.
export function removeEdgeBackground(data,w,h,hex,tolerance){
  if(w*h>LIMITS.pixels||data.length!==w*h*4)throw Error('pixels');
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),seen=new Uint8Array(w*h),queue=new Uint32Array(w*h);let start=0,end=0;
  const visit=p=>{if(seen[p])return;seen[p]=1;const i=p*4;if(data[i+3]===0||Math.max(Math.abs(data[i]-rgb[0]),Math.abs(data[i+1]-rgb[1]),Math.abs(data[i+2]-rgb[2]))<=tolerance){queue[end++]=p;data[i+3]=0;}};
  for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}for(let y=1;y<h-1;y++){visit(y*w);visit(y*w+w-1);}
  while(start<end){const p=queue[start++],x=p%w;if(x)visit(p-1);if(x<w-1)visit(p+1);if(p>=w)visit(p-w);if(p<w*(h-1))visit(p+w);}
  return data;
}
export function classify(file){const ext=file.name.toLowerCase().split('.').pop();if(ext==='pdf')return 'pdf';if(['jpg','jpeg','png','webp'].includes(ext))return 'image';throw Error('type');}
export function checkFiles(existing,added,kind){
  const all=[...existing,...added];if(all.length>LIMITS.files)throw Error('files');
  if(all.reduce((sum,f)=>sum+f.size,0)>LIMITS.bytes)throw Error('bytes');
  for(const f of added){if(!f.size||f.size>LIMITS.fileBytes)throw Error('fileBytes');if(kind==='image'&&classify(f)!=='image')throw Error('type');else classify(f);}return all;
}
export const bytes=n=>n<1024*1024?(n/1024).toFixed(1)+' KB':(n/1024/1024).toFixed(1)+' MB';
