#!/usr/bin/env node
import {readFile,writeFile,mkdir,lstat,realpath,rm,readdir} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {inspect,sessions,hash,inside} from './local.mjs';

const API='https://baipiaoji.com/api/codex-efficiency';
const config=join(homedir(),'.config','bpj-efficiency');
const credential=join(config,'device.json');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const shipped=['SKILL.md','references/cli.md','scripts/cli.mjs','scripts/local.mjs','LICENSE'];
const out=value=>process.stdout.write(JSON.stringify(value,null,2)+'\n');
const [command,...argv]=process.argv.slice(2),args={};
for(let i=0;i<argv.length;i+=2){if(!/^--[a-z-]+$/.test(argv[i])||argv[i+1]===undefined||argv[i+1].startsWith('--'))throw Error('Use --option value.');args[argv[i].slice(2)]=argv[i+1];}
async function regular(path,max=20000){const st=await lstat(path);if(!st.isFile()||st.isSymbolicLink()||st.size>max||await realpath(path)!==resolve(path))throw Error('Expected a bounded regular file, without symlinks.');return readFile(path,'utf8');}
async function privateConfig(){await mkdir(config,{recursive:true,mode:0o700});if((await lstat(config)).isSymbolicLink()||await realpath(config)!==config)throw Error('Config directory must not use symlinks.');}
async function token(){await privateConfig();const st=await lstat(credential);if(process.platform!=='win32'&&(st.mode&0o077))throw Error('Credential permissions must be 0600.');return JSON.parse(await regular(credential,2048)).token;}
async function api(body,auth=false){const t=auth?await token():null;const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(20000)});const b=await r.json();if(!r.ok||!b.ok)throw Error(b.code||'BPJ service unavailable');return b;}
async function install(){
 const project=await realpath(args.project||'.'),target=join(project,'.agents','skills','bpj-codex-efficiency');
 for(const p of [join(project,'.agents'),join(project,'.agents','skills')]){const st=await lstat(p).catch(()=>null);if(st?.isSymbolicLink())throw Error('Installation parents must not be symlinks.');}
 if(command==='install'){
  await mkdir(dirname(target),{recursive:true});await mkdir(target);const manifest={version:'1.0.0',files:{}};
  try{for(const file of shipped){const body=await readFile(join(root,file));await mkdir(dirname(join(target,file)),{recursive:true});await writeFile(join(target,file),body,{flag:'wx'});manifest.files[file]=hash(body);}await writeFile(join(target,'.bpj-install.json'),JSON.stringify(manifest),{flag:'wx'});}
  catch(e){await rm(target,{recursive:true,force:true});throw e;}
  out({installed:target,version:manifest.version});return;
 }
 if(await realpath(target)!==target)throw Error('Installation must not be a symlink.');
 const manifest=JSON.parse(await regular(join(target,'.bpj-install.json')));if(manifest.version!=='1.0.0'||Object.keys(manifest.files).sort().join(',')!==[...shipped].sort().join(','))throw Error('Unknown installation manifest.');
 const found=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isSymbolicLink())throw Error('Modified installation; no files removed.');if(e.isDirectory())await walk(p);else found.push(p);}}
 await walk(target);
 if(found.length!==shipped.length+1)throw Error('Extra files detected; no files removed.');
 for(const file of shipped)if(!inside(target,join(target,file))||hash(await readFile(join(target,file)))!==manifest.files[file])throw Error('Modified installation; no files removed.');
 await rm(target,{recursive:true});out({uninstalled:target,credentials_retained:true});
}
try{
 if(command==='install'||command==='uninstall')await install();
 else if(command==='login'){
  await privateConfig();if(await lstat(credential).catch(()=>null))throw Error('A device credential already exists. Run status, or logout before linking another device.');
  const secret=randomBytes(32).toString('hex'),r=await api({action:'device_start',challenge:hash(secret)});
  await writeFile(credential,JSON.stringify({token:secret}),{mode:0o600,flag:'wx'});out({verification_uri:r.verification_uri,code:r.code,expires_in:r.expires_in,next:'Approve this code in your browser, then run status. Never paste a password or credential into chat.'});
 }else if(command==='logout'){await privateConfig();await rm(credential,{force:true});out({local_credential_removed:true,remote_revocation:'Revoke this device on the BPJ product page if needed.'});}
 else if(command==='status'||command==='history')out(await api({action:command},true));
 else if(command==='sessions'||command==='review'){
  if(!args.project)throw Error('--project is required.');
  const roots=args['sessions-root']?[resolve(args['sessions-root'])]:[join(homedir(),'.codex','sessions'),join(homedir(),'.codex','archived_sessions')];
  if(command==='sessions')out(await sessions(args.project,roots));
  else{
   if(!args.session||!args.out||!['true','false'].includes(args.accepted))throw Error('--session, --out and --accepted true|false are required.');
   const observed=await inspect(args.session,args.project,roots);
   const integer=name=>{if(args[name]===undefined)return null;if(!/^\d{1,9}$/.test(args[name]))throw Error('Invalid '+name);return Number(args[name]);};
   const summary={version:1,project:observed.project,runs:[{id:observed.session_id,tokens:observed.tokens,elapsed_ms:observed.elapsed_ms,interventions:integer('interventions'),failures:integer('failures'),accepted:args.accepted==='true'}]};
   const checksum=hash(JSON.stringify(summary)),review={summary,checksum};
   await writeFile(resolve(args.out),JSON.stringify(review,null,2)+'\n',{mode:0o600,flag:'wx'});
   out({review_file:resolve(args.out),...review,counter_status:observed.counter_status,as_of:observed.as_of,note:'Local only. Inspect the summary before submit --consent CHECKSUM. Observed tokens are not subscription credits. Elapsed time includes idle time.'});
  }
 }else if(command==='submit'){
  if(!args.review)throw Error('--review is required.');const review=JSON.parse(await regular(resolve(args.review)));
  const checksum=hash(JSON.stringify(review.summary));if(args.consent!==checksum||review.checksum!==checksum)throw Error('Consent checksum must match the reviewed summary.');
  out(await api({action:'evaluate',summary:review.summary,nonce:checksum.slice(0,32),consent:true},true));
 }else out({name:'BPJ Codex Efficiency',version:'1.0.0',commands:['install --project PATH','sessions --project PATH','review --project PATH --session PATH --accepted true|false --out PATH','login','status','submit --review PATH --consent CHECKSUM','history','logout','uninstall --project PATH'],data:'No automatic uploads or telemetry. See references/cli.md.'});
}catch(e){process.stderr.write('BPJ: '+e.message+'\n');process.exitCode=1;}
