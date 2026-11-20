const zh = document.documentElement.lang.startsWith('zh');
const copy = (cn,en) => zh?cn:en;

const zhInputErrors = new Map([
  ['Enter valid JSON.', '请输入有效的 JSON，属性名和字符串需用双引号。'],
  ['Enter a nonempty JSON array within the row limit.', '请输入至少包含一行的 JSON 数组，并检查行数上限。'],
  ['A selected column was not found.', '找不到所选列。请核对列名、空格和大小写。'],
  ['Use at most 32 columns.', '表格最多支持 32 列。'],
  ['The result is undefined for a zero denominator.', '分母为零，无法计算。'],
  ['A positive denominator is required.', '分母必须大于零。'],
  ['Result exceeds 180 KB. Use a smaller input.', '结果超过 180 KB，请减少数据行数或缩短输入。'],
]);
function inputError(error) {
  if (!zh) return 'Check the inputs. '+error.message;
  if (error instanceof SyntaxError) return '请输入有效的 JSON，属性名和字符串需用双引号。';
  return zhInputErrors.get(error.message) || '请检查输入。 '+error.message;
}

for (const index of document.querySelectorAll('[data-suite-index]')) {
  const search=index.querySelector('[data-suite-search]');
  const normalize=text=>text.normalize('NFKC').toLowerCase().replace(/[-_]+/g,' ');
  const groups=[...index.querySelectorAll('[data-suite-group]')].map(group=>({
    group, initialOpen:group.open, rows:[...group.querySelectorAll('[data-suite-keywords]')].map(row=>{
      const id=row.querySelector('a').pathname.split('/').pop();
      return {row, words:normalize([id, row.textContent, row.dataset.suiteKeywords, group.dataset.groupId, group.querySelector('strong').textContent].join(' '))};
    }),
  }));
  const count=index.querySelector('[data-suite-count]');
  search.addEventListener('input',()=>{
    const tokens=normalize(search.value).trim().split(/\s+/).filter(Boolean);
    let matches=0;
    for(const {group,rows,initialOpen} of groups) {
      let visible=0;
      for(const {row,words} of rows) {
        row.hidden=tokens.some(token=>!words.includes(token));
        if(!row.hidden) visible++;
      }
      group.open=tokens.length?visible>0:initialOpen;
      group.hidden=visible===0;
      matches+=visible;
    }
    count.textContent=matches ? copy(`显示 ${matches} 个自研工具`,`${matches} BPJ tools`) :
      copy('未找到工具。换一个关键词试试。','No matching tool. Try a different search.');
  });
  search.closest('[hidden]').hidden=false;
}

const workspace=document.querySelector('[data-suite-tool]');
if(workspace) {
  const category=workspace.dataset.suiteCategory;
  if(!/^[a-z-]+$/.test(category)) throw Error('Invalid tool category.');
  const [{tools},{executeSuiteTool}]=await Promise.all([
    import(`./ai-suite/${category}.mjs`), import('./ai-suite/runtime.mjs'),
  ]);
  const tool=tools.find(item=>item.id===workspace.dataset.suiteTool);
  const form=workspace.querySelector('form'), status=workspace.querySelector('[data-suite-status]');
  const output=workspace.querySelector('[data-suite-output]'), actions=workspace.querySelector('[data-suite-actions]');
  const field=input=>form.elements.namedItem(input.key);
  const setStatus=(message,error=false)=>{
    status.textContent=message;
    status.dataset.error=String(error);
  };
  function clearResult() {
    output.textContent='';
    output.hidden=true;
    actions.hidden=true;
    setStatus('');
  }
  let example=false;
  workspace.querySelector('[data-suite-example]').addEventListener('click',()=>{
    clearResult();
    example=true;
    for(const input of tool.inputs) {
      const element=field(input), value=tool.example[input.key];
      if(input.type==='boolean') element.checked=value;
      else element.value=value;
    }
    setStatus(copy('已填入示例。点击运行查看结果。','Example loaded. Select Run to view the result.'));
  });
  form.addEventListener('input',()=>{example=false;clearResult();});
  form.addEventListener('submit',event=>{
    event.preventDefault();
    clearResult();
    try {
      const args=Object.fromEntries(tool.inputs.map(input=>{
        const element=field(input);
        const value=input.type==='boolean'?element.checked:
          input.type==='string'?element.value:element.valueAsNumber;
        return [input.key,value];
      }));
      output.textContent=JSON.stringify(executeSuiteTool(tool,args),null,2);
      output.hidden=false;
      actions.hidden=false;
      setStatus(copy('结果已生成。','Result ready.'));
      window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:`ai_suite_result_${example?'demo':'own'}`}}));
    } catch(error) {
      setStatus(inputError(error),true);
    }
  });
  workspace.querySelector('[data-suite-copy]').addEventListener('click',async()=>{
    try {
      await navigator.clipboard.writeText(output.textContent);
      setStatus(copy('结果已复制。','Result copied.'));
    } catch {
      setStatus(copy('无法使用剪贴板。可手动选中结果复制。','Clipboard unavailable. Select the result to copy it.'),true);
    }
  });
  workspace.querySelector('[data-suite-download]').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([output.textContent],{type:'application/json'}));
    const link=document.createElement('a');
    link.href=url;
    link.download=tool.id+'.json';
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  form.querySelector('fieldset').disabled=false;
  setStatus('');
}
