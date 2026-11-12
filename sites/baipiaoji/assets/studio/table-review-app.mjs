import {parseCSV,compareTables,toCSV,handoff} from './table-review-core.mjs';
import {errorText,DEMO_SOURCE_ZH,DEMO_DRAFT_ZH,DEMO_SOURCE_EN,DEMO_DRAFT_EN} from './table-review-copy.mjs';
const workspace=document.getElementById('table-review-workspace'),lang=workspace.dataset.lang,zh=lang==='zh',s=(cn,en)=>zh?cn:en;
const $ = selector => workspace.querySelector(selector);
let mode='own';
const sampleTables=[parseCSV(DEMO_SOURCE_ZH),parseCSV(DEMO_SOURCE_EN)];
function detectDemo(table) { return sampleTables.some(sample=>sample.headers.every(h=>table.headers.includes(h))&&table.rows.some(row=>sample.rows.some(example=>sample.headers.every((h,i)=>row[table.headers.indexOf(h)]===example[i])))); }
export function measurementMode(table,current) { return current==='demo'||detectDemo(table)?'demo':'own'; }
function emit(action){
  try{
    const query=new URLSearchParams(location.search);
    if(location.hostname!=='baipiaoji.com'||navigator.webdriver||['__ci','ci','qa','__qa','__probe'].some(k=>query.has(k))||navigator.doNotTrack==='1'||navigator.globalPrivacyControl||localStorage.getItem('fleet_ga4_choice_v1')==='denied')return;
    window.bpjEv?.('table_review','/table-review/'+action+'/'+mode);
    window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'table_review_'+action+'_'+mode}}));
  }catch{}
}
let sourceTable = null, result = null;
const fileVersions = { source: 0, draft: 0 };
const demoSource=zh?DEMO_SOURCE_ZH:DEMO_SOURCE_EN, demoDraft=zh?DEMO_DRAFT_ZH:DEMO_DRAFT_EN;

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function invalidate() {
  result = null;
  $('#result').hidden = true;
  $('#preview').hidden = true;
  $('#approve').checked = false;
  $('#download').disabled = true;
  $('#error').textContent = '';
}
function resetSource() {
  invalidate(); sourceTable = null;
  $('#rules').hidden = true;
  $('#check').disabled = true;
}
function rule() {
  return {key: $('#key').value, mutable: [...document.querySelectorAll('#columns input:checked')].map(el => el.value)};
}
function refreshColumns(mutable = []) {
  $('#columns').replaceChildren();
  for (const column of sourceTable.headers) {
    const label = node('label', undefined, 'column-option');
    const input = document.createElement('input');
    input.type = 'checkbox'; input.value = column;
    input.disabled = column === $('#key').value;
    input.checked = !input.disabled && mutable.includes(column);
    input.addEventListener('change', invalidate);
    label.append(input, node('span', column), node('small', input.disabled ? s("唯一编号，始终锁定","Unique ID, always locked") : s("勾选后允许改写","Check to allow edits")));
    $('#columns').append(label);
  }
}
function readSource(mutable = []) {
  resetSource();
  try {
    sourceTable = parseCSV($('#source').value);
    mode=measurementMode(sourceTable,mode);
    $('#mode').textContent=mode==='demo'?s('虚构示例（含改动过的示例）','Fictional example (including edited examples)'):s('自己的资料','Your data');
    emit('import');
    $('#key').replaceChildren(...sourceTable.headers.map(h => { const o=node('option',h); o.value=h; return o; }));
    $('#rules').hidden = false;
    $('#source-info').textContent = s(`${sourceTable.rows.length} 行，${sourceTable.headers.length} 列。数值按原始文本保留。`,`${sourceTable.rows.length} rows, ${sourceTable.headers.length} columns. Numbers stay exact text.`);
    refreshColumns(mutable);
    $('#check').disabled = false;
  } catch (error) { $('#error').textContent = errorText(error.message,lang); }
}
function changeTable(changes, kind) {
  const table=node('table'), head=node('thead'), tr=node('tr');
  for(const text of [s("行编号 / 列","Row ID / column"),s("原始值","Original"),s("改写值","Draft"),s("处理方式","Action")]) tr.append(node('th',text));
  head.append(tr); table.append(head);
  const body=node('tbody');
  for(const item of changes.slice(0,100)) {
    const row=node('tr');
    const at=node('td'); at.append(node('strong',item.id),node('span',item.column,'cell-label'));
    row.append(at,node('td',item.before),node('td',item.after),node('td',kind==='repair'?s("恢复原始值","Restore original"):s("保留改写 · 待人工复核","Keep edit \u00b7 review manually"),kind==='repair'?'repair':'allowed'));
    body.append(row);
  }
  table.append(body); return table;
}
function check() {
  invalidate();
  try {
    result=compareTables(sourceTable,parseCSV($('#draft').value),rule());
    $('#result').hidden=false;
    $('#issues').replaceChildren(); $('#changes').replaceChildren();
    if(result.errors.length) {
      $('#result-title').textContent=s("需要先处理结构或输入问题","Fix the structure or input first");
      $('#result-summary').textContent=s("没有生成可导出的修复表格。请修正下列问题后重查。","No export is available. Fix the issues below and check again.");
      for(const text of result.errors.slice(0,50)) $('#issues').append(node('li',errorText(text,lang)));
      emit('blocked');
    } else {
      emit('check');
      $('#result-title').textContent=result.repairs.length ? s(`${result.repairs.length} 处锁定值被改动`,`${result.repairs.length} locked values changed`) : s("锁定字段保持一致","Locked fields match");
      $('#result-summary').textContent=s(`${result.edits.length} 处允许的改写将保留。此检查不能确认翻译或其他改写内容是否正确。`,`${result.edits.length} allowed edits will be kept. This check cannot verify their meaning or accuracy.`);
    }
    if(result.repairs.length) $('#changes').append(node('h3',s("恢复这些原始值","Restore these original values")),changeTable(result.repairs,'repair'));
    if(result.edits.length) $('#changes').append(node('h3',s("保留这些改写，仍需你核对","Keep these edits and review them")),changeTable(result.edits,'edit'));
    $('#repair').disabled=!result.repaired;
    $('#repair').textContent=result.repairs.length?s("修复锁定字段并预览","Repair locked fields and preview"):s("预览保留的改写","Preview retained edits");
  } catch(error) {$('#error').textContent=errorText(error.message,lang);}
}
function preview() {
  if(!result?.repaired)return;
  const table=node('table'), head=node('thead'), tr=node('tr');
  for(const h of result.repaired.headers)tr.append(node('th',h));
  head.append(tr);table.append(head);
  const body=node('tbody');
  for(const row of result.repaired.rows.slice(0,30)) {
    const tr=node('tr'); for(const value of row)tr.append(node('td',value));body.append(tr);
  }
  table.append(body);$('#preview-table').replaceChildren(table);
  $('#preview-note').textContent=result.repaired.rows.length>30?s("预览前 30 行；下载包含全部行。","Preview shows the first 30 rows; the CSV includes every row. Download the review report for all changes."):s("预览包含全部行。","Preview includes every row.");
  $('#preview').hidden=false;emit('preview');
}
function save(name, text, type) {
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function loadFile(event,target) {
  const file=event.target.files[0];if(!file)return;
  const version=++fileVersions[target];
  $('#demo-note').hidden=true;
  if(target==='source')resetSource();else invalidate();
  $('#error').textContent=s("正在读取 CSV…","Reading CSV\u2026");
  try {
    if(file.size>1_000_000)throw new Error(s("文件超过 1 MB，请先缩小表格。","File exceeds 1 MB. Reduce the table first."));
    const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
    if(version!==fileVersions[target])return;
    // A check may have run while the file was loading. Retire that result too.
    invalidate();
    $(`#${target}`).value=text;
    if(target==='source')readSource();
  } catch {
    if(version===fileVersions[target])$('#error').textContent=s("无法读取。请使用不超过 1 MB 的 UTF-8 CSV 文件。","Could not read this file. Use UTF-8 CSV no larger than 1 MB.");
  }
  if(version===fileVersions[target])event.target.value='';
}
$('#source').addEventListener('input',()=>{fileVersions.source++;$('#source-file').value='';$('#demo-note').hidden=true;resetSource();});
$('#draft').addEventListener('input',()=>{fileVersions.draft++;$('#draft-file').value='';$('#demo-note').hidden=true;invalidate();});
$('#read').addEventListener('click',()=>readSource());
$('#source-file').addEventListener('change',e=>loadFile(e,'source'));
$('#draft-file').addEventListener('change',e=>loadFile(e,'draft'));
$('#key').addEventListener('change',()=>{const selected=rule().mutable;invalidate();refreshColumns(selected);});
$('#check').addEventListener('click',check);
$('#repair').addEventListener('click',preview);
$('#approve').addEventListener('change',()=>{$('#download').disabled=!$('#approve').checked||!result?.repaired;});
$('#download').addEventListener('click',()=>{
  if(!result?.repaired||!$('#approve').checked)return;
  save('reviewed-table.csv','\uFEFF'+toCSV(result.repaired),'text/csv;charset=utf-8');emit('export');
});
$('#prompt').addEventListener('click',()=>{if(sourceTable){save('table-rewrite-instructions.txt',handoff(sourceTable,rule(),lang),'text/plain;charset=utf-8');emit('handoff');}});
$('#demo').addEventListener('click',()=>{
  fileVersions.source++;fileVersions.draft++;
  $('#source-file').value='';$('#draft-file').value='';
  $('#source').value=demoSource;$('#draft').value=demoDraft;
  mode='demo';readSource(zh?['项目名称','说明']:['title','note']);check();
  $('#demo-note').hidden=false;
});
$('#clear').addEventListener('click',()=>{
  fileVersions.source++;fileVersions.draft++;
  $('#source-file').value='';$('#draft-file').value='';
  mode='own';$('#mode').textContent=s('自己的资料','Your data');$('#source').value='';$('#draft').value='';resetSource();$('#demo-note').hidden=true;
});

$('#report').addEventListener('click',()=>{if(result){save('table-review-report.json',JSON.stringify({scope:'String comparison only; not semantic verification',...result,repaired:undefined},null,2),'application/json');emit('report');}});
