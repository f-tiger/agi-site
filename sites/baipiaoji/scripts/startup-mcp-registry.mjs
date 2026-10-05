import {readFileSync,appendFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const m=JSON.parse(readFileSync(new URL('../startup-mcp/server.json',import.meta.url),'utf8'));
assert.equal(m.name,'io.github.f-tiger/bpj-startup-research');assert(m.description.length<=100);assert.equal(m.remotes[0].url,'https://baipiaoji.com/api/startup-mcp');
const url='https://registry.modelcontextprotocol.io/v0.1/servers?search='+encodeURIComponent(m.name)+'&version=latest';
async function registered(){const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Registry HTTP '+response.status);const data=await response.json();return (data.servers||[]).some(r=>r.server?.name===m.name&&r.server?.version===m.version&&r._meta?.['io.modelcontextprotocol.registry/official']?.isLatest);}
if(process.argv.includes('--check')){const present=await registered();if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'publish='+(!present)+'\n');console.log(present?'Startup MCP version already registered; no duplicate publish.':'Startup MCP version requires registration after successful live verification.');}
else if(process.argv.includes('--verify')){let ok=false;for(let i=0;i<6;i++){if(await registered()){ok=true;break;}await new Promise(r=>setTimeout(r,10000));}assert(ok,'Published version not visible in the official registry');console.log('REGISTERED '+m.name+' '+m.version+' '+url);}
else throw Error('Use --check or --verify');
