import assert from 'node:assert/strict';
import {tools} from '../lib/ai-suite/tables.mjs';

const catalog = new Map(tools.map(t=>[t.id,t]));
assert.equal(catalog.size,180);
assert.equal(tools.length,180);
function call(id,overrides={}) {
  const tool=catalog.get(id);
  assert.ok(tool,id);
  return tool.run({...tool.example,...overrides});
}
const values=a=>({values:JSON.stringify(a)});
const arrays=(x,y)=>({x:JSON.stringify(x),y:JSON.stringify(y)});
function close(a,b,eps=1e-10){assert.ok(Math.abs(a-b)<=eps*Math.max(1,Math.abs(b)),String(a)+' != '+String(b));}
for (const t of tools) {
  assert.equal(Object.keys(t.example).length,t.inputs.length,t.id);
  assert.ok(t.title.zh&&t.title.en&&t.description.zh&&t.description.en,t.id);
  const result=call(t.id);
  assert.equal(Object.getPrototypeOf(result),Object.prototype,t.id);
  assert.deepEqual(result,call(t.id),t.id);
  assert.ok(JSON.stringify(result).length<180000,t.id);
}
assert.equal(call('series-trimmed-mean',{...values([1,2,3,9,100]),fraction:.2}).result,14/3);
assert.deepEqual(call('series-winsorize',{...values([10,0,2,6,3]),fraction:.2}).result,[6,2,2,6,3]);
close(call('series-geometric-mean',values([2,8])).result,4);
assert.deepEqual(call('series-midrank-percentiles',values([4,2,2,1])).result,[.875,.5,.5,.125]);
close(call('series-gini',values([0,1])).result,.5);
assert.deepEqual(call('series-empirical-cdf',values([4,2,2,1])).result,[{value:1,probability:.25},{value:2,probability:.75},{value:4,probability:1}]);
assert.deepEqual(call('series-histogram',{...values([0,1,2]),bins:2}).result.map(b=>b.count),[1,2]);
assert.deepEqual(call('series-moving-median',{...values([1,5,3,7]),width:3}).result,[3,5]);
assert.throws(()=>call('series-autocorrelation',{...values([4,4]),lag:1}));
assert.throws(()=>call('series-lag-differences',{...values([1,2]),lag:2}));
assert.deepEqual(call('pairs-linear-fit',arrays([0,1,2],[3,5,7])).result,{slope:2,intercept:3,fitted:[3,5,7]});
close(call('pairs-kendall',arrays([1,2,2],[3,2,1])).result.tau,-2/Math.sqrt(6));
close(call('pairs-trapezoid-integral',arrays([0,2,5],[0,2,5])).result,12.5);
close(call('pairs-weighted-mean',arrays([1,4],[2,1])).result,2);
assert.equal(call('pairs-weighted-median',arrays([1,4,9],[2,1,1])).result,1);
assert.equal(call('pairs-symmetric-error',arrays([0,2],[0,4])).result,100/3);
assert.throws(()=>call('pairs-pearson',arrays([1,1],[1,2])));
assert.throws(()=>call('pairs-linear-fit',arrays([1,2],[1])));
assert.deepEqual(call('dq-calendar-dates').failedRows,[2]);
assert.deepEqual(call('dq-boolean-cells').failedRows,[3,4]);
assert.deepEqual(call('dq-duplicate-rows',{rows:'[{"a":1},{"a":1,"b":null},{"a":1}]'}).duplicates,[{row:3,first:1}]);
assert.deepEqual(call('dq-functional-dependency',{rows:'[{"a":"x","b":1},{"a":"x","b":"1"}]',group:'a',column:'b'}).conflicts,[{key:'x',values:[1,'1']}]);
assert.deepEqual(call('dq-column-contract',{rows:'[{"__proto__":2}]',expected:'["__proto__"]'}),{missing:[],unexpected:[]});
assert.deepEqual(call('table-pivot-sums',{rows:'[{"g":"A","y":"R","v":1},{"g":"A","y":"R","v":4},{"g":"B","y":"Q","v":2}]',group:'g',across:'y',column:'v'}),{columns:['R','Q'],rows:[{key:'A',values:[5,0]},{key:'B',values:[0,2]}]});
assert.deepEqual(call('table-linear-gap-fill').rows.map(r=>r.score),[null,4,6,8,null]);
assert.throws(()=>call('table-rename',{mapping:'{"score":"label"}'}));
assert.throws(()=>call('table-rename',{mapping:'{"score":"a"},{"label":"b"}'}));
assert.deepEqual(call('table-group-dispersion',{rows:'[{"team":"x","score":4}]'}).groups,[{key:'x',result:null}]);
const pairs={left:'[{"key":"x"},{"key":null},{"key":"x"}]',right:'[{"key":"x"},{"key":null},{"key":"x"}]'};
assert.deepEqual(call('relation-join-size',pairs),{inner:4,leftOuter:5,fullOuter:6});
assert.equal(call('relation-full-join',pairs).rows.length,6);
assert.deepEqual(call('relation-snapshot-diff',{left:'[{"key":"x","a":null},{"key":"y"}]',right:'[{"key":"x"},{"key":"z"}]'}),{inserted:['z'],deleted:['y'],modified:[{key:'x',fields:['a']}]});
assert.deepEqual(call('matrix-prefix-grid',{matrix:'[[1,2],[3,4]]'}).result,[[1,3],[4,10]]);
assert.deepEqual(call('matrix-linear-system',{matrix:'[[0,1],[2,3]]',rhs:'[5,19]'}).result,[2,5]);
close(call('matrix-determinant',{matrix:'[[0,1],[2,3]]'}).result,-2);
assert.equal(call('matrix-rref',{matrix:'[[1,2,3],[2,4,6]]'}).result.rank,1);
assert.throws(()=>call('matrix-linear-system',{matrix:'[[1,2],[2,4]]',rhs:'[1,2]'}));
assert.deepEqual(call('matrix-spiral',{matrix:'[[1,2,3],[4,5,6]]'}).result,[1,2,3,6,5,4]);
assert.deepEqual(call('sheet-parse-cell',{address:'$XFD$1048576'}),{row:1048576,column:16384,absoluteRow:true,absoluteColumn:true});
assert.throws(()=>call('sheet-parse-cell',{address:'XFE1'}));
assert.deepEqual(call('sheet-distinct-cell-count',{ranges:'["A1:C3","B2:D4","C3:C3"]'}),{cells:14});
assert.deepEqual(call('sheet-subtract',{range:'A1:C3',other:'B2'}).ranges,['A1:C1','A3:C3','A2','C2']);
assert.deepEqual(call('sheet-copy-reference',{address:'$A9',rows:-2,cols:2}),{address:'$A7'});
assert.throws(()=>call('sheet-copy-reference',{address:'A2',rows:-2,cols:0}));
assert.deepEqual(call('sheet-visible-ranges',{range:'A1:B6',hidden:'[2,3,5]'}).visible,['A1:B1','A4:B4','A6:B6']);
assert.deepEqual(call('sheet-print-pages',{range:'A1:B5',width:2,height:3,headers:1}).pages.map(p=>[p.header,p.body]),[['A1:B1','A2:B3'],['A1:B1','A4:B5']]);
console.log('PASS 180 worksheet examples, deterministic results and independent numeric, data quality, joins, matrix and A1 range fixtures.');
