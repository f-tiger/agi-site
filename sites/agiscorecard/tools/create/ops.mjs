// Private maintenance only. Never print stories, identifiers, or credentials in CI logs.
import {createHash} from 'node:crypto';import fs from 'node:fs';import path from 'node:path';
import {memberSecret} from '../../../../tools/member-studio/ops.mjs';
const [mode,arg]=process.argv.slice(2),origin='https://agiscorecard.com';
if(mode==='stats'&&arg&&arg!=='--read-only')throw Error('Use stats with --read-only or no argument');
const readOnly=mode==='stats'&&arg==='--read-only';
const key=createHash('sha256').update(memberSecret('agi',process.env)+':relay-admin:v1').digest('hex');
const operation=mode==='stats'?'stats':mode==='queue'?'queue':mode==='remove'?'remove':null;if(!operation)throw Error('Use stats, queue PRIVATE_OUTPUT_PATH, or remove STORY_ID');
const r=await fetch(origin+'/api/create',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({action:readOnly?'inspect_stats':'admin',operation,...(operation==='remove'?{id:arg}:{})}),...(readOnly?{redirect:'manual'}:{}),signal:AbortSignal.timeout(30000)});const data=await r.json();if(!r.ok||!data.ok)throw Error('Relay maintenance failed');
if(mode==='queue'){if(!arg||path.resolve(arg).startsWith(process.cwd()+path.sep))throw Error('Use a private output path outside the repository');fs.writeFileSync(arg,JSON.stringify(data),{mode:0o600,flag:'wx'});console.log('Review queue written to private output; do not upload or commit it.');}else console.log(JSON.stringify(data));
