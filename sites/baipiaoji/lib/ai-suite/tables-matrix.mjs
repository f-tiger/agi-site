import {make,json,number,readArray,numeric,average,sum,variance,fail} from './tables-core.mjs';

const grid = json('matrix','矩形数值矩阵（JSON）','Rectangular numeric matrix (JSON)',[[4,2],[1,3]]);
const other=json('other','第二个数值矩阵（JSON）','Second numeric matrix (JSON)',[[1,2],[3,4]]);
function matrix(text) {
  const rows=readArray(text,32);
  if(!Array.isArray(rows[0])||!rows[0].length||rows[0].length>32)fail('Use between one and 32 columns.');
  return rows.map(r=>{if(!Array.isArray(r)||r.length!==rows[0].length)fail('Use a rectangular array of numeric rows.');return r.map(numeric);});
}
function item(id,zh,en,zdesc,desc,fn,extra=[]) {
  return make('matrix-'+id,zh,en,zdesc,desc,[grid,...extra],p=>({result:fn(matrix(p.matrix),p)}));
}
const transpose=m=>m[0].map((_,i)=>m.map(r=>r[i]));
function square(m) {if(m.length!==m[0].length)fail('Use a square matrix.');}
function same(m,n){if(m.length!==n.length||m[0].length!==n[0].length)fail('Both matrices must have the same dimensions.');}
function eliminate(m,aug=[]) {
  if(m.length>12||m[0].length>12)fail('Elimination supports dimensions up to 12.');
  const a=m.map((r,i)=>[...r,...(aug[i]||[])]);
  const tolerance=Number.EPSILON*Math.max(m.length,m[0].length)*Math.max(...m.flat().map(Math.abs));
  let rank=0,sign=1,det=1;
  const pivots=[];
  for(let c=0;c<m[0].length&&rank<m.length;c++) {
    let k=rank;for(let r=rank+1;r<a.length;r++)if(Math.abs(a[r][c])>Math.abs(a[k][c]))k=r;
    if(Math.abs(a[k][c])<=tolerance)continue;
    if(k!==rank){[a[k],a[rank]]=[a[rank],a[k]];sign=-sign;}
    const pivot=a[rank][c];det*=pivot;
    a[rank]=a[rank].map(v=>v/pivot);
    for(let r=0;r<a.length;r++)if(r!==rank){const f=a[r][c];a[r]=a[r].map((v,j)=>v-f*a[rank][j]);a[r][c]=0;}
    pivots.push(c+1);rank++;
  }
  return {a,rank,pivots,determinant:rank<m.length?0:sign*det};
}
export const matrixTools=[
  item('transpose','矩阵转置','Transpose a numeric matrix','将工作表的行和列互换，支持非方阵。','Swap the row and column axes of a rectangular numeric grid.',transpose),
  item('multiply','矩阵乘积','Matrix product','按行与列的点积计算两矩阵相乘的结果。','Multiply conformable matrices using row-by-column dot products.',(m,p)=>{const n=matrix(p.other);if(m[0].length!==n.length)fail('Inner dimensions must agree.');const cols=transpose(n);return m.map(r=>cols.map(c=>sum(r.map((x,i)=>x*c[i]))));},[other]),
  item('hadamard','矩阵逐元素乘积','Hadamard product','对同尺寸矩阵中相同位置的单元逐项相乘。','Multiply corresponding cells of equally shaped matrices.',(m,p)=>{const n=matrix(p.other);same(m,n);return m.map((r,i)=>r.map((v,j)=>v*n[i][j]));},[other]),
  item('direct-sum','矩阵块对角拼接','Block diagonal matrix assembly','将两个矩阵置于主对角的不同区块，其他单元补零。','Place two rectangular matrices on a block diagonal and fill off-diagonal blocks with zeros.',(m,p)=>{
    const n=matrix(p.other);return [...m.map(r=>[...r,...Array(n[0].length).fill(0)]),...n.map(r=>[...Array(m[0].length).fill(0),...r])];
  },[other]),
  item('determinant','方阵行列式','Square matrix determinant','用带选主元的消元计算最多十二阶方阵的数值行列式。','Compute a numerical determinant using partial pivoting for a square matrix of order up to twelve.',m=>{square(m);return eliminate(m).determinant;}),
  item('linear-system','小型线性方程组求解','Solve a small linear system','对最多十二阶满秩矩阵与右端向量进行选主元消元。','Solve a square nonsingular system of up to twelve equations with partial pivoting.',(m,p)=>{
    square(m);const b=readArray(p.rhs,12).map(numeric);if(b.length!==m.length)fail('Right-hand side must match row count.');
    const e=eliminate(m,b.map(v=>[v]));if(e.rank!==m.length)fail('System has no unique solution at working precision.');return e.a.map(r=>r.at(-1));
  },[json('rhs','方程右端向量','Right-hand side vector',[10,5])]),
  item('rref','简化行阶梯形','Reduced row echelon form','用带容差的部分选主元计算秩、主元列和简化行阶梯形。','Report numerical rank, one-based pivot columns and reduced row echelon form for matrices up to 12 by 12.',m=>{const {a,rank,pivots}=eliminate(m);return {rows:a,rank,pivots};}),
  item('trace','矩阵迹与对角线','Matrix diagonal and trace','提取方阵的主对角并求对角和。','Extract a square matrix’s main diagonal and sum it to obtain the trace.',m=>{square(m);const diagonal=m.map((r,i)=>r[i]);return {diagonal,trace:sum(diagonal)};}),
  item('norms','矩阵范数对照','Matrix norm comparison','计算绝对列和范数、绝对行和范数及弗罗贝尼乌斯范数。','Compare the induced one-norm and infinity-norm with the Frobenius norm.',m=>{
    const maxSum=rows=>Math.max(...rows.map(r=>sum(r.map(Math.abs))));return {one:maxSum(transpose(m)),infinity:maxSum(m),frobenius:Math.hypot(...m.flat())};
  }),
  item('symmetry','矩阵对称残差','Matrix symmetry residual','比较转置对应项，返回最大绝对差值及是否精确对称。','Measure the maximum absolute discrepancy between mirrored entries of a square grid.',m=>{square(m);const max=Math.max(...m.flatMap((r,i)=>r.map((v,j)=>Math.abs(v-m[j][i]))));return {maximumAbsoluteDifference:max,symmetric:max===0};}),
  item('sparse-triplets','稀疏坐标三元组','Sparse coordinate triplets','将非零单元转为一基行列坐标和值，并记录矩阵尺寸。','Encode only nonzero cells as one-based row-column-value triplets and preserve grid dimensions.',m=>({rows:m.length,columns:m[0].length,entries:m.flatMap((r,i)=>r.flatMap((v,j)=>v===0?[]:[[i+1,j+1,v]]))})),
  item('column-covariance','矩阵列间样本协方差','Column sample covariance matrix','把每行视为观测，计算各列之间的样本协方差矩阵。','Treat rows as observations and compute pairwise sample covariance of grid columns.',m=>{
    if(m.length<2)fail('At least two observations are required.');const cols=transpose(m).map(c=>{const avg=average(c);return c.map(x=>x-avg);});return cols.map(c=>cols.map(d=>sum(c.map((v,i)=>v*d[i]))/(m.length-1)));
  }),
  item('contingency-expected','列联表独立性期望值','Expected counts for a contingency table','在边际总量固定且分类独立的假设下计算每个单元的期望频数。','Compute independence-model expected cell counts from nonnegative row and column margins.',m=>{
    if(m.flat().some(x=>x<0))fail('Counts must be nonnegative.');const rs=m.map(sum),cs=transpose(m).map(sum),total=sum(rs);if(!total)fail('Total count must be positive.');return rs.map(r=>cs.map(c=>r*c/total));
  }),
  item('prefix-grid','二维前缀累计和','Two-dimensional prefix sums','为每个位置计算从左上角开始的矩形区域总和。','At each cell report the rectangular total from the top-left corner through that cell.',m=>{
    const out=[];for(const [i,row] of m.entries()){let run=0;out.push(row.map((v,j)=>(run+=v)+(out[i-1]?.[j]||0)));}return out;
  }),
  item('column-standardize','矩阵逐列标准化','Standardize worksheet columns','按各列总体标准差缩放，常量列输出零值。','Center and scale each column using its population spread, mapping constant columns to zero.',m=>transpose(transpose(m).map(c=>{const mean=average(c),sd=Math.sqrt(variance(c));return c.map(x=>sd?(x-mean)/sd:0);}))),
  item('spiral','矩形网格螺旋读取','Clockwise spiral traversal','从左上角起顺时针向中心读取矩阵单元。','Read rectangular grid cells clockwise from the top-left boundary inward.',m=>{
    let top=0,bottom=m.length-1,left=0,right=m[0].length-1;const out=[];
    while(top<=bottom&&left<=right){for(let j=left;j<=right;j++)out.push(m[top][j]);top++;for(let i=top;i<=bottom;i++)out.push(m[i][right]);right--;
      if(top<=bottom){for(let j=right;j>=left;j--)out.push(m[bottom][j]);bottom--;}
      if(left<=right){for(let i=bottom;i>=top;i--)out.push(m[i][left]);left++;}}
    return out;
  }),
];
