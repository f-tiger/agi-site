// Run in a trusted local shell with the existing deployment secrets. Never print
// credentials, pending text or user records into public GitHub Actions logs.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {memberSecret} from '../../../../tools/member-studio/ops.mjs';
const key=createHash('sha256').update(memberSecret('agi',process.env)+':community-moderator:v1').digest('hex');
const [mode,output]=process.argv.slice(2),origin='https://agiscorecard.com';
if(mode==='credential-file'){
 if(!output)throw Error('Supply a private local output path outside the repository');
 fs.writeFileSync(output,key+'\n',{mode:0o600,flag:'wx'});
 console.log('Private credential file created. Use only in /discuss/moderate; do not commit or upload.');
}else if(mode==='stats'){
 const r=await fetch(origin+'/api/discuss/admin',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({action:'stats'}),signal:AbortSignal.timeout(30000)});
 const d=await r.json();if(!r.ok||!d.ok)throw Error('Community stats unavailable');console.log(JSON.stringify(d,null,2));
}else throw Error('Choose stats or credential-file PRIVATE_PATH');
