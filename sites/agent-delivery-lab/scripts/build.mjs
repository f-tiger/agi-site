import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {VERSION,sampleBatch,sampleContract} from '../public/engine.mjs';
let revision='local';try{revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
const release={name:'Agent Delivery Lab',version:VERSION,revision};
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});
await mkdir('dist/examples',{recursive:true});
await writeFile('dist/examples/batch.json',JSON.stringify(sampleBatch,null,2)+'\n');
await writeFile('dist/examples/contract.json',JSON.stringify(sampleContract,null,2)+'\n');
await writeFile('dist/release.json',JSON.stringify(release)+'\n');await writeFile('release.generated.mjs','export const release = '+JSON.stringify(release)+';\n');
console.log('Built Agent Delivery Lab '+VERSION+' ('+revision+')');
