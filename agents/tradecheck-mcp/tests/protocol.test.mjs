import test from 'node:test';import assert from 'node:assert/strict';import {Client} from '@modelcontextprotocol/client';import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
test('real stdio client discovers schema, reviews example, paginates, drafts and rejects malformed calls',async()=>{
 const client=new Client({name:'tradecheck-contract-test',version:'1.0.0'});const transport=new StdioClientTransport({command:process.execPath,args:['dist/server.js'],stderr:'pipe'});
 try{await client.connect(transport);const listed=await client.listTools();assert.deepEqual(listed.tools.map(x=>x.name).sort(),['tradecheck_example','tradecheck_import_tables','tradecheck_reconcile','tradecheck_supplier_draft']);for(const t of listed.tools){assert.equal(t.annotations.readOnlyHint,true);assert.equal(t.annotations.openWorldHint,false);}
 const sample=await client.callTool({name:'tradecheck_example',arguments:{}});assert.ok(!sample.isError);const data=sample.structuredContent.data;
 const review=await client.callTool({name:'tradecheck_reconcile',arguments:{data,limit:1}});assert.ok(!review.isError);assert.equal(review.structuredContent.report.summary.price_variance,'44.00');assert.equal(review.structuredContent.findings_total,2);assert.equal(review.structuredContent.next_offset,1);
 const second=await client.callTool({name:'tradecheck_reconcile',arguments:{data,offset:1,limit:1}});assert.equal(second.structuredContent.report.findings[0].code,'QUANTITY_OVER_ORDER');assert.equal(second.structuredContent.next_offset,null);
 const draft=await client.callTool({name:'tradecheck_supplier_draft',arguments:{data,language:'zh'}});assert.equal(draft.structuredContent.sent,false);assert.match(draft.structuredContent.subject,/请核对/);
 const invalid=await client.callTool({name:'tradecheck_reconcile',arguments:{data:{...data,extraction_reviewed:'yes'}}});assert.equal(invalid.isError,true);
 const resources=await client.readResource({uri:'tradecheck://contract'});assert.match(resources.contents[0].text,/two-way|Two-way/);
 const prompt=await client.getPrompt({name:'review_supplier_invoice',arguments:{}});assert.match(prompt.messages[0].content.text,/untrusted data/);
 }finally{await client.close();}
});
