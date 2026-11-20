import {make,records,column,group,json,label,number,table,parse,field,cell,missing,readArray,numeric,frequency,grouped,average,median,variance,quantileAscending,sorted,sum,fail} from './tables-core.mjs';

const columnsInput=json('columns','列名数组（JSON）','Column names (JSON)',['team','score']);
const destination=label('target','新列名','New column name','result');
function keys(data,text) {
  const keys=readArray(text,32);
  if(keys.some(k=>typeof k!=='string')||new Set(keys).size!==keys.length)fail('Use distinct column names.');
  return keys.map(k=>field(data,k));
}
function mapping(text) {
  const value=parse(text);
  if(!value||Array.isArray(value)||typeof value!=='object')fail('Use a JSON object mapping.');
  return table(JSON.stringify([value])).rows[0];
}
function free(data,name) {
  if(!name.trim()||name.length>80||data.columns.includes(name))fail('Use an unused column name of 1 to 80 characters.');
  return name;
}
function rowsTool(id,zh,en,zdesc,desc,extra,fn,rows) {
  return make('table-'+id,zh,en,zdesc,desc,[records(rows),...extra],p=>fn(table(p.rows),p));
}
function fill(d,k,backward) {
  let last=null;const records=[...d.rows];if(backward)records.reverse();
  const out=records.map(r=>{const v=cell(r,k);if(!missing(v))last=v;return missing(v)&&last!==null?{...r,[k]:last}:r;});
  return {rows:backward?out.reverse():out};
}
const gaps=[{score:null},{score:4},{score:null},{score:8},{score:null}];

export const shapeTools=[
  rowsTool('column-arrays','记录转列向量','Record array to column vectors','按字段生成等长列数组，缺失字段填空值。','Convert a collection of records to aligned column arrays, filling absent cells with null.',[],d=>({columns:Object.fromEntries(d.columns.map(k=>[k,d.rows.map(r=>cell(r,k))]))})),
  rowsTool('unpivot','宽表测量列转长表','Unpivot measurement columns','保留来源行号，将选定的测量列展开为字段和值。','Expand selected measurement columns into field-value rows with one-based source row numbers.',[columnsInput],(d,p)=>{
    const c=keys(d,p.columns);if(c.length*d.rows.length>2000)fail('Unpivot would exceed 2000 records.');
    return {rows:d.rows.flatMap((r,i)=>c.map(field=>({row:i+1,field,value:cell(r,field)})))};
  }),
  rowsTool('pivot-sums','分组交叉求和透视','Two-dimensional sum pivot','按两个分类字段汇总数值，补齐缺少组合的零值。','Sum a numeric measure across two categorical dimensions and fill unobserved combinations with zero.',[group,label('across','横轴列','Across column','label'),column()],(d,p)=>{
    field(d,p.group);field(d,p.across);field(d,p.column);const columns=[...new Set(d.rows.map(r=>cell(r,p.across)))];
    const g=grouped(d.rows,p.group);if(g.size*columns.length>5000)fail('Pivot exceeds 5000 cells.');
    return {columns,rows:[...g].map(([key,rows])=>{const sums=new Map();for(const r of rows){const c=cell(r,p.across);sums.set(c,(sums.get(c)||0)+numeric(cell(r,p.column)));}return {key,values:columns.map(c=>sums.get(c)||0)};})};
  }),
  rowsTool('project','字段选择与重排','Project and reorder fields','按输入列名次序输出每行，只保留选中字段。','Keep requested columns in the requested order and return each row as an ordered value array.',[columnsInput],(d,p)=>{const columns=keys(d,p.columns);return {columns,rows:d.rows.map(r=>columns.map(k=>cell(r,k)))};}),
  rowsTool('rename','字段批量更名','Rename worksheet columns','根据旧名到新名的映射整体更名并检查列名冲突。','Apply a rename map in one pass and reject duplicate resulting field names.',[json('mapping','旧名到新名映射','Old to new name map',{score:'points'})],(d,p)=>{
    const map=mapping(p.mapping);for(const [k,v] of Object.entries(map)){field(d,k);if(typeof v!=='string'||!v.trim()||v.length>80)fail('New names must be strings of 1 to 80 characters.');}
    const rename=k=>Object.hasOwn(map,k)?map[k]:k;
    if(new Set(d.columns.map(rename)).size!==d.columns.length)fail('Renamed columns must remain unique.');
    return {rows:d.rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[rename(k),v])))};
  }),
  rowsTool('coalesce','首个非空字段合并','Coalesce alternative fields','依次读取候选列，将首个已填写值写到新列。','Select the first nonblank cell across ordered fallback columns into a new field.',[columnsInput,destination],(d,p)=>{
    const c=keys(d,p.columns),k=free(d,p.target);return {rows:d.rows.map(r=>({...r,[k]:c.map(f=>cell(r,f)).find(v=>!missing(v))??null}))};
  }),
  rowsTool('forward-fill','向下填充空值','Forward fill missing cells','沿输入顺序用上一个已知值填空，保留开头缺口。','Fill gaps with the most recent nonblank value and preserve leading gaps.',[column()],(d,p)=>fill(d,field(d,p.column),false),gaps),
  rowsTool('backward-fill','向上填充空值','Backward fill missing cells','沿输入顺序用下一个已知值填空，保留末尾缺口。','Fill gaps with the next nonblank value and preserve trailing gaps.',[column()],(d,p)=>fill(d,field(d,p.column),true),gaps),
  rowsTool('complete-cases','选定列完整记录','Complete-case record selection','保留在所有指定字段中均有值的记录，统计排除行数。','Keep rows complete across selected fields and report the number omitted.',[columnsInput],(d,p)=>{
    const c=keys(d,p.columns),rows=d.rows.filter(r=>c.every(k=>!missing(cell(r,k))));return {rows,omitted:d.rows.length-rows.length};
  },[{team:'A',score:0},{team:'B',score:null}]),
  rowsTool('explode-delimited','分隔字段展开成行','Expand delimited field to rows','按字面分隔符拆开指定文本列，将其余列复制至各子行。','Split a text field on a literal delimiter and copy remaining fields into each child row.',[column('label'),label('delimiter','分隔符','Literal delimiter','|')],(d,p)=>{
    field(d,p.column);if(!p.delimiter)fail('Enter a delimiter.');const rows=[];
    for(const row of d.rows){const v=cell(row,p.column);if(typeof v!=='string')fail('Selected column must contain text.');for(const part of v.split(p.delimiter)){rows.push({...row,[p.column]:part.trim()});if(rows.length>1000)fail('Expansion exceeds 1000 rows.');}}
    return {rows};
  },[{id:1,label:'red|blue'},{id:2,label:'green'}]),
  rowsTool('combine-fields','组合多列文本','Combine field text','按指定次序用分隔符拼接字段，生成新的显示列。','Combine selected fields in order into a new display field with a literal separator.',[columnsInput,label('separator','连接符','Separator',' / '),destination],(d,p)=>{
    const c=keys(d,p.columns),k=free(d,p.target);return {rows:d.rows.map(r=>({...r,[k]:c.map(f=>String(cell(r,f)??'')).join(p.separator)}))};
  }),
  rowsTool('row-numbers','添加连续行号','Add consecutive row numbers','从给定正整数开始向每条记录写入连续行号。','Add a new ordinal field beginning at a specified positive row number.',[destination,number('start','起始行号','Starting number',1,1,10000000,true)],(d,p)=>{
    const k=free(d,p.target);return {rows:d.rows.map((r,i)=>({...r,[k]:p.start+i}))};
  }),
  rowsTool('slice','截取连续行段','Slice a worksheet row range','用一基起始行和最大行数截取连续记录。','Return consecutive records using a one-based start and maximum row count.',[number('start','起始行','Starting row',2,1,300,true),number('count','行数','Row count',2,1,300,true)],(d,p)=>({rows:d.rows.slice(p.start-1,p.start-1+p.count)})),
  rowsTool('interleave','奇偶行拆分','Separate alternating worksheet rows','按一基行号的奇偶性将记录分成两份。','Separate records into two ordered collections based on odd and even row numbers.',[],d=>({odd:d.rows.filter((_,i)=>i%2===0),even:d.rows.filter((_,i)=>i%2===1)})),
  rowsTool('batches','分批拆分记录','Batch records by row count','把输入表拆为定长批次，最后一批允许较短。','Partition input records into fixed-size batches, retaining a shorter final batch.',[number('size','每批行数','Rows per batch',3,1,300,true)],(d,p)=>({batches:Array.from({length:Math.ceil(d.rows.length/p.size)},(_,i)=>d.rows.slice(i*p.size,(i+1)*p.size))})),
  rowsTool('dedupe-by-key','按组合键保留首行','Keep first row per composite key','按多个键值组合去重，保留源表中的首次记录。','Keep the first record for each composite key, preserving source order.',[json('columns','组合键列名','Composite key fields',['team'])],(d,p)=>{
    const c=keys(d,p.columns),seen=new Set();const rows=d.rows.filter(r=>{const k=JSON.stringify(c.map(f=>cell(r,f)));if(seen.has(k))return false;seen.add(k);return true;});return {rows,removed:d.rows.length-rows.length};
  }),
  rowsTool('numeric-sort','数值列稳定排序','Stable numeric column sort','按输入数值列升序排列，各并列值保持源顺序。','Sort records by a numeric column in ascending order, preserving ties.',[column()],(d,p)=>{
    const k=field(d,p.column);const rows=d.rows.map(row=>({row,v:numeric(cell(row,k))}));rows.sort((a,b)=>a.v-b.v);return {rows:rows.map(x=>x.row)};
  }),
  rowsTool('top-with-ties','保留前列及并列项','Top records including cutoff ties','按数值降序保留前若干行，以及与最后一行并列的记录。','Keep the largest requested number of rows and any additional ties at the cutoff.',[column(),number('n','前几行','Requested rows',2,1,300,true)],(d,p)=>{
    const k=field(d,p.column),ordered=d.rows.map(row=>({row,v:numeric(cell(row,k))})).sort((a,b)=>b.v-a.v),cut=ordered[Math.min(p.n,ordered.length)-1].v;
    return {cutoff:cut,rows:ordered.filter(o=>o.v>=cut).map(o=>o.row)};
  }),
  rowsTool('constant-columns','移除常量列','Remove constant columns','删除所有行都取同一标量值的字段，返回移除清单。','Drop fields with an identical scalar value across all records and list removed columns.',[],d=>{
    const removed=d.columns.filter(k=>new Set(d.rows.map(r=>cell(r,k))).size===1);return {removed,rows:d.rows.map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!removed.includes(k))))};
  },[{unit:'kg',score:1},{unit:'kg',score:3}]),
  rowsTool('linear-gap-fill','内部空值线性插值','Interpolate interior numeric gaps','按等距行号在线性端点间插补内部空缺，保留端点外缺失值。','Interpolate missing numeric cells between observed rows at equal spacing, leaving exterior gaps untouched.',[column()],(d,p)=>{
    const k=field(d,p.column),values=d.rows.map(r=>missing(cell(r,k))?null:numeric(cell(r,k)));let left=-1;
    for(let i=0;i<values.length;i++){if(values[i]===null)continue;if(left>=0)for(let j=left+1;j<i;j++)values[j]=values[left]+(values[i]-values[left])*(j-left)/(i-left);left=i;}
    return {rows:d.rows.map((r,i)=>({...r,[k]:values[i]}))};
  },gaps),
  rowsTool('lookup-recode','分类码映射重编码','Recode categorical labels','按文本键映射指定列，未命中的值保持原样，并统计命中数。','Apply a text-keyed recoding map, retain unmatched cells and count matches.',[column('team'),json('mapping','文本键值映射','Text key mapping',{A:'North',B:'South'})],(d,p)=>{
    const k=field(d,p.column),map=mapping(p.mapping);let matched=0;
    const rows=d.rows.map(r=>{const v=cell(r,k);if(typeof v!=='string'||!Object.hasOwn(map,v))return r;matched++;return {...r,[k]:map[v]};});return {rows,matched};
  }),
  rowsTool('bin-numbers','按自定边界分箱','Bin a numeric field by cut points','用严格递增的切点划分区间，等于切点时进入较高编号的箱。','Assign zero-based interval indices using strictly increasing cuts, placing ties in the higher bin.',[column(),json('cuts','递增切点数组','Ascending cut points',[3,8]),destination],(d,p)=>{
    const k=field(d,p.column),out=free(d,p.target),cuts=readArray(p.cuts,64).map(numeric);if(cuts.some((x,i)=>i&&x<=cuts[i-1]))fail('Cut points must increase strictly.');
    return {cuts,rows:d.rows.map(r=>{const x=numeric(cell(r,k));return {...r,[out]:cuts.filter(c=>x>=c).length};})};
  }),
  rowsTool('difference-column','两列差值计算','Subtract aligned numeric fields','创建第一列减第二列的逐行差值列。','Create a new field with the rowwise difference of two numeric columns.',[column('actual'),label('subtract','减数列','Subtrahend column','plan'),destination],(d,p)=>{
    const a=field(d,p.column),b=field(d,p.subtract),out=free(d,p.target);return {rows:d.rows.map(r=>({...r,[out]:numeric(cell(r,a))-numeric(cell(r,b))}))};
  },[{actual:12,plan:10},{actual:8,plan:9}]),
  rowsTool('boolean-indicators','类别独热指示矩阵','One-hot category indicators','把类别编码为独立的二进制列，按首次出现次序返回列标签。','Encode categories as binary columns and return the labels in first-seen order.',[column('team')],(d,p)=>{
    const k=field(d,p.column),values=d.rows.map(r=>cell(r,k)),labels=[...new Set(values)];if(labels.length*values.length>5000)fail('Indicator grid exceeds 5000 cells.');
    return {labels,rows:values.map(v=>labels.map(x=>Number(x===v)))};
  }),
];

function groupedTool(id,zh,en,zdesc,desc,fn) {
  return rowsTool('group-'+id,zh,en,zdesc,desc,[group,column()],(d,p)=>{
    const g=field(d,p.group),k=field(d,p.column);
    return {groups:[...grouped(d.rows,g)].map(([key,rows])=>({key,result:fn(rows.map(r=>cell(r,k)))}))};
  });
}
const numericValues=a=>a.map(numeric);
export const groupTools=[
  groupedTool('total','分组数值合计','Numeric totals by group','在每个组内累加指定数值列。','Sum a numeric measure independently within each distinct group.',a=>sum(numericValues(a))),
  groupedTool('mean','分组平均值','Arithmetic means by group','按类别对数值列取算术平均，同时保留每组样本数。','Return the count and arithmetic mean of the measure within each category.',a=>({count:a.length,mean:average(numericValues(a))})),
  groupedTool('median','分组中位数','Group medians','按类别排序测量值并计算各组中位数。','Compute the median measurement independently in each category.',a=>median(numericValues(a))),
  groupedTool('extent','分组极差与界限','Group ranges and bounds','按组返回最低测量值、最高测量值和跨度。','Return the minimum, maximum and range for each group.',a=>{const v=numericValues(a),min=Math.min(...v),max=Math.max(...v);return {min,max,range:max-min};}),
  groupedTool('dispersion','分组样本标准差','Sample spread by group','返回每组的样本标准差，单行组返回空值。','Estimate within-group sample standard deviations, returning null for singleton groups.',a=>{const v=numericValues(a);return v.length===1?null:Math.sqrt(variance(v,1));}),
  groupedTool('quartiles','分组箱线图摘要','Box plot summaries by group','为每组生成最小值、线性四分位数、中位数和最大值。','Produce the five-number summary for each group using interpolated quartiles.',a=>{const v=sorted(numericValues(a));return {min:v[0],q1:quantileAscending(v,.25),median:quantileAscending(v,.5),q3:quantileAscending(v,.75),max:v.at(-1)};}),
  groupedTool('cardinality','分组类别基数','Distinct values per group','返回组内不同标量值的数量和首次出现清单。','Count distinct scalar values in each group and list them in first-seen order.',a=>{const values=[...new Set(a)];return {count:values.length,values};}),
  groupedTool('presence','分组字段覆盖率','Field coverage by group','统计每组中已填写和空白字段，计算覆盖率。','Count present and missing target values and compute within-group coverage.',a=>{const present=a.filter(x=>!missing(x)).length;return {present,missing:a.length-present,coverage:present/a.length};}),
  groupedTool('mode','分组最常见值','Most frequent values by group','找出各组最高频的值并保留并列结果。','Retain all tied most frequent target values within each group.',a=>{const counts=frequency(a),max=Math.max(...counts.values());return {count:max,values:[...counts].filter(([,n])=>n===max).map(([v])=>v)};}),
  groupedTool('boundaries','分组首末记录值','First and last values per group','保留原始行序，取各组的首值和末值。','Return the first and last observed target value in original record order for each key.',a=>({first:a[0],last:a.at(-1)})),
  groupedTool('running-total','分组内运行总计','Running totals within groups','按同组记录的原始顺序累计数值，适合查看分组余额轨迹。','Accumulate a numeric measure in original row order separately for each category.',a=>{let total=0;return numericValues(a).map(x=>total+=x);}),
  groupedTool('value-frequency','分组取值频数表','Value frequency tables by group','对每组生成目标值及频数列表。','Build a frequency table for target values separately inside every group.',a=>[...frequency(a)].map(([value,count])=>({value,count}))),
  groupedTool('successive-change','组内相邻差额','Successive changes within groups','对同组相邻记录计算数值差额，首个位置留空。','Subtract the previous target value within each group, leaving its first position null.',a=>{const v=numericValues(a);return v.map((x,i)=>i?x-v[i-1]:null);}),
  groupedTool('demean','剔除组内均值','Subtract within-group means','从各行的观测值中减去所属组的均值，保留组内偏离。','Remove each category mean to show within-group deviations from the group average.',a=>{const v=numericValues(a),m=average(v);return v.map(x=>x-m);}),
  groupedTool('percent-of-total','分组内数值占比','Value shares within groups','在各个非负数据组内将数值除以组总量，零总量组返回空值。','Compute each nonnegative observation’s fraction of its group total, returning null shares for zero-total groups.',a=>{const v=numericValues(a);if(v.some(x=>x<0))fail('Shares require nonnegative observations.');const t=sum(v);return v.map(x=>t?x/t:null);}),
  groupedTool('threshold-median-split','组内中位数分层','Within-group median bands','以各组自己的中位数为基准，将每条记录分成低于、等于或高于三档。','Label each measurement as below, at or above its own category median.',a=>{const v=numericValues(a),m=median(v);return v.map(x=>x<m?'below':x>m?'above':'at');}),
];
