import {renderSuiteResult} from './ai-suite-result.mjs?v=3';

const zh = document.documentElement.lang.startsWith('zh');
const copy = (cn,en) => zh?cn:en;
const zhInputErrors = new Map([
  ['Enter valid JSON.', '请输入有效的 JSON，属性名和字符串需用双引号。'],
  ['Enter a nonempty JSON array within the row limit.', '请输入至少包含一行的 JSON 数组，并检查行数上限。'],
  ['A selected column was not found.', '找不到所选列。请核对列名、空格和大小写。'],
  ['Use at most 32 columns.', '表格最多支持 32 列。'],
  ['The result is undefined for a zero denominator.', '分母为零，无法计算。'],
  ['A positive denominator is required.', '分母必须大于零。'],
  ['Arguments exceed 64 KB.', '输入超过 64 KB，请减少数据行数或缩短文本。'],
  ['Result exceeds 180 KB. Use a smaller input.', '结果超过 180 KB，请减少数据行数或缩短输入。'],
  ['Result is outside the supported numeric range.', '计算结果超出可表示的数值范围，请缩小输入范围。'],
]);
function inputError(error) {
  if (error instanceof SyntaxError) {
    return copy('请输入有效的 JSON，属性名和字符串需用双引号。','Enter valid JSON with double quotes around names and strings.');
  }
  return (zh&&zhInputErrors.get(error.message)) || error.message;
}

const textOutputKeys = new Set(['text','csv','tsv','markdown','xml','html','yaml','sql','srt','vtt','ics','code','script','command','json','jsonLd','css','md']);
function primaryText(result) {
  if (typeof result==='string') return result;
  if (!result || typeof result!=='object' || Array.isArray(result)) return '';
  const strings=Object.entries(result).filter(([key,value])=>textOutputKeys.has(key)&&typeof value==='string'&&value.length>0);
  return strings.length===1?strings[0][1]:'';
}

const workspace=document.querySelector('[data-suite-tool]');
if (workspace) {
  const find=selector=>workspace.querySelector(selector);
  const form=find('form'), status=find('[data-suite-status]'), feedback=find('[data-suite-error]');
  const output=find('[data-suite-output]'), actions=find('[data-suite-actions]');
  const view=find('[data-suite-result-view]'), format=find('[data-suite-format]');
  const empty=find('[data-suite-empty]'), source=find('[data-suite-source]');
  const readable=find('[data-suite-readable]'), raw=find('[data-suite-raw]');
  const copyText=find('[data-suite-copy-text]');
  const followup=find('[data-trade-quote-followup]');
  const isTradeQuote=workspace.dataset.suiteTool==='trade-export-quote';
  let textResult='';
  const field=input=>form.elements.namedItem(input.key);
  const labels=JSON.parse(workspace.dataset.suiteLabels);
  const showFeedback=(message,error=false)=>{
    feedback.textContent=message;
    feedback.hidden=!message;
    feedback.dataset.error=String(error);
  };
  function showFormat(useReadable) {
    readable.setAttribute('aria-pressed',String(useReadable));
    raw.setAttribute('aria-pressed',String(!useReadable));
    view.hidden=!useReadable;
    output.hidden=useReadable;
  }
  function clearResult() {
    output.textContent='';
    textResult='';
    view.replaceChildren();
    for (const node of [output,view,format,source,actions]) node.hidden=true;
    if (followup) followup.hidden=true;
    status.textContent='';
    empty.hidden=false;
  }
  function trackTradeQuote(action) {
    if (!isTradeQuote || location.hostname!=='baipiaoji.com' || navigator.webdriver ||
        navigator.doNotTrack==='1' || navigator.globalPrivacyControl ||
        ['__ci','__qa','__probe','qa','ci'].some(key=>new URLSearchParams(location.search).has(key))) return;
    try { if (localStorage.getItem('fleet_ga4_choice_v1')==='denied') return; } catch {}
    window.bpjEv?.('biz','/trade-quote/'+action);
    window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'trade_quote_'+action}}));
  }
  followup?.querySelector('[data-trade-quote-signup]')?.addEventListener('click',event=>{
    if (event.isTrusted) trackTradeQuote('signup_open');
  });
  if (followup) {
    const guests=followup.querySelectorAll('[data-trade-quote-guest]');
    const syncAccount=user=>guests.forEach(node=>{node.hidden=Boolean(user);});
    document.addEventListener('bpj-account-state',event=>syncAccount(event.detail?.user));
    syncAccount(window.bpjAccount?.state?.user);
  }
  const category=workspace.dataset.suiteCategory;
  try {
    if (!/^[a-z-]+$/.test(category)) throw Error('Invalid tool category.');
    const [{tools},{executeSuiteTool}]=await Promise.all([
      import(`./ai-suite/${category}.mjs${category==='trade'?'?v=20261127.3':''}`), import('./ai-suite/runtime.mjs?v=3'),
    ]);
    const tool=tools.find(item=>item.id===workspace.dataset.suiteTool);
    if (!tool) throw Error('Unknown tool.');
    let example=false;
    let editVersion=0;
    function edited() {
      example=false;
      editVersion++;
      showFeedback('');
      clearResult();
    }
    function focusFirstInput() {
      const first=tool.inputs[0];
      if (first) field(first).focus();
    }
    find('[data-suite-example]').addEventListener('click',()=>{
      edited();
      for (const input of tool.inputs) {
        const control=field(input);
        const value=tool.example[input.key];
        if (input.type==='boolean') control.checked=value;
        else control.value=value;
      }
      example=true;
      showFeedback(copy('示例已填入，可以直接运行。','Example loaded. Run the tool to see the result.'));
      focusFirstInput();
    });
    find('[data-suite-clear]').addEventListener('click',()=>{
      form.reset();
      edited();
      focusFirstInput();
    });
    form.addEventListener('input',event=>{
      if (event.target.type!=='file') edited();
    });
    form.addEventListener('keydown',event=>{
      if (event.key==='Enter'&&(event.ctrlKey||event.metaKey)&&!event.isComposing) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    form.addEventListener('submit',event=>{
      event.preventDefault();
      clearResult();
      showFeedback('');
      let args, result;
      try {
        args=Object.fromEntries(tool.inputs.map(input=>{
          const control=field(input);
          const value=input.type==='boolean'?control.checked:
            input.type==='string'?control.value:control.valueAsNumber;
          return [input.key,value];
        }));
        result=executeSuiteTool(tool,args);
      } catch(error) {
        showFeedback(inputError(error),true);
        return;
      }
      const mode=example?'demo':'own';
      if (isTradeQuote && result.costCompleteness?.status!=='costs_entered') {
        const missing=result.costCompleteness?.missing ?? [];
        const charges=missing.map(key=>key==='freight'?copy('运费','freight'):copy('保险','insurance'));
        const message=charges.length
          ? copy(`补齐已确认的${charges.join('和')}后再核算 CIF 底价及是否达到目标利润率。`,`Confirm ${charges.join(' and ')} before using a CIF price floor or deciding whether the target margin is met.`)
          : copy('费用确认状态暂不可用。请刷新后重试。','Cost confirmation is unavailable. Reload and try again.');
        const note=document.createElement('p');
        note.className='suite-result-note';
        note.textContent=message;
        view.append(note);
        view.hidden=false;
        empty.hidden=true;
        status.textContent=copy('待补费用','Cost information needed');
        showFeedback(message,true);
        if (charges.length) trackTradeQuote('needs_info_'+mode);
        return;
      }
      output.textContent=JSON.stringify(result,null,2);
      let hasView=false;
      try {
        hasView=renderSuiteResult(view,result,{lang:zh?'zh':'en',toolId:tool.id,labels});
      } catch {
        view.replaceChildren();
      }
      textResult=primaryText(result);
      copyText.hidden=!textResult;
      showFormat(hasView);
      format.hidden=!hasView;
      actions.hidden=false;
      source.textContent=example?copy('示例输入','Example input'):copy('本次输入','Current input');
      source.hidden=false;
      empty.hidden=true;
      if (followup) followup.hidden=false;
      status.textContent=copy('结果已生成。','Result ready.');
      if (matchMedia('(max-width: 760px)').matches) find('#suite-result-panel').scrollIntoView({block:'start'});
      window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:`ai_suite_result_${mode}`}}));
      if (isTradeQuote) trackTradeQuote('ready_'+mode);
    });
    for (const fileInput of form.querySelectorAll('[data-suite-file]')) {
      const textarea=form.elements.namedItem(fileInput.dataset.fieldKey);
      const button=fileInput.previousElementSibling;
      button.addEventListener('click',()=>fileInput.click());
      fileInput.addEventListener('change',async()=>{
        const file=fileInput.files[0];
        fileInput.value='';
        if (!file) return;
        const version=++editVersion;
        try {
          if (file.size>textarea.maxLength*4+3) throw Error('length');
          const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
          if (text.length>textarea.maxLength) throw Error('length');
          if (text.includes('\0')) throw Error('encoding');
          if (version!==editVersion) return;
          textarea.value=text;
          edited();
          textarea.focus();
          showFeedback(copy('文件已读入，可以运行。','File loaded. Run the tool when ready.'));
        } catch(error) {
          if (version!==editVersion) return;
          showFeedback(error.message==='length'
            ? copy(`文件超过此字段的 ${textarea.maxLength} 字符上限。`,`This field accepts files of up to ${textarea.maxLength} characters.`)
            : copy('文件无法读取，请选择 UTF-8 编码的文本文件。','Choose a UTF-8 text file that can be opened.'),true);
        }
      });
    }
    readable.addEventListener('click',()=>showFormat(true));
    raw.addEventListener('click',()=>showFormat(false));
    async function copyResult(text,label) {
      const json=output.textContent;
      try {
        await navigator.clipboard.writeText(text);
        if (output.textContent===json) status.textContent=label;
      } catch {
        if (output.textContent===json) {
          showFormat(false);
          output.focus();
          status.textContent=copy('剪贴板不可用，可选中 JSON 后复制。','Select the JSON and copy it manually.');
        }
      }
    }
    find('[data-suite-copy]').addEventListener('click',()=>copyResult(output.textContent,copy('JSON 已复制。','JSON copied.')));
    copyText.addEventListener('click',()=>copyResult(textResult,copy('正文已复制。','Text copied.')));
    find('[data-suite-download]').addEventListener('click',()=>{
      const url=URL.createObjectURL(new Blob([output.textContent],{type:'application/json'}));
      const link=document.createElement('a');
      link.href=url;
      link.download=tool.id+'.json';
      link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    const mcp=find('#suite-mcp');
    function revealMcp() {
      if (location.hash==='#suite-mcp') mcp.open=true;
    }
    window.addEventListener('hashchange',revealMcp);
    revealMcp();
    form.querySelector('fieldset').disabled=false;
  } catch {
    status.textContent=copy('工具加载失败。可刷新页面，或使用下方 MCP 调用。','Reload to run this tool, or use the MCP instructions below.');
  }
}
