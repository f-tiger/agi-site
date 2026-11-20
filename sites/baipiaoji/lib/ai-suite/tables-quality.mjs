import {make,records,column,group,json,label,number,table,field,cell,missing,readArray,numeric,frequency,grouped,fail} from './tables-core.mjs';

function inspect(id,zh,en,zdesc,desc,fields,run,exampleRows) {
  return make('dq-'+id,zh,en,zdesc,desc,[records(exampleRows),...fields],p=>run(table(p.rows),p));
}
function scan(id,zh,en,zdesc,desc,exampleValues,accept) {
  return inspect(id,zh,en,zdesc,desc,[column('value')],(data,p)=>{
    field(data,p.column);
    const failedRows=data.rows.flatMap((row,i)=>accept(cell(row,p.column))?[]:[i+1]);
    return {checked:data.rows.length,passed:data.rows.length-failedRows.length,failedRows};
  },exampleValues.map(value=>({value})));
}
const dateOnly=v=>{
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const time=Date.parse(v+'T00:00:00Z');
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===v;
};
const txt = [' Alpha','beta','AC-12'];
export const qualityTools=[
  scan('required-cells','必填单元格核验','Required cell check','找出字段缺失、空值或仅有空白的行号。','Locate absent, null or whitespace-only cells in a required column.',[0,' ',null,'OK'],v=>!missing(v)),
  scan('numeric-type','数值类型核验','Numeric cell type check','标出实际存成字符串或其他类型的数值列单元格。','Identify cells that are not JSON numbers, including numeric-looking text.',[12,'12',false],v=>typeof v==='number'),
  scan('whole-numbers','整数字段核验','Whole-number field check','找出非整数或非数值的记录，用于检查计数列。','Find noninteger and nonnumeric values in a count column.',[3,0,2.5,'4'],Number.isSafeInteger),
  scan('calendar-dates','日历日期有效性','Calendar date validity','严格核对年月日和闰年，要求四位年、两位月和日。','Validate YYYY-MM-DD values against calendar rollovers and leap days.',['2024-02-29','2025-02-29','2025-12-31'],dateOnly),
  scan('utc-timestamps','规范 UTC 时间戳核验','Canonical UTC timestamp check','核验带秒和 Z 的 UTC 时间戳，可包含三位毫秒。','Check UTC timestamps with seconds, optional three-digit milliseconds and a literal Z.',['2025-06-01T12:00:00Z','2025-02-30T12:00:00Z'],v=>{
    if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?Z$/.test(v))return false;
    return dateOnly(v.slice(0,10));
  }),
  scan('boolean-cells','布尔字段核验','Boolean flag type check','区分原生布尔值与文本布尔值，列出格式错误的行。','Find flags stored as text, numbers or null instead of JSON booleans.',[true,false,'true',1],v=>typeof v==='boolean'),
  scan('two-decimal-money','两位金额精度核验','Two-decimal amount precision check','找出无法按最多两位小数表示的数值或金额文本。','Flag amounts whose plain decimal representation needs more than two fraction digits.',[2,12.34,'4.075'],v=>['number','string'].includes(typeof v)&&/^-?\d+(?:\.\d{1,2})?$/.test(String(v))),
  scan('leading-zero-codes','前导零编号检查','Leading-zero code detection','定位含前导零的纯数字文本，帮助导入表格时保留编号。','Locate digit-only text with leading zeros before spreadsheet import.',['0012','0','BA01','45'],v=>!(typeof v==='string'&&/^0\d+$/.test(v))),
  scan('padding-whitespace','首尾空白检查','Cell padding whitespace check','检查文本的首尾空白，其他标量原样通过。','Flag text cells with leading or trailing whitespace and pass other scalar types.',txt,v=>typeof v!=='string'||v.trim()===v),
  scan('identifier-shape','大写业务编码检查','Uppercase business identifier check','检查大写字母开头、用大写字母或数字及单连字符构成的编号。','Check codes beginning with a capital letter and composed of uppercase alphanumeric segments separated by single hyphens.',txt,v=>typeof v==='string'&&/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/.test(v)),
  scan('web-addresses','网页地址形态核验','Absolute web address validation','检查字段是否为无账号信息的绝对 HTTP 或 HTTPS 地址。','Validate absolute HTTP or HTTPS addresses without embedded credentials.',['https://example.org/a','relative/path'],v=>{
    if(typeof v!=='string'||v.trim()!==v||!/^https?:\/\//i.test(v))return false;
    try{const u=new URL(v);return Boolean(u.hostname&&!u.username&&!u.password);}catch{return false;}
  }),
  scan('email-shape','邮箱字段基本格式','Basic email field shape','用单个 @、非空域名段和无空白要求筛查邮箱格式。','Screen for a single at-sign, a dotted domain and no whitespace in an email address.',['dev@example.org','missing-domain'],v=>typeof v==='string'&&/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(v)),
  scan('unicode-nfc','文本规范化检查','Unicode NFC consistency','列出尚未采用 NFC 规范化表示的文本单元格。','Find text cells whose code-point sequence changes under NFC normalization.',['Cafe\u0301','Beta'],v=>typeof v!=='string'||v===v.normalize('NFC')),
  scan('control-characters','控制字符排查','Control character inspection','定位含 C0、DEL 或 C1 控制字符的文本。','Locate text containing C0, DEL or C1 control characters.',['alpha','a\tb'],v=>typeof v!=='string'||!/[\u0000-\u001f\u007f-\u009f]/u.test(v)),
  inspect('duplicate-key','主键重复记录','Duplicate key occurrences','列出每个出现多次的键及全部对应行号。','Return repeated key values with all associated row numbers.',[column('team')],(d,p)=>{
    const key=field(d,p.column),seen=new Map();d.rows.forEach((r,i)=>{const k=cell(r,key);if(!seen.has(k))seen.set(k,[]);seen.get(k).push(i+1);});
    return {duplicates:[...seen].filter(([,v])=>v.length>1).map(([value,rows])=>({value,rows}))};
  }),
  inspect('duplicate-rows','完整重复行定位','Exact duplicate row locations','按全部列比较，标记每个重复行及其首次出现的位置，区分缺失和空值。','Match complete records by column and point repeated rows to their first occurrence, distinguishing missing from null.',[],d=>{
    const seen=new Map(),duplicates=[];
    d.rows.forEach((r,i)=>{const k=JSON.stringify(d.columns.map(c=>Object.hasOwn(r,c)?[r[c]]:[]));if(seen.has(k))duplicates.push({row:i+1,first:seen.get(k)});else seen.set(k,i+1);});
    return {duplicates};
  },[{a:1,b:'x'},{b:'x',a:1},{a:1}]),
  inspect('mixed-types','逐列类型一致性','Mixed column type detection','按字段统计非空值类型，标出混合类型的列。','Count present scalar types per field and flag columns containing multiple types.',[],d=>({columns:d.columns.map(column=>{
    const types=Object.fromEntries(frequency(d.rows.map(r=>cell(r,column)).filter(v=>v!==null).map(v=>typeof v)));
    return {column,types,mixed:Object.keys(types).length>1};
  })}),[{a:1,b:true},{a:'2',b:false}]),
  inspect('sparse-rows','逐行缺失率','Row completeness profile','对每一行列出缺失字段和已填写字段所占比例。','For every row report missing columns and the fraction of fields filled in.',[],d=>({rows:d.rows.map((r,i)=>{
    const blanks=d.columns.filter(c=>missing(cell(r,c)));return {row:i+1,missing:blanks,filledFraction:1-blanks.length/d.columns.length};
  })}),[{a:1,b:null},{a:0,b:'x'}]),
  inspect('numeric-range','数值区间约束','Inclusive numeric range validation','标出数值不在给定闭区间内或类型错误的行。','Flag nonnumeric cells and numbers outside the inclusive user-defined interval.',[column(),number('minimum','下限','Minimum',3,-1e12,1e12),number('maximum','上限','Maximum',10,-1e12,1e12)],(d,p)=>{
    const k=field(d,p.column);if(p.minimum>p.maximum)fail('Minimum must not exceed maximum.');
    return {failedRows:d.rows.flatMap((r,i)=>{const v=cell(r,k);return typeof v==='number'&&v>=p.minimum&&v<=p.maximum?[]:[i+1];})};
  }),
  inspect('allowed-values','枚举值约束','Allowed-value membership check','按 JSON 标量精确匹配允许清单并报告越界值。','Check typed scalar membership against an explicit JSON allowlist.',[column('team'),json('allowed','允许的标量数组','Allowed scalar values',['A','C'])],(d,p)=>{
    const k=field(d,p.column),allowed=new Set(readArray(p.allowed));
    if([...allowed].some(v=>v!==null&&typeof v==='object'))fail('Use scalar allowed values.');
    return {invalid:d.rows.flatMap((r,i)=>{const value=cell(r,k);return allowed.has(value)?[]:[{row:i+1,value}];})};
  }),
  inspect('ascending-order','升序断点定位','Ascending order breakpoints','对数值列找出比上一行更小的位置，允许相等。','Locate decreases in a numeric column expected to be nondecreasing.',[column()],(d,p)=>{
    const k=field(d,p.column),values=d.rows.map(r=>numeric(cell(r,k)));
    return {breaks:values.flatMap((value,i)=>i&&value<values[i-1]?[{row:i+1,value,previous:values[i-1]}]:[])};
  }),
  inspect('maximum-text-length','字段长度上限核验','Maximum field length check','按 Unicode 码点数检查文本长度上限，同时报告非文本行。','Enforce a Unicode code-point limit for text cells and report nontext rows.',[column('label'),number('limit','码点上限','Maximum code points',4,0,12000,true)],(d,p)=>{
    const k=field(d,p.column);return {failedRows:d.rows.flatMap((r,i)=>{const s=cell(r,k);return typeof s==='string'&&[...s].length<=p.limit?[]:[i+1];})};
  }),
  inspect('column-contract','列名契约核对','Expected column inventory','比较实际表字段和期望字段清单，返回缺失与意外列。','Compare observed fields against a requested schema and list missing and unexpected columns.',[json('expected','期望列名数组','Expected column names',['team','score','status'])],(d,p)=>{
    const wanted=readArray(p.expected,32);if(wanted.some(k=>typeof k!=='string'||!k)||new Set(wanted).size!==wanted.length)fail('Expected columns must be unique nonempty strings.');
    return {missing:wanted.filter(k=>!d.columns.includes(k)),unexpected:d.columns.filter(k=>!wanted.includes(k))};
  }),
  inspect('functional-dependency','字段依赖冲突','Functional dependency conflicts','检查同一分组键是否映射到多个不同的目标值。','Find source keys mapped to multiple distinct values in a dependent column.',[group,column('label')],(d,p)=>{
    field(d,p.group);field(d,p.column);
    return {conflicts:[...grouped(d.rows,p.group)].flatMap(([key,rows])=>{const values=[...new Set(rows.map(r=>cell(r,p.column)))];return values.length>1?[{key,values}]:[];})};
  }),
];
