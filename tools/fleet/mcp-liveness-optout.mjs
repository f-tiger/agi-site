// Documented server-side opt-out, https://glimind.com/opt-out (2026-11-01).
// This invocation still counts. Future savings depend on the monitor honoring it.
// Exact observed agent and endpoints only; not a generic bot or MCP block.
export const MONITOR_UA='SentinelOracle/0.1 (+https://glimind.com/opt-out; liveness-only, never invokes tools)';
export const TARGETS=Object.freeze({
 'agiscorecard.com':['/mcp'],
 'source.agiscorecard.com':['/api/mcp'],
 'web3.agiscorecard.com':['/mcp'],
 'baipiaoji.com':['/api/mcp'],
 'getecoback.com':['/mcp','/mcp/','/mcp/v1'],
});
export function monitorOptOut(request){
 if(!['GET','POST'].includes(request.method)||request.headers.get('User-Agent')!==MONITOR_UA)return null;
 const u=new URL(request.url);
 if(!Object.hasOwn(TARGETS,u.hostname)||!TARGETS[u.hostname].includes(u.pathname))return null;
 return new Response(JSON.stringify({error:'monitor_opted_out',message:'The server operator declines SentinelOracle liveness monitoring. MCP remains available to other clients.'}),{status:403,headers:{
  'X-Sentinel-OptOut':'1','Cache-Control':'no-store','Vary':'User-Agent',
  'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex',
 }});
}
export function withMonitorOptOut(worker){return {...worker,fetch(request,...args){return monitorOptOut(request)||worker.fetch.call(worker,request,...args);}};}
