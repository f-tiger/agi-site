import {open,readdir,realpath,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
export const hash=x=>createHash('sha256').update(x).digest('hex');
export const MAX_BYTES=64*1024*1024;
export const inside=(root,p)=>{const r=relative(root,p);return r===''||(!r.split(/[\\/]/).includes('..')&&!isAbsolute(r));};
export async function inspect(session,project,roots){
 const p=await realpath(project),file=resolve(session),actual=await realpath(file),allowed=await Promise.all(roots.map(r=>realpath(r).catch(()=>null)));
 if(file!==actual||!(await lstat(file)).isFile()||!allowed.some(root=>root&&inside(root,actual))||!file.endsWith('.jsonl'))throw Error('Session must be a regular non-symlink JSONL file inside an authorized sessions root.');
 const handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW),stat=await handle.stat();
 if(stat.size>MAX_BYTES){await handle.close();throw Error('Session exceeds the 64 MiB inspection limit.');}
 let meta=null,total=null,last=null,invalid=false,inherited=false,count=0,firstTime=null,lastTime=null,bytes=0;
 const stream=handle.createReadStream({autoClose:true});
 stream.on('data',chunk=>{bytes+=chunk.length;if(bytes>MAX_BYTES)stream.destroy(Error('Session grew beyond the inspection limit.'));});
 try{
  for await(const line of createInterface({input:stream,crlfDelay:Infinity})){
   if(line.length>1024*1024)throw Error('Session line exceeds 1 MiB.');
   let e;try{e=JSON.parse(line);}catch{invalid=true;continue;}
   if(e.type==='session_meta'){
    if(meta)invalid=true;meta=e.payload;
    inherited=!!(meta?.forked_from_id||meta?.parent_session_id||meta?.source?.subagent||meta?.source?.thread_spawn);
   }
   const t=Date.parse(e.timestamp);if(Number.isFinite(t)){firstTime??=t;lastTime=t;}
   if(e.type==='event_msg'&&e.payload?.type==='token_count'){
    const n=e.payload.info?.total_token_usage?.total_tokens;
    if(!Number.isSafeInteger(n)||n<0){invalid=true;continue;}
    if(last!==null&&n<last)invalid=true;
    last=n;total=n;count++;
   }
  }
 }finally{stream.destroy();}
 if(!meta||typeof meta.id!=='string'||typeof meta.cwd!=='string'||await realpath(meta.cwd).catch(()=>null)!==p)throw Error('Session metadata does not identify the selected project. Choose the session explicitly.');
 return {session_id:hash(meta.id).slice(0,32),project:hash(p).slice(0,32),tokens:invalid||inherited||!count?null:total,elapsed_ms:firstTime!==null&&lastTime>=firstTime?lastTime-firstTime:null,counter_status:inherited?'inherited_unknown':invalid?'unsupported_or_reset':count?'observed':'missing',as_of:new Date(stat.mtimeMs).toISOString()};
}
export async function sessions(project,roots){
 const p=await realpath(project),out=[];let visited=0;
 async function walk(dir,depth){
  if(depth>5)return;
  for(const entry of await readdir(dir,{withFileTypes:true}).catch(()=>[])){
   if(++visited>5000)throw Error('Session listing exceeds 5,000 entries. Choose a narrower --sessions-root.');
   if(entry.isSymbolicLink())continue;
   const path=join(dir,entry.name);
   if(entry.isDirectory())await walk(path,depth+1);
   else if(entry.isFile()&&entry.name.endsWith('.jsonl')){
    // Metadata only: read at most 64 KiB, never return message text.
    const f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);let text;
    try{const bytes=Buffer.alloc(65536),r=await f.read(bytes,0,bytes.length,0);text=bytes.subarray(0,r.bytesRead).toString('utf8');}finally{await f.close();}
    for(const line of text.split('\n').slice(0,10)){try{const e=JSON.parse(line);if(e.type==='session_meta'&&typeof e.payload?.cwd==='string'&&await realpath(e.payload.cwd).catch(()=>null)===p){out.push({path,id:hash(String(e.payload.id)).slice(0,32)});break;}}catch{}}
   }
  }
 }
 for(const root of roots){if((await lstat(root).catch(()=>null))?.isSymbolicLink())throw Error('Sessions root cannot be a symlink.');await walk(root,0);}
 return out;
}
