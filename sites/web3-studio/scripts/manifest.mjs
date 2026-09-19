import {readdir,readFile,writeFile} from 'node:fs/promises';
import {posix} from 'node:path';
import {sites,hubHost} from '../public/catalog.mjs';
export const indexKey='16507d8e1997c4be371f5fbaf7ac1985';
export async function writeManifest(){
 await writeFile('dist/'+indexKey+'.txt',indexKey);
 const shared=(await readdir('public')).filter(x=>x.endsWith('.mjs')||['style.css','mark.svg','LICENSE.txt'].includes(x)).concat(['offline-tools.zip','release.json',indexKey+'.txt']);
 const manifest={};
 for(const s of [{id:'hub',host:hubHost},...sites]){const prefix=s.id==='hub'?'':s.id+'/';const files=(await readdir('dist/'+prefix,{recursive:true,withFileTypes:true})).filter(x=>x.isFile()).map(x=>posix.join(x.parentPath||x.path,x.name).replace(/^dist\//,''));const rootFiles=s.id==='hub'?files.filter(x=>!x.includes('/')||x.startsWith('.well-known/')):files;manifest[s.host]=Object.fromEntries(rootFiles.filter(x=>!shared.includes(x)).map(x=>{const route=x.slice(prefix.length);return[route==='index.html'?'/':'/'+route,x];}).concat(shared.map(x=>['/'+x,x])));}
 await writeFile('asset-manifest.generated.json',JSON.stringify(manifest,null,2)+'\n');
}
