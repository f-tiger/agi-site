// Existing maintenance credentials are derived in memory; never print keys or task data.
import {createHash} from 'node:crypto';
import {memberSecret} from '../../../../tools/member-studio/ops.mjs';
import {VERSION} from '../../jarvis-assets/core.mjs';
const mode=process.argv[2],origin='https://agiscorecard.com';
if(!['verify','run'].includes(mode))throw Error('Choose verify or run');
const key=createHash('sha256').update(memberSecret('agi',process.env)+':jarvis-runner:v1').digest('hex');
async function request(method){const response=await fetch(origin+'/api/jarvis/run',{method,headers:{Origin:origin,Authorization:'Bearer '+key},signal:AbortSignal.timeout(90000)});const data=await response.json();if(!response.ok||!data.ok)throw Error('Jarvis runner request failed (HTTP '+response.status+')');return data;}
if(mode==='verify'){const d=await request('GET');if(d.version!==VERSION||d.maxTasksPerRequest!==1)throw Error('Jarvis runner release mismatch');console.log('Private Jarvis runner authentication and version verified; no task executed and no model quota used.');}
else{let processed=0;for(let i=0;i<2;i++){const d=await request('POST');processed+=d.processed;if(!d.processed)break;}console.log(JSON.stringify({runner:'jarvis',processed}));}
