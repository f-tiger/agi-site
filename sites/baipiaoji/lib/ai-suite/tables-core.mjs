// Shared inputs for the local JSON worksheet tools. All cells are scalar.
const text = (key, zh, en, example, maxLength = 12000, multiline = true) =>
  ({key, label:{zh,en}, type:'string', example, maxLength, multiline});
export const number = (key, zh, en, example, min, max, integer = false) =>
  ({key, label:{zh,en}, type:integer ? 'integer' : 'number', example, min, max});
export const label = (key, zh, en, example) => text(key, zh, en, example, 160, false);
export const json = (key, zh, en, value) => text(key, zh, en, JSON.stringify(value));
export const sample = [
  {team:'A', score:2, label:'alpha'}, {team:'B', score:8, label:'beta'},
  {team:'A', score:4, label:'gamma'}, {team:'B', score:12, label:'delta'},
];
export const records = (rows = sample) => json('rows','记录数组（JSON）','Record array (JSON)',rows);
export const column = (value='score') => label('column','列名','Column name',value);
export const group = label('group','分组列','Grouping column','team');
export const vector = (values = [1,2,2,3,6,10]) => json('values','数值数组（JSON）','Number array (JSON)',values);
export const xs = json('x','第一组数值（JSON）','First numeric series (JSON)',[1,2,3,4,5]);
export const ys = json('y','第二组数值（JSON）','Second numeric series (JSON)',[2,3,5,4,6]);
export const fail = message => { throw Error(message); };
export function make(id,zh,en,zhDetail,enDetail,fields,run) {
  return {
    id, title:{zh,en}, description:{zh:zhDetail,en:enDetail},
    inputs:fields.map(({example,...field})=>field),
    example:Object.fromEntries(fields.map(field=>[field.key,field.example])),
    run,
  };
}
export function parse(text) {
  if (typeof text !== 'string' || text.length > 12000) fail('Input must be a JSON string up to 12000 characters.');
  try { return JSON.parse(text); } catch { fail('Enter valid JSON.'); }
}
export function readArray(text, limit=500) {
  const value = parse(text);
  if (!Array.isArray(value) || !value.length || value.length > limit) fail('Enter a nonempty JSON array within the row limit.');
  return value;
}
export function numeric(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value)>1e12) fail('Use finite numbers between -1e12 and 1e12.');
  return value;
}
export function numbers(text,min=1) {
  const values=readArray(text).map(numeric);
  if (values.length<min) fail('Provide more observations for this statistic.');
  return values;
}
export function table(text) {
  const rows = readArray(text,300);
  const columns = new Set();
  for (const row of rows) {
    if (!row || Array.isArray(row) || typeof row !== 'object') fail('Each record must be an object.');
    for (const [name,value] of Object.entries(row)) {
      if (!name.trim() || name.length>80) fail('Use field names of 1 to 80 characters.');
      if (value !== null && !['string','number','boolean'].includes(typeof value)) fail('Use scalar cells only.');
      if (typeof value==='number') numeric(value);
      columns.add(name);
    }
    if (columns.size>32) fail('Use at most 32 columns.');
  }
  if (!columns.size) fail('At least one column is required.');
  return {rows,columns:[...columns]};
}
export function field(data,key) {
  if (!data.columns.includes(key)) fail('A selected column was not found.');
  return key;
}
export const cell = (row,key) => Object.hasOwn(row,key) ? row[key] : null;
export const missing = value => value===null || (typeof value==='string' && !value.trim());
export const sum = values=>values.reduce((a,b)=>a+b,0);
export const average = values=>sum(values)/values.length;
export const sorted = values=>[...values].sort((a,b)=>a-b);
export function quantileAscending(a,p) {
  const k=(a.length-1)*p, i=Math.floor(k);
  return a[i]+(a[Math.min(i+1,a.length-1)]-a[i])*(k-i);
}
export const median = values=>quantileAscending(sorted(values),0.5);
export function variance(a, correction=0) {
  if (a.length<=correction) fail('Not enough observations for this variance.');
  const center=average(a);
  return sum(a.map(x=>(x-center)**2))/(a.length-correction);
}
export function divide(a,b) {
  if (!b) fail('The result is undefined for a zero denominator.');
  return a/b;
}
export function frequency(values) {
  const counts=new Map();
  for (const value of values) counts.set(value,1+(counts.get(value)||0));
  return counts;
}
export function grouped(rows,key) {
  const groups=new Map();
  for (const row of rows) {
    const k=cell(row,key);
    if (!groups.has(k)) groups.set(k,[]);
    groups.get(k).push(row);
  }
  return groups;
}
export function ranks(values) {
  const a=sorted(values), lookup=new Map();
  for (let i=0;i<a.length;) {
    let j=i+1;
    while (j<a.length && a[i]===a[j]) j++;
    lookup.set(a[i],(i+j+1)/2);
    i=j;
  }
  return values.map(value=>lookup.get(value));
}
