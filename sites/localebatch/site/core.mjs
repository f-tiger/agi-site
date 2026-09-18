// The same input and output contract runs in the browser and in the Worker.
export const HEADERS = ['Type','Identification','Field','Locale','Market','Status','Default content','Translated content'];
export const LANGUAGES = {de:'German',fr:'French',es:'Spanish',it:'Italian',nl:'Dutch',pt:'Portuguese',ja:'Japanese',ko:'Korean','zh-CN':'Simplified Chinese','zh-TW':'Traditional Chinese'};
export const LIMITS = {bytes:700000,rows:500,characters:100000,perField:500,attempts:2};
export function parseCSV(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > LIMITS.bytes) throw Error('CSV must be smaller than 700 KB.');
  text = text.replace(/^\uFEFF/,'');
  const rows=[]; let row=[], field='', quoted=false, closed=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) { if(c==='"') {if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}} else field+=c; }
    else if(c===',') {row.push(field);field='';closed=false;}
    else if(c==='\r'||c==='\n') {if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field='';closed=false;}
    else if(c==='"'&&!field&&!closed) quoted=true;
    else {if(closed||c==='"')throw Error('Malformed CSV quoting.');field+=c;}
    if(rows.length>LIMITS.rows+1)throw Error('Use a batch of at most 500 content rows.');
  }
  if(quoted)throw Error('Unclosed CSV quote.');
  if(field||row.length||closed){row.push(field);rows.push(row);}
  while(rows.length&&rows.at(-1).every(x=>x===''))rows.pop();
  const headers=rows.shift()||[];
  if(new Set(headers).size!==headers.length||HEADERS.some(h=>!headers.includes(h)))throw Error('Use a Shopify translations export with all eight required columns.');
  if(rows.length<1||rows.length>LIMITS.rows)throw Error('Use 1–500 content rows.');
  return {headers,rows:rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`Row ${i+2} has a different number of columns.`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));})};
}
const dangerousCell = v => /^[\s\uFEFF]*[=+@\-\t\r]/.test(v);
export function serializeCSV(headers,rows,{spreadsheetSafe=false}={}) {
  const cell=v=>{let s=String(v??'');if(spreadsheetSafe&&dangerousCell(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return [headers,...rows.map(r=>headers.map(h=>r[h]??''))].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
}
export function protectedTokens(source,glossary=[]) {
  return [...new Set([...(source.match(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|https?:\/\/[^\s<>]+|\b\d+(?:[.,]\d+)*\b/g)||[]),...glossary.filter(x=>source.includes(x))])];
}
export function validateGlossary(value=[]) {
  if(!Array.isArray(value)||value.length>30||value.some(x=>typeof x!=='string'||!x.trim()||x.length>80))throw Error('Use up to 30 protected terms, each 1–80 characters.');
  return [...new Set(value.map(x=>x.trim()))];
}
export function auditCSV(text,glossary=[]) {
  glossary=validateGlossary(glossary);const doc=parseCSV(text),seen=new Set();let characters=0;
  const entries=doc.rows.map((row,index)=>{
    const key=JSON.stringify(['Type','Identification','Field','Locale','Market'].map(k=>row[k]));
    if(seen.has(key))throw Error(`Duplicate translation key on row ${index+2}.`);seen.add(key);
    if(!row.Type||!row.Identification||!row.Field||!row.Locale)throw Error(`Missing identity on row ${index+2}.`);
    let reason='';const source=row['Default content'];
    if(row['Translated content'])reason='Existing translation kept';
    else if(row.Type.toUpperCase()!=='PRODUCT')reason='Only product text is supported in this pilot';
    else if(!['title','meta_title','meta_description'].includes(row.Field))reason='HTML, policies and other fields are kept unchanged';
    else if(!Object.hasOwn(LANGUAGES,row.Locale))reason='Target language is not supported in this pilot';
    else if(!source.trim())reason='Empty source';
    else if(source.length>LIMITS.perField)reason='Field exceeds 500 characters';
    else if(/<[^>]*>/.test(source))reason='HTML requires a separate workflow';
    else if(dangerousCell(source))reason='Spreadsheet formula-like source requires manual review';
    if(!reason)characters+=source.length;
    return {index,source,locale:row.Locale,field:row.Field,eligible:!reason,reason,protected:protectedTokens(source,glossary)};
  });
  if(characters>LIMITS.characters)throw Error('Use at most 100,000 eligible source characters per batch.');
  return {...doc,entries,glossary,characters,eligible:entries.filter(e=>e.eligible).length,formulaCells:doc.rows.reduce((n,r)=>n+Object.values(r).filter(dangerousCell).length,0)};
}
export function checkTranslation(entry,output) {
  const errors=[];
  if(typeof output!=='string'||!output.trim())return ['Empty translation'];
  if(output.length>1500)errors.push('Translation too long');
  if(/[<>]/.test(output)||dangerousCell(output))errors.push('Unsafe markup or formula-like output');
  for(const token of entry.protected)if(!output.includes(token))errors.push(`Protected text missing: ${token}`);
  const inputNumbers=new Set(entry.source.match(/\b\d+(?:[.,]\d+)*\b/g)||[]);
  if((output.match(/\b\d+(?:[.,]\d+)*\b/g)||[]).some(n=>!inputNumbers.has(n)))errors.push('New numeric claim');
  if(output.trim()===entry.source.trim())errors.push('Unchanged source requires review');
  return errors;
}
export function applyResults(doc,results) {
  const accepted=new Map(results.filter(r=>r.status==='accepted').map(r=>[r.index,r]));
  return doc.rows.map((row,index)=>{
    const r=accepted.get(index),entry=doc.entries[index];
    if(!r||!entry?.eligible||checkTranslation(entry,r.output).length)return {...row};
    return {...row,'Translated content':r.output};
  });
}
