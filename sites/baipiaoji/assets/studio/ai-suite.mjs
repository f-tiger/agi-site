const zh = document.documentElement.lang.startsWith('zh');
const copy = (cn,en) => zh?cn:en;

for (const index of document.querySelectorAll('[data-suite-index]')) {
  const search=index.querySelector('[data-suite-search]');
  const groups=[...index.querySelectorAll('[data-suite-group]')];
  const count=index.querySelector('[data-suite-count]');
  const normalize=text=>text.normalize('NFKC').toLowerCase().replaceAll('_',' ');
  search.addEventListener('input',()=>{
    const tokens=normalize(search.value).trim().split(/\s+/).filter(Boolean);
    let matches=0;
    for(const group of groups) {
      let visible=0;
      for(const row of group.querySelectorAll('[data-suite-keywords]')) {
        const words=normalize(row.dataset.suiteKeywords);
        row.hidden=tokens.some(token=>!words.includes(token));
        if(!row.hidden) visible++;
      }
      if(tokens.length) group.open=visible>0;
      group.hidden=visible===0;
      matches+=visible;
    }
    count.textContent=matches ? copy(`显示 ${matches} 个工具`,`${matches} tools`) :
      copy('未找到工具。换一个关键词试试。','No matching tool. Try a different search.');
  });
  search.closest('[hidden]').hidden=false;
}

const workspace=document.querySelector('[data-suite-tool]');
if(workspace) {
  const {SUITE_TOOLS,runSuiteTool}=await import('./ai-suite/registry.mjs');
  const tool=SUITE_TOOLS.find(item=>item.id===workspace.dataset.suiteTool);
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
      output.textContent=JSON.stringify(runSuiteTool(tool.name,args),null,2);
      output.hidden=false;
      actions.hidden=false;
      setStatus(copy('结果已生成。','Result ready.'));
      window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:`ai_suite_result_${example?'demo':'own'}`}}));
    } catch(error) {
      setStatus(copy('请检查输入。','Check the inputs.')+' '+error.message,true);
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
