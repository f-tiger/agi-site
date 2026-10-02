// Notify actual changed public URLs only. Acceptance is not indexing.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const HOST='thedollscout.com', PREFIX='sites/thedollscout/';
const PUBLIC_DATA=new Set(['llms.txt','llms-full.txt','document-assets/tool-capabilities.json','document-assets/sample-results.json','document-assets/resource-library.json','collector-assets/series-catalog.json']);
export function changedUrls(files) {
 return [...new Set(files.filter(p=>p.startsWith(PREFIX)).map(p=>p.slice(PREFIX.length))
  .filter(p=>!p.startsWith('scripts/')&&!p.startsWith('content/')&&(p.endsWith('.html')||PUBLIC_DATA.has(p)))
  .map(p=>'https://'+HOST+'/'+p.replace(/(^|\/)index\.html$/,'$1').replace(/\.html$/,'')))];
}
async function main(){
 const daily=['schedule','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)&&process.env.TDS_DAILY_BEFORE;
 if(!daily&&(process.env.GITHUB_EVENT_NAME!=='push'||!process.env.GITHUB_EVENT_PATH)){console.log('IndexNow skipped: no verified content diff.');return;}
 const event=daily?{}:JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')),before=daily?process.env.TDS_DAILY_BEFORE:event.before,after=daily?process.env.TDS_DAILY_AFTER:process.env.GITHUB_SHA;
 if(!/^[0-9a-f]{40}$/.test(before||'')||/^0+$/.test(before)||!/^[0-9a-f]{40}$/.test(after||''))throw Error('No valid push range; no URLs submitted');
 // Replay guard may deploy a newer main tip. Never notify a historical snapshot.
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==after){console.log('IndexNow skipped: replayed push differs from deployed HEAD.');return;}
 try {execFileSync('git',['cat-file','-e',before],{stdio:'ignore'});}catch{execFileSync('git',['fetch','origin',before,'--depth=1','--quiet']);}
 const files=execFileSync('git',['diff','--name-only','--diff-filter=AM',before,after],{encoding:'utf8'}).trim().split('\n');
 const published=new Set(readFileSync('scripts/urls.txt','utf8').trim().split('\n'));
 const urls=changedUrls(files).filter(url=>published.has(url)||PUBLIC_DATA.has(new URL(url).pathname.slice(1)));
 if(!urls.length){console.log('IndexNow skipped: no changed public content.');return;}
 const key=readFileSync('scripts/indexnow-key.txt','utf8').trim();
 if(!/^[a-f0-9]{32,}$/i.test(key))throw Error('Malformed public IndexNow key');
 const keyLocation=`https://${HOST}/${key}.txt`;
 const proof=await fetch(keyLocation,{headers:{'x-probe':'indexnow-check'},signal:AbortSignal.timeout(20000)});
 if(proof.status!==200||(await proof.text()).trim()!==key)throw Error('IndexNow key file is not verified');
 const response=await fetch('https://api.indexnow.org/IndexNow',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({host:HOST,key,keyLocation,urlList:urls}),signal:AbortSignal.timeout(20000)});
 console.log(JSON.stringify({changed_urls:urls.length,status:response.status,accepted:[200,202].includes(response.status),indexing:'unknown'}));
 if(![200,202].includes(response.status))throw Error('IndexNow rejected notification');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error('::error::'+error.message);process.exitCode=1;});
