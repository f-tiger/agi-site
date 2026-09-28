import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {VERSION,sampleBatch,sampleContract} from '../public/engine.mjs';
let revision='local';try{revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
const release={name:'Agent Delivery Lab',version:VERSION,revision};
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});
await mkdir('dist/examples',{recursive:true});
await writeFile('dist/examples/batch.json',JSON.stringify(sampleBatch,null,2)+'\n');
await writeFile('dist/examples/contract.json',JSON.stringify(sampleContract,null,2)+'\n');
await writeFile('dist/release.json',JSON.stringify(release)+'\n');await writeFile('release.generated.mjs','export const release = '+JSON.stringify(release)+';\n');
// Honest <lastmod> + dateModified from a content-hash manifest (tools/fleet/lastmod.py). CI runs in
// check mode: content changed without `LASTMOD_MODE=update npm run build` fails the build on purpose.
execFileSync('python3',[fileURLToPath(new URL('../../../tools/fleet/lastmod.py',import.meta.url)),'--root','dist','--manifest','lastmod.json','--sitemap','dist/sitemap.xml'],{stdio:'inherit'});
console.log('Built Agent Delivery Lab '+VERSION+' ('+revision+')');
