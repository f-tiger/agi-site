import {make,label,number,json,readArray,fail} from './tables-core.mjs';

const maxRow=1048576,maxCol=16384;
const ref=label('address','A1 单元格地址','A1 cell address','D12');
const range=label('range','A1 矩形区域','A1 rectangular range','B2:D5');
const second=label('other','另一个 A1 区域','Second A1 range','C4:F8');
const height=number('height','行数','Row count',3,1,maxRow,true);
const width=number('width','列数','Column count',2,1,maxCol,true);
const rowMove=number('rows','行偏移','Row offset',2,-maxRow,maxRow,true);
const colMove=number('cols','列偏移','Column offset',1,-maxCol,maxCol,true);
function tool(id,zh,en,zdesc,desc,fields,run){return make('sheet-'+id,zh,en,zdesc,desc,fields,run);}
function check(r,c) {
  if(!Number.isSafeInteger(r)||!Number.isSafeInteger(c)||r<1||r>maxRow||c<1||c>maxCol)fail('Coordinates exceed the Excel worksheet bounds.');
}
function colName(c) {
  check(1,c);let s='';
  while(c){c--;s=String.fromCharCode(65+c%26)+s;c=Math.floor(c/26);}
  return s;
}
function cell(s) {
  if(typeof s!=='string')fail('Use an A1 cell reference.');
  const m=/^(\$?)([A-Z]{1,3})(\$?)([1-9][0-9]{0,6})$/i.exec(s.trim());
  if(!m)fail('Use an A1 cell reference.');let c=0;for(const ch of m[2].toUpperCase())c=c*26+ch.charCodeAt(0)-64;
  const r=Number(m[4]);check(r,c);return {r,c,cr:Boolean(m[1]),rr:Boolean(m[3])};
}
const addr=(r,c)=>{check(r,c);return colName(c)+r;};
function box(s) {
  const parts=s.split(':');if(parts.length>2)fail('Use one rectangular A1 range.');
  const a=cell(parts[0]),b=cell(parts[1]??parts[0]);
  return {t:Math.min(a.r,b.r),b:Math.max(a.r,b.r),l:Math.min(a.c,b.c),r:Math.max(a.c,b.c)};
}
const rows=a=>a.b-a.t+1,cols=a=>a.r-a.l+1;
const rangeName=a=>{const s=addr(a.t,a.l),e=addr(a.b,a.r);return s===e?s:s+':'+e;};
const intersect=(a,b)=>{const c={t:Math.max(a.t,b.t),b:Math.min(a.b,b.b),l:Math.max(a.l,b.l),r:Math.min(a.r,b.r)};return c.t>c.b||c.l>c.r?null:c;};
const bound=(a,b)=>({t:Math.min(a.t,b.t),b:Math.max(a.b,b.b),l:Math.min(a.l,b.l),r:Math.max(a.r,b.r)});
function tile(a,h,w) {
  if(Math.ceil(rows(a)/h)*Math.ceil(cols(a)/w)>512)fail('Output exceeds 512 tiles.');
  const ranges=[];
  for(let r=a.t;r<=a.b;r+=h)for(let c=a.l;c<=a.r;c+=w)ranges.push(rangeName({t:r,l:c,b:Math.min(r+h-1,a.b),r:Math.min(c+w-1,a.r)}));
  return ranges;
}
function sheetName(name) {
  if(!name||name.length>31||/[\x00-\x1f\\/:?*\[\]]/u.test(name)||name.startsWith("'")||name.endsWith("'"))fail('Use a valid worksheet name of 1 to 31 characters.');
  return "'"+name.replaceAll("'","''")+"'";
}
const gridSize= a=>rows(a)*cols(a);
export const sheetTools=[
  tool('parse-cell','解析单元格坐标','Decode an A1 cell address','将地址分解为一基行列编号及行、列锁定标志。','Decode one-based row and column coordinates and absolute-reference markers.',[ref],p=>{const a=cell(p.address);return {row:a.r,column:a.c,absoluteRow:a.rr,absoluteColumn:a.cr};}),
  tool('compose-cell','行列编号转单元格地址','Compose a cell address from coordinates','从一基行列编号生成 Excel A1 地址和 R1C1 绝对坐标表示。','Encode numeric worksheet coordinates in A1 and absolute R1C1 notation.',[number('row','行号','Row number',12,1,maxRow,true),number('column','列号','Column number',28,1,maxCol,true)],p=>({a1:addr(p.row,p.column),r1c1:'R'+p.row+'C'+p.column})),
  tool('dimensions','计算选区尺寸','Worksheet selection dimensions','规范化矩形地址并计算行数、列数和总单元格数。','Normalize the selected rectangle and return its row, column and cell counts.',[range],p=>{const a=box(p.range);return {range:rangeName(a),rows:rows(a),columns:cols(a),cells:gridSize(a)};}),
  tool('from-anchor','从锚点建立矩形区域','Build a rectangle from an anchor','用左上角单元格、行数、列数构造目标选区。','Build a bounded rectangular selection from its top-left cell and requested dimensions.',[ref,height,width],p=>{const a=cell(p.address);return {range:rangeName({t:a.r,l:a.c,b:a.r+p.height-1,r:a.c+p.width-1})};}),
  tool('intersection','两个选区的交集','Intersection of two selections','计算两个矩形选区共同覆盖的区域和单元格数量。','Find the overlapping rectangle and number of shared cells between two selections.',[range,second],p=>{const i=intersect(box(p.range),box(p.other));return {range:i?rangeName(i):null,cells:i?gridSize(i):0};}),
  tool('bounding-box','多个选区的外接矩形','Bounding rectangle of selections','为多个不连续区域求能包含全部选区的最小矩形。','Find the smallest rectangle enclosing all supplied selections.',[json('ranges','区域地址数组','List of A1 ranges',['C2:D4','A7:B8'])],p=>{const a=readArray(p.ranges,128).map(s=>typeof s==='string'?box(s):fail('Use range strings.'));return {range:rangeName(a.reduce(bound))};}),
  tool('subtract','从选区中扣除交叠区域','Subtract an overlapping selection','分解成最多四个互不重叠的矩形，覆盖第一选区的剩余格子。','Return up to four disjoint rectangles covering the first selection after removing the overlap.',[range,second],p=>{
    const a=box(p.range),i=intersect(a,box(p.other));if(!i)return {ranges:[rangeName(a)]};
    const pieces=[{...a,b:i.t-1},{...a,t:i.b+1},{t:i.t,b:i.b,l:a.l,r:i.l-1},{t:i.t,b:i.b,l:i.r+1,r:a.r}];
    return {ranges:pieces.filter(b=>b.t<=b.b&&b.l<=b.r).map(rangeName)};
  }),
  tool('distinct-cell-count','多选区不重复单元格数','Distinct cells across selections','以行带和列区间归并计算并集面积，重叠单元格只计一次。','Measure the union of rectangles using row bands and merged column intervals without enumerating the cells.',[json('ranges','区域地址数组','List of A1 ranges',['A1:C3','B2:D4'])],p=>{
    const a=readArray(p.ranges,100).map(s=>typeof s==='string'?box(s):fail('Use range strings.'));
    const y=[...new Set(a.flatMap(b=>[b.t,b.b+1]))].sort((a,b)=>a-b);let cells=0;
    for(let i=0;i<y.length-1;i++){let right=0,total=0;const active=a.filter(b=>b.t<=y[i]&&y[i]<=b.b).sort((x,z)=>x.l-z.l);for(const b of active){if(b.r>right){total+=b.r-Math.max(right+1,b.l)+1;right=b.r;}}cells+=total*(y[i+1]-y[i]);}
    return {cells};
  }),
  tool('tile','按块划分选区','Tile a selection into blocks','按最大行列数划分矩形，保留边缘的不完整块。','Partition a rectangular selection into bounded row-major blocks, including partial edges.',[range,height,width],p=>({ranges:tile(box(p.range),p.height,p.width)})),
  tool('offset','移动整块选区','Translate a selection','按有符号的行列偏移平移整个选区，保持其尺寸。','Shift a rectangle by signed row and column offsets while preserving its shape.',[range,rowMove,colMove],p=>{
    const a=box(p.range);return {range:rangeName({t:a.t+p.rows,b:a.b+p.rows,l:a.l+p.cols,r:a.r+p.cols})};
  }),
  tool('transpose-footprint','预览转置粘贴范围','Preview a transposed paste footprint','将源选区行列数互换，计算粘贴到目标单元格后覆盖的范围。','Swap the source dimensions and report the footprint of a transposed paste at the destination cell.',[range,ref],p=>{const a=box(p.range),b=cell(p.address);return {destination:rangeName({t:b.r,l:b.c,b:b.r+cols(a)-1,r:b.c+rows(a)-1})};}),
  tool('border','提取选区轮廓','Extract the selection perimeter','将矩形外边缘分解为互不重叠的行列段，并统计边缘格数。','Return disjoint range segments around the rectangle perimeter and count boundary cells.',[range],p=>{
    const a=box(p.range);if(rows(a)<3||cols(a)<3)return {ranges:[rangeName(a)],cells:gridSize(a)};
    return {ranges:[{...a,b:a.t},{...a,t:a.b},{...a,t:a.t+1,b:a.b-1,r:a.l},{...a,t:a.t+1,b:a.b-1,l:a.r}].map(rangeName),cells:2*rows(a)+2*cols(a)-4};
  }),
  tool('enumerate','列出选区单元格','Enumerate cells in reading order','按逐行从左到右的次序列出最多五百个选区单元格。','Enumerate up to 500 cells in row-major reading order.',[range],p=>{const a=box(p.range);if(gridSize(a)>500)fail('Use up to 500 cells.');return {cells:tile(a,1,1)};}),
  tool('copy-reference','复制相对与绝对引用','Translate copied cell references','复制引用时只移动未锁定的行列分量，保留美元锁定符。','Translate an A1 reference on copy, respecting fixed row and column components.',[label('address','含锁定符的地址','Cell reference with optional locks','$C4'),rowMove,colMove],p=>{
    const a=cell(p.address),r=a.rr?a.r:a.r+p.rows,c=a.cr?a.c:a.c+p.cols;check(r,c);return {address:(a.cr?'$':'')+colName(c)+(a.rr?'$':'')+r};
  }),
  tool('split-at-cell','按分割点划分选区','Split a selection at a cell','以指定单元格为右下块起点，将矩形划为最多四块。','Cut a selection into up to four rectangles with the selected cell starting the bottom-right block.',[range,label('address','分割点','Split cell','C4')],p=>{
    const a=box(p.range),b=cell(p.address);if(!intersect(a,{t:b.r,b:b.r,l:b.c,r:b.c}))fail('Split point must lie in the range.');
    const out=[];for(const [t,e] of [[a.t,b.r-1],[b.r,a.b]])for(const [l,r] of [[a.l,b.c-1],[b.c,a.r]])if(t<=e&&l<=r)out.push(rangeName({t,b:e,l,r}));return {ranges:out};
  }),
  tool('nth-cell','顺序序号对应单元格','Find cell at a reading-order index','从一基序号定位选区内按行读取的单元格。','Locate the cell at a one-based row-major position inside a rectangle.',[range,number('index','一基序号','One-based index',5,1,maxRow*maxCol,true)],p=>{const a=box(p.range);if(p.index>gridSize(a))fail('Index exceeds selection size.');return {address:addr(a.t+Math.floor((p.index-1)/cols(a)),a.l+(p.index-1)%cols(a))};}),
  tool('relative-position','单元格在选区中的位置','Locate a cell within a selection','输出单元格相对选区左上角的一基行号、列号和按行读取的序号。','Locate a selected cell by local row, local column and row-major sequence number inside a range.',[range,label('address','待定位地址','Address to locate','C4')],p=>{
    const a=box(p.range),b=cell(p.address);if(b.r<a.t||b.r>a.b||b.c<a.l||b.c>a.r)fail('Cell is outside the selection.');
    return {row:b.r-a.t+1,column:b.c-a.l+1,index:(b.r-a.t)*cols(a)+b.c-a.l+1};
  }),
  tool('freeze-panes','冻结窗格锚点','Determine freeze-pane anchor','根据要冻结的表头行数和前置列数计算首个可滚动单元格。','Locate the first scrollable cell after freezing a requested number of leading rows and columns.',[number('rows','冻结行数','Frozen rows',2,0,maxRow-1,true),number('columns','冻结列数','Frozen columns',1,0,maxCol-1,true)],p=>({firstScrollable:addr(p.rows+1,p.columns+1),frozenRows:p.rows,frozenColumns:p.columns})),
  tool('qualify-range','生成跨表限定地址','Qualify an address with a worksheet name','规范化区域并为工作表名中的单引号做转义，生成带表名引用。','Quote the worksheet name, escape embedded apostrophes and attach a normalized range.',[range,label('name','工作表名','Worksheet name',"Team's Plan")],p=>({reference:sheetName(p.name)+'!'+rangeName(box(p.range))})),
  tool('diagonal-cells','枚举选区主对角线','Enumerate selection diagonal cells','沿右下方向列出矩形中的主对角线单元格。','List top-left to bottom-right diagonal cells until reaching the edge of the selection.',[range],p=>{const a=box(p.range),n=Math.min(rows(a),cols(a));if(n>500)fail('Use a diagonal of at most 500 cells.');return {cells:Array.from({length:n},(_,i)=>addr(a.t+i,a.l+i))};}),
  tool('header-body','分离表头与正文选区','Separate header and body ranges','按给定表头深度划分完整工作表区域，正文为空时返回空值。','Divide a data rectangle at a requested header depth and report a null body when no rows remain.',[range,number('headerRows','表头行数','Header depth',1,1,maxRow,true)],p=>{const a=box(p.range);if(p.headerRows>rows(a))fail('Header depth exceeds row count.');return {header:rangeName({...a,b:a.t+p.headerRows-1}),body:p.headerRows===rows(a)?null:rangeName({...a,t:a.t+p.headerRows})};}),
  tool('append-location','追加数据占用范围','Predict appended row footprint','根据已有选区末行和追加行数，预测新数据位置和合并后的区域。','Determine where appended rows will land and report the resulting expanded selection.',[range,height],p=>{const a=box(p.range);return {appended:rangeName({...a,t:a.b+1,b:a.b+p.height}),combined:rangeName({...a,b:a.b+p.height})};}),
  tool('print-pages','带重复表头的打印分页','Plan print pages with repeated headers','每页预留重复表头空间，按页码列出表头与正文选区。','Reserve room for repeated header rows on each page and report separate header and body ranges for each page.',[range,height,width,number('headers','每页重复表头行数','Header rows repeated on every page',1,0,100,true)],p=>{
    const a=box(p.range);
    if(p.headers>=p.height||p.headers>=rows(a))fail('Leave room for at least one body row.');
    const body={...a,t:a.t+p.headers},capacity=p.height-p.headers;
    const across=Math.ceil(cols(a)/p.width),down=Math.ceil(rows(body)/capacity);
    return {across,down,pages:tile(body,capacity,p.width).map((range,i)=>{
      const segment=box(range),header=p.headers?rangeName({...a,l:segment.l,r:segment.r,b:a.t+p.headers-1}):null;
      return {page:i+1,columnPage:i%across+1,rowPage:Math.floor(i/across)+1,header,body:range};
    })};
  }),
  tool('visible-ranges','扣除隐藏行后的可见区域','Visible ranges after hiding worksheet rows','从矩形选区排除给定的一基隐藏行，合并连续可见行段。','Exclude a list of hidden worksheet row numbers and coalesce adjacent visible rows.',[range,json('hidden','要隐藏的工作表行号','Worksheet row numbers to hide',[3,5])],p=>{
    const a=box(p.range),hidden=readArray(p.hidden,500);
    if(hidden.some(n=>!Number.isSafeInteger(n)||n<1||n>maxRow))fail('Use valid worksheet row numbers.');
    const inside=[...new Set(hidden.filter(n=>n>=a.t&&n<=a.b))].sort((x,y)=>x-y);const visible=[];let t=a.t;
    for(const n of inside){if(t<n)visible.push(rangeName({...a,t,b:n-1}));t=n+1;}if(t<=a.b)visible.push(rangeName({...a,t}));return {visible};
  }),
];
