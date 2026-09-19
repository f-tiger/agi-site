import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
const specs=JSON.parse(await readFile('experiments.json','utf8'));
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const id of Object.keys(specs)){await cp('site/'+id,'dist/'+id,{recursive:true});await cp('site/shared','dist/'+id,{recursive:true});await mkdir('dist/'+id+'/fonts');await cp('node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2','dist/'+id+'/fonts/manrope-latin-wght-normal.woff2');await cp('node_modules/@fontsource-variable/manrope/LICENSE','dist/'+id+'/fonts/LICENSE');}
await mkdir('dist/querysprint/vendor');for(const f of ['sql-wasm.js','sql-wasm.wasm'])await cp('node_modules/sql.js/dist/'+f,'dist/querysprint/vendor/'+f);await cp('node_modules/sql.js/LICENSE','dist/querysprint/vendor/LICENSE');
for(const [id,s] of Object.entries(specs)){for(const f of ['index.html','guide.html','privacy.html']){const text=await readFile('dist/'+id+'/'+f,'utf8');if(!text.includes('https://'+s.host)||!text.includes('<title>'))throw Error('Missing canonical/title '+id+'/'+f);}}
console.log('Built separate product sites and local SQLite runtime.');

const agent='../../agents/tradecheck-mcp/';
await cp(agent+'dist/browser.js','dist/rfqdesk/tradecheck.js');
await cp(agent+'examples/importer-example.json','dist/rfqdesk/agent-example.json');
await cp(agent+'THIRD-PARTY-NOTICES.txt','dist/rfqdesk/tradecheck-NOTICES.txt');
await mkdir('dist/rfqdesk/downloads');
for(const f of ['tradecheck-mcp-0.2.0.tar.gz','SHA256SUMS'])await cp(agent+'release/'+f,'dist/rfqdesk/downloads/'+f);
console.log('Included tested TradeCheck browser engine, example and beta MCP archive.');

await cp("../../agents/filinglens-mcp/src/engine.mjs","dist/filinglens/filing-engine.mjs");
await mkdir("dist/filinglens/downloads");
for(const f of ["filinglens-mcp-0.1.0.tar.gz","SHA256SUMS"])await cp("../../agents/filinglens-mcp/release/"+f,"dist/filinglens/downloads/"+f);
await cp("../../agents/filinglens-mcp/THIRD-PARTY-NOTICES.txt","dist/filinglens/filinglens-NOTICES.txt");
