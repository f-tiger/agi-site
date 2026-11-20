import {make,json,label,table,field,cell,grouped,fail,missing} from './tables-core.mjs';
const left=json('left','左表记录（JSON）','Left records (JSON)',[{key:'A',qty:2},{key:'B',qty:4},{key:'B',qty:6}]);
const right=json('right','右表记录（JSON）','Right records (JSON)',[{key:'B',tag:'blue'},{key:'C',tag:'red'}]);
const lk=label('leftKey','左表键列','Left key column','key');
const rk=label('rightKey','右表键列','Right key column','key');
function build(id,zh,en,zdesc,desc,fn) {
  return make('relation-'+id,zh,en,zdesc,desc,[left,right,lk,rk],p=>{
    const l=table(p.left),r=table(p.right),a=field(l,p.leftKey),b=field(r,p.rightKey);
    // Missing or blank keys do not participate in a match.
    const active=(rows,k)=>grouped(rows.filter(row=>!missing(cell(row,k))),k);
    const gl=active(l.rows,a),gr=active(r.rows,b);
    return fn(l,r,a,b,gl,gr);
  });
}
function joins(l,r,a,b,gl,gr,keepLeft,keepRight) {
  const out=[];
  for(const row of l.rows) {
    const matches=gr.get(cell(row,a))||[];
    if(!matches.length&&keepLeft)out.push({left:row,right:null});
    for(const v of matches){out.push({left:row,right:v});if(out.length>1000)fail('Join would exceed 1000 rows.');}
  }
  if(keepRight)for(const row of r.rows)if(!gl.has(cell(row,b)))out.push({left:null,right:row});
  if(out.length>1000)fail('Join would exceed 1000 rows.');
  return {rows:out};
}
export const relationTools=[
  build('inner-join','两表内连接','Inner join of two record sets','输出键相等的左右记录对，重复键保留全部组合。','Return matching left-right record pairs and retain every duplicate-key combination.',(l,r,a,b,gl,gr)=>joins(l,r,a,b,gl,gr,false,false)),
  build('left-join','左表保留连接','Left outer join','为每条左表记录连接匹配项，无匹配时把右侧标为空。','Keep every left record, inserting a null right record for unmatched keys.',(l,r,a,b,gl,gr)=>joins(l,r,a,b,gl,gr,true,false)),
  build('full-join','双侧保留外连接','Full outer join','连接匹配键，同时保留任一侧缺少匹配的行。','Include matched pairs and unmatched records from both input tables.',(l,r,a,b,gl,gr)=>joins(l,r,a,b,gl,gr,true,true)),
  build('semi-join','保留有匹配的左表记录','Left semi join','只保留在右表找到键的左侧记录，每条源行最多输出一次。','Retain left records whose keys occur on the right without multiplying rows.',(l,r,a,b,gl,gr)=>({rows:l.rows.filter(row=>gr.has(cell(row,a)))})),
  build('anti-join','找出右表缺失的左记录','Left anti join','返回键未出现在右表中的左侧完整记录。','Locate left-hand records without a matching right-hand key.',(l,r,a,b,gl,gr)=>({rows:l.rows.filter(row=>!gr.has(cell(row,a)))})),
  build('key-overlap','双表键域覆盖率','Key domain coverage','给出两张表键域交集、单侧键和两侧覆盖比例。','List shared and side-only nonblank keys and calculate coverage for both key domains.',(l,r,a,b,gl,gr)=>{
    const shared=[...gl.keys()].filter(k=>gr.has(k));
    return {shared,leftOnly:[...gl.keys()].filter(k=>!gr.has(k)),rightOnly:[...gr.keys()].filter(k=>!gl.has(k)),leftCoverage:gl.size?shared.length/gl.size:null,rightCoverage:gr.size?shared.length/gr.size:null};
  }),
  build('cardinality','关联基数判定','Join cardinality classification','检查有效键是否在任一侧重复，判定一对一、一对多等关系。','Classify nonblank key multiplicity on both sides as one-to-one, many-to-one, one-to-many or many-to-many.',(l,r,a,b,gl,gr)=>{
    const dup=g=>[...g].filter(([,rows])=>rows.length>1).map(([key])=>key),ld=dup(gl),rd=dup(gr);
    return {cardinality:(ld.length?'many':'one')+'-to-'+(rd.length?'many':'one'),leftDuplicateKeys:ld,rightDuplicateKeys:rd};
  }),
  build('join-size','连接结果行数预估','Estimate join output size','根据键的出现次数预测内连接、左连接和全连接的输出行数。','Estimate inner, left outer and full outer sizes from key frequencies without materializing the join.',(l,r,a,b,gl,gr)=>{
    let inner=0,leftUnmatched=0,rightUnmatched=0;
    for(const [k,rows] of gl)inner+=rows.length*(gr.get(k)?.length||0);
    for(const row of l.rows)if(!gr.has(cell(row,a)))leftUnmatched++;
    for(const row of r.rows)if(!gl.has(cell(row,b)))rightUnmatched++;
    return {inner,leftOuter:inner+leftUnmatched,fullOuter:inner+leftUnmatched+rightUnmatched};
  }),
  build('foreign-key','外键完整性核查','Foreign key integrity report','统计缺失外键和无法引用右表的左表行，分别报告行号。','Report missing foreign keys separately from nonblank keys without a referenced record.',(l,r,a,b,gl,gr)=>{
    const missingRows=[],orphanRows=[];l.rows.forEach((row,i)=>{const k=cell(row,a);if(missing(k))missingRows.push(i+1);else if(!gr.has(k))orphanRows.push({row:i+1,key:k});});
    return {missingRows,orphanRows};
  }),
  build('match-count','查找键匹配次数','Lookup match counts per row','为每个左表行返回右表匹配项数量，定位一对多展开。','Count matching right-hand rows for each left record to locate one-to-many expansion.',(l,r,a,b,gl,gr)=>({matches:l.rows.map((row,i)=>({row:i+1,key:cell(row,a),count:gr.get(cell(row,a))?.length||0}))})),
  build('nested-groups','一对多子记录嵌套','Nest child records by parent key','把匹配的右表记录收集到各个左表行下方。','Collect matching right-hand child records into arrays associated with each left-hand parent.',(l,r,a,b,gl,gr)=>{
    let count=0;const groups=l.rows.map(parent=>{const children=gr.get(cell(parent,a))||[];if((count+=children.length)>1000)fail('Nested join exceeds 1000 child references.');return {parent,children};});return {groups};
  }),
  build('snapshot-diff','按唯一键对照快照','Keyed record snapshot differences','以两个唯一键表为快照，定位增加、删除和非键字段变化。','Compare two snapshots with unique populated keys and report inserted, deleted or changed fields.',(l,r,a,b,gl,gr)=>{
    if(gl.size!==l.rows.length||gr.size!==r.rows.length)fail('Each snapshot requires a unique populated key.');
    const modified=[];
    for(const [key,[first]] of gl){if(!gr.has(key))continue;const second=gr.get(key)[0];const columns=new Set([...Object.keys(first).filter(k=>k!==a),...Object.keys(second).filter(k=>k!==b)]);
      const changed=[...columns].filter(k=>Object.hasOwn(first,k)!==Object.hasOwn(second,k)||cell(first,k)!==cell(second,k));
      if(changed.length)modified.push({key,fields:changed});
    }
    return {inserted:[...gr.keys()].filter(k=>!gl.has(k)),deleted:[...gl.keys()].filter(k=>!gr.has(k)),modified};
  }),
];
// Snapshot inputs must obey their unique-key contract.
relationTools.at(-1).example.left=JSON.stringify([{key:'A',qty:2},{key:'B',qty:4}]);
