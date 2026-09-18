import {Client} from '@modelcontextprotocol/client';import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
const client=new Client({name:'tradecheck-demo',version:'0.1.0'});
try{await client.connect(new StdioClientTransport({command:process.execPath,args:['dist/server.js']}));const example=await client.callTool({name:'tradecheck_example',arguments:{}});const r=await client.callTool({name:'tradecheck_reconcile',arguments:{data:example.structuredContent.data}});console.log(JSON.stringify(r.structuredContent,null,2));}finally{await client.close();}
