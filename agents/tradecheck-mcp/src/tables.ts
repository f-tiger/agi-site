import * as z from 'zod/v4';
import {auditSchema} from './schema.js';
const fields={po:['line_id','sku','uom','quantity','unit_price'],invoice:['line_id','po_line_id','sku','uom','quantity','unit_price','line_total']} as const;
const aliases:Record<string,string[]>={line_id:['lineid','line','linenumber'],po_line_id:['polineid','poline','purchaseorderline'],sku:['sku','item','itemcode','productcode'],uom:['uom','unit','unitofmeasure'],quantity:['quantity','qty'],unit_price:['unitprice','price'],line_total:['linetotal','amount','total']};
const key=(v:string)=>v.toLowerCase().replace(/[\s_-]/g,'');
export function parseTable(text:string){
 if(text.length>250000)throw Error('Each table is limited to 250,000 characters.');
 const first=text.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0]!;
 const delimiter=first.includes('\t')?'\t':',';
 const rows:{cells:string[],row:number}[]=[];let cells:string[]=[],cell='',quoted=false,closed=false,line=1,start=1;
 const field=()=>{cells.push(cell.trim());cell='';closed=false;};
 const record=()=>{field();if(cells.some(Boolean))rows.push({cells,row:start});cells=[];start=line+1;};
 text=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
 for(let i=0;i<text.length;i++){const c=text[i]!;if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else{cell+=c;if(c==='\n')line++;}}else if(c==='"'){if(cell||closed)throw Error(`Unexpected quote at source row ${line}.`);quoted=true;}else if(c===delimiter){field();}else if(c==='\n'){record();line++;}else{if(closed&&!/\s/.test(c))throw Error(`Unexpected text after a quote at row ${line}.`);cell+=c;}if(cells.length>30||rows.length>101)throw Error('Use at most 30 columns and 100 data rows.');}
 if(quoted)throw Error('Unclosed quoted field.');if(cell||cells.length||closed)record();
 if(rows.length<2)throw Error('Paste a header row and at least one data row.');
 const headers=rows.shift()!.cells;if(headers.length>30||rows.length>100)throw Error('Use at most 30 columns and 100 data rows.');
 if(headers.some(h=>!h)||new Set(headers.map(key)).size!==headers.length)throw Error('Column names must be non-empty and unique.');
 for(const r of rows)if(r.cells.length!==headers.length)throw Error(`Row ${r.row} has ${r.cells.length} cells; the header has ${headers.length}. Use quoted CSV or tab-separated cells.`);
 return {headers,rows,delimiter:delimiter==='\t'?'tab':'comma'};
}
export function suggestColumns(headers:string[],kind:'po'|'invoice'){
 return Object.fromEntries(fields[kind].map(f=>{const matches=headers.map((h,i)=>aliases[f]!.includes(key(h))?i:-1).filter(i=>i>=0);return [f,matches.length===1?matches[0]:null];}));
}
const tableSchema=z.strictObject({text:z.string().min(1).max(250000),source_name:z.string().trim().min(1).max(70).regex(/^[^\x00-\x1f\x7f]+$/),columns:z.record(z.string(),z.number().int().min(0).max(29))});
export const tableImportSchema=z.strictObject({po:auditSchema.shape.po.omit({lines:true}),invoice:auditSchema.shape.invoice.omit({lines:true}),po_table:tableSchema,invoice_table:tableSchema});
export function importTables(raw:unknown){
 const d=tableImportSchema.parse(raw);
 function lines(t:z.infer<typeof tableSchema>,kind:'po'|'invoice'){
  const parsed=parseTable(t.text),required=fields[kind];
  if(Object.keys(t.columns).length!==required.length||required.some(f=>!(f in t.columns)||t.columns[f]!>=parsed.headers.length)||Object.keys(t.columns).some(f=>!(required as readonly string[]).includes(f)))throw Error(`Map every ${kind} field exactly once to an existing column.`);
  if(new Set(Object.values(t.columns)).size!==required.length)throw Error('Use a separate column for each field. Add an explicit PO line column to the invoice if needed.');
  return parsed.rows.map(r=>({...Object.fromEntries(required.map(f=>[f,r.cells[t.columns[f]!]])),source_ref:`${t.source_name}: row ${r.row}`}));
 }
 return auditSchema.parse({po:{...d.po,lines:lines(d.po_table,'po')},invoice:{...d.invoice,lines:lines(d.invoice_table,'invoice')},prior_invoices:[],history_status:'unknown',extraction_reviewed:false});
}
export const tableFields=fields;
