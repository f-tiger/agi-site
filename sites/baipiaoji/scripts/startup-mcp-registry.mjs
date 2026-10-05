import {readFileSync,appendFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {setDefaultResultOrder} from 'node:dns';
setDefaultResultOrder('ipv4first');
const m=JSON.parse(readFileSync(new URL('../startup-mcp/server.json',import.meta.url),'utf8'));
assert.equal(m.name,'io.github.f-tiger/bpj-startup-research');assert(m.description.length<=100);assert.equal(m.remotes[0].url,'https://baipiaoji.com/api/startup-mcp');
const url='https://registry.modelcontextprotocol.io/v0.1/servers/'+encodeURIComponent(m.name)+'/versions/latest';
async function registered(){
 let failure;
 for(let attempt=0;attempt<3;attempt++){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(response.status===404)return false;if(!response.ok)throw Error('Registry HTTP '+response.status);const data=await response.json();return data.server?.name===m.name&&data.server?.version===m.version&&data._meta?.['io.modelcontextprotocol.registry/official']?.isLatest===true;}
  catch(error){failure=error;if(attempt<2)await new Promise(r=>setTimeout(r,2000*(attempt+1)));}
 }
 throw failure;
}
if(process.argv.includes('--check')){const present=await registered();if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'publish='+(!present)+'\n');console.log(present?'Startup MCP version already registered; no duplicate publish.':'Startup MCP version requires registration after successful live verification.');}
else if(process.argv.includes('--verify')){let ok=false;for(let i=0;i<6;i++){if(await registered()){ok=true;break;}await new Promise(r=>setTimeout(r,10000));}assert(ok,'Published version not visible in the official registry');console.log('REGISTERED '+m.name+' '+m.version+' '+url);}
else throw Error('Use --check or --verify');
