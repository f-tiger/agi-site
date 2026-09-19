// Notify changed, verified canonical tool pages. HTTP acceptance is not indexing.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sites} from './catalog.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),args=process.argv.slice(2),site=args[args.indexOf('--site')+1],out=path.resolve(args[args.indexOf('--out')+1]);
if(!sites[site]||!args.includes('--out'))throw Error('Choose --site and --out');
const manifest=JSON.parse(fs.readFileSync(path.join(out,'workbench-assets/manifest.json'))),host=new URL(sites[site].origin).hostname;
let key;if(site==='bpj')key=fs.readFileSync(path.join(root,'sites/baipiaoji/data/indexnow-key.txt'),'utf8').trim();else if(site==='tds')key=fs.readFileSync(path.join(root,'sites/thedollscout/scripts/indexnow-key.txt'),'utf8').trim();else{const name=fs.readdirSync(out).find(p=>/^[a-f0-9]{24,}\.txt$/.test(p));if(!name)throw Error('Missing existing IndexNow verification file');key=fs.readFileSync(path.join(out,name),'utf8').trim();}
if(!/^[A-Za-z0-9-]{8,128}$/.test(key))throw Error('Malformed public IndexNow verification key');
const urls=[...new Set(manifest.urls)];for(const u of urls)if(new URL(u).origin!==sites[site].origin)throw Error('Cross-domain URL in submission');
const keyLocation=sites[site].origin+'/'+key+'.txt';const proof=await fetch(keyLocation,{signal:AbortSignal.timeout(20000)});if(proof.status!==200||(await proof.text()).trim()!==key)throw Error('Public IndexNow verification file does not match');
for(const url of urls){const response=await fetch(url,{signal:AbortSignal.timeout(20000)});const html=await response.text();if(response.status!==200||response.url!==url||!html.includes(`rel="canonical" href="${url}"`))throw Error('Refusing noncanonical URL: '+url);}
const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host,key,keyLocation,urlList:urls}),signal:AbortSignal.timeout(20000)});
console.log(JSON.stringify({site,pages:urls.length,http_status:response.status,accepted:[200,202].includes(response.status),indexed:'unknown',new_external_backlinks:'unknown'}));if(![200,202].includes(response.status))throw Error('IndexNow rejected notification; HTTP '+response.status);
