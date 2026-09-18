import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const stage='release/tradecheck-mcp';await rm('release',{recursive:true,force:true});await mkdir(stage,{recursive:true});
const allow=['package.json','package-lock.json','tsconfig.json','README.md','LICENSE.txt','THIRD-PARTY-NOTICES.txt','AGENT-WORKFLOW.md','src','dist','examples','tests','scripts','evals.xml','EVALUATION.md','evaluation-results.json'];
for(const path of allow)await cp(path,stage+'/'+path,{recursive:true});
const file='tradecheck-mcp-0.1.0.tar.gz';const r=spawnSync('tar',['-czf','release/'+file,'-C','release','tradecheck-mcp'],{stdio:'inherit'});if(r.status!==0)throw Error('Archive creation failed');
const digest=createHash('sha256').update(await readFile('release/'+file)).digest('hex');await writeFile('release/SHA256SUMS',digest+'  '+file+'\n');console.log('Created reviewed beta package and checksum.');
