// Only fixed action names leave this module; never grades, scores or form content.
const zh=document.documentElement.lang.startsWith('zh');
const qa=new URLSearchParams(location.search);
const quiet=()=>qa.get('ci')==='1'||qa.get('__qa')==='1'||qa.get('__probe')==='1'||qa.get('utm_source')==='verify'||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
function event(name,label,where='home_focus'){if(quiet())return;try{window.gtag?.('event',name,{location:where+'_'+(zh?'zh':'en'),label});}catch{}}
document.addEventListener('click',e=>{const a=e.target.closest?.('[data-focus-action]');if(a)event('focus_entry',a.dataset.focusAction,document.querySelector('.focus-intro')?'home_focus':'evidence_context');});
const section=document.querySelector('[data-grade-lang]');
if(section){
  const $=id=>document.getElementById(id), W={delivered:1,undecided:.5,failed:0},OW={'On track':1,'Holding':1,'Exceeded':1,'Open':.5,'Pending':.5,'Wrong':0};
  const words=zh?{delivered:'已兑现',undecided:'未决',failed:'落空'}:{delivered:'Delivered',undecided:'Unresolved',failed:'Failed'};
  const names={'knowledge-work':'模型在知识工作上超越大学毕业生','compute-scaling':'算力与算法扩展按趋势继续','capex':'AI 资本开支大幅加速','open-source-fades':'开源式微，专有算法形成持久壁垒','agi-2027':'2027 年前后，AI 能完成研究员与工程师的工作','the-project':'美国政府启动正式 AGI 工程','intelligence-explosion':'出现智能爆炸','superintelligence':'出现超级智能'};
  let data=null,picks={},completed=false,started=false,loading=false;
  function reset(){picks={};completed=false;started=false;$('gg-result').hidden=true;$('gg-copy-fallback').hidden=true;$('gg-copy-status').textContent='';render();}
  function render(){
    $('gg-rows').replaceChildren();
    for(const p of data.predictions){
      const row=document.createElement('fieldset');row.className='grade-row';
      const legend=document.createElement('legend');legend.textContent=zh?names[p.id]:p.prediction;row.append(legend);
      const a=document.createElement('a');const u=new URL(p.detail,location.origin);const local=zh&&['open-source-fades','agi-2027'].includes(p.id);a.href=(local?'/zh':'')+u.pathname;a.className='grade-evidence';a.textContent=zh?(local?'先看这项证据':'先看这项证据（英文）'):'Read this prediction’s evidence';a.dataset.focusAction='grade_source';row.append(a);
      const options=document.createElement('div');options.className='grade-options';
      for(const [key,label] of Object.entries(words)){
        const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.id=p.id;b.dataset.grade=key;b.setAttribute('aria-pressed','false');
        b.addEventListener('click',()=>{
          if(!started){started=true;event('task_start','assessment','grade_game');}
          picks[p.id]=key;for(const other of options.children)other.setAttribute('aria-pressed',String(other===b));update();
        });options.append(b);
      }row.append(options);$('gg-rows').append(row);
    }update();
  }
  function update(){
    const n=Object.keys(picks).length,total=data.predictions.length;
    $('gg-live').textContent=zh?`已判断 ${n} / ${total} 项`:`Assessed ${n} of ${total} predictions`;
    if(n!==total)return;
    const mine=Math.round(data.predictions.reduce((sum,p)=>sum+W[picks[p.id]],0)/total*1000)/10;
    $('gg-score').textContent=mine;
    $('gg-verdict-line').textContent=zh?`台账为 ${data.thesisTracker.score}/100，记录日期 ${data.thesisTracker.asOf}。这两个分数都是判定综合值，不是概率。`:`The ledger reads ${data.thesisTracker.score}/100, dated ${data.thesisTracker.asOf}. Both scores summarize judgments; neither is a probability.`;
    const diffs=data.predictions.filter(p=>W[picks[p.id]]!==OW[p.verdict]);$('gg-diffs').replaceChildren();
    const note=document.createElement('p');note.textContent=zh?`${diffs.length} 项与台账不同。`:`${diffs.length} predictions differ from the ledger.`;$('gg-diffs').append(note);
    if(diffs.length){const ul=document.createElement('ul');for(const p of diffs){const li=document.createElement('li');const ours=Object.keys(W).find(k=>W[k]===OW[p.verdict]);li.textContent=zh?`${names[p.id]}：你选${words[picks[p.id]]}，台账为${words[ours]}。`:`${p.prediction}: you chose ${words[picks[p.id]]}; the ledger has ${p.verdict}.`;ul.append(li);}$('gg-diffs').append(ul);}
    $('gg-result').hidden=false;
    if(!completed){completed=true;event('task_complete','assessment','grade_game');}
  }
  $('gg-start').addEventListener('click',async()=>{
    if(loading)return;loading=true;$('gg-start').disabled=true;$('gg-wrap').hidden=false;
    $('gg-status').textContent=zh?'正在读取已发布的台账…':'Loading the published ledger…';
    try{
      const r=await fetch('/data.json');if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();
      if(!Array.isArray(d.predictions)||d.predictions.length!==8||!d.thesisTracker||!/^\d{4}-\d{2}-\d{2}$/.test(d.thesisTracker.asOf))throw Error('Invalid ledger');
      if(new Set(d.predictions.map(p=>p.id)).size!==8||d.predictions.some(p=>!(p.verdict in OW)||!names[p.id]||!p.detail||new URL(p.detail,location.origin).hostname!=='agiscorecard.com'))throw Error('Unknown prediction');
      const actual=Math.round(d.predictions.reduce((s,p)=>s+OW[p.verdict],0)/8*1000)/10;
      if(actual!==d.thesisTracker.score)throw Error('Score mismatch');
      data=d;$('gg-status').textContent='';$('gg-start').hidden=true;reset();
    }catch{
      $('gg-status').textContent=zh?'暂时无法核对台账。请重试，或通过上方入口查看原始证据。':'The ledger could not be verified. Retry, or use the evidence link above to inspect the original.';
      $('gg-start').textContent=zh?'重试读取':'Retry loading';
    }finally{loading=false;$('gg-start').disabled=false;}
  });
  $('gg-reset').addEventListener('click',reset);
  $('gg-copy').addEventListener('click',async()=>{
    if(!completed)return;
    const url='https://agiscorecard.com/'+(zh?'cn':'')+'?utm_source=reader_share&utm_medium=copy&utm_campaign=agi_focus_20261001#grade-game';
    const text=zh?`我给 AGI-2027 命题打 ${$('gg-score').textContent}/100 分，台账为 ${data.thesisTracker.score}/100（${data.thesisTracker.asOf}）。这是判断评分，不是概率。你会如何判断？\n${url}`:`I score the AGI-2027 thesis ${$('gg-score').textContent}/100. The ledger reads ${data.thesisTracker.score}/100 (${data.thesisTracker.asOf}). These are judgment scores, not probabilities. How would you assess it?\n${url}`;
    try{await navigator.clipboard.writeText(text);$('gg-copy-status').textContent=zh?'摘要和页面链接已复制。':'Summary and page link copied.';$('gg-copy-fallback').hidden=true;event('result_copy','assessment','grade_game');}
    catch{$('gg-copy-status').textContent=zh?'浏览器未允许复制，请手动复制下方内容。':'Copy was blocked. Copy the text below manually.';$('gg-copy-fallback').value=text;$('gg-copy-fallback').hidden=false;$('gg-copy-fallback').focus();$('gg-copy-fallback').select();}
  });
  // Deep links open the existing assessment; starting is counted only after a choice.
  const openHash=()=>{if(location.hash==='#grade-game'&&!data&&!loading)$('gg-start').click();};
  window.addEventListener('hashchange',openHash);openHash();
}
