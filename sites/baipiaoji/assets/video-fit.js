import {evaluateVideo,comparePerformance,reportMarkdown} from './video-fit-core.mjs';
const form=document.getElementById('vf-form');
if(form){
 const $=id=>document.getElementById(id), rules=JSON.parse($('video-fit-rules').textContent), video=$('vf-preview');
 const checkNames=['opening','proof','captions','audio','rights','ai','commercial','claim','destination'];
 const matchNames=['accountMatch','platformMatch','windowMatch','trafficMatch','contentMatch'];
 const tierLabels={priority:'优先小测',alternative:'备选',test:'可作测试',revise:'先修改', 'needs-info':'待补充',verify:'先核对现行规则'};
 let media=null,objectURL=null,mediaTicket=0,cleanupMetadata=()=>{},reading=false,lastResult=null,lastInput=null,isExample=false;
 const track=action=>document.dispatchEvent(new CustomEvent('manju:action',{detail:'video_'+action}));
 const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined&&text!==null)node.textContent=String(text);if(className)node.className=className;return node;};
 const say=(text,error=false)=>{$('vf-status').textContent=text;$('vf-status').dataset.error=String(error);};
 function invalidate(){lastResult=null;lastInput=null;$('vf-result').replaceChildren();$('vf-result').hidden=true;$('vf-report-actions').hidden=true;$('vf-export').disabled=true;$('vf-copy').disabled=true;$('vf-export-status').textContent='';}
 function updateUnknown(){const count=checkNames.filter(name=>form.elements[name].value==='unknown').length;$('vf-unknown-count').textContent=count?`${count} 项未确认`:'9 项已填写（本人自报）';}
 function clearMedia(){mediaTicket++;cleanupMetadata();cleanupMetadata=()=>{};reading=false;media=null;video.pause();video.removeAttribute('src');video.load();video.hidden=true;$('vf-preview-empty').hidden=false;if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}invalidate();}
 function fileError(text){clearMedia();$('vf-media-status').textContent=text;say(text,true);track('file_error');}
 function readFile(file){
  clearMedia();say('');
  if(!file){$('vf-media-status').textContent='没有选择视频。可重新选择，或切换为草稿。';return;}
  form.elements.mode.value='file';
  if(file.size>500*1024*1024){fileError('文件超过本工具的 500 MiB 本机选择上限。请换用较小文件，或切换草稿填写。');return;}
  if(file.type&&!file.type.startsWith('video/')){fileError('无法作为视频读取。请选浏览器支持的视频文件，或切换为草稿。');return;}
  reading=true;const ticket=mediaTicket;objectURL=URL.createObjectURL(file);video.hidden=false;$('vf-preview-empty').hidden=true;
  $('vf-media-status').textContent='正在本机读取视频时长和尺寸…';
  const fail=()=>{if(ticket!==mediaTicket)return;fileError('当前浏览器无法读取该视频。请更换兼容格式，或切换草稿手工填写。');};
  const ready=()=>{
   if(ticket!==mediaTicket)return;
   const durationSeconds=video.duration,width=video.videoWidth,height=video.videoHeight;
   if(!Number.isFinite(durationSeconds)||durationSeconds<=0||!width||!height){fail();return;}
   cleanupMetadata();cleanupMetadata=()=>{};reading=false;
   media={durationSeconds,width,height,bytes:file.size};
   $('vf-media-status').textContent=`本机已读取：${Math.round(durationSeconds*10)/10} 秒 · ${width} × ${height} · ${(file.size/1024/1024).toFixed(1)} MiB。仅为媒体参数，不代表理解内容。`;
   say('视频已就绪。继续说明受众并检查发布准备。');track('file_ready');
  };
  const timeout=setTimeout(()=>{if(ticket===mediaTicket)fileError('读取超过 12 秒，已停止。请更换文件，或切换草稿手工填写。');},12000);
  video.addEventListener('loadedmetadata',ready);video.addEventListener('error',fail);
  cleanupMetadata=()=>{clearTimeout(timeout);video.removeEventListener('loadedmetadata',ready);video.removeEventListener('error',fail);};
  video.src=objectURL;video.load();
 }
 const numberValue=value=>String(value).trim()===''?null:Number(value);
 function input(){const data=Object.fromEntries(new FormData(form));data.durationSeconds=numberValue(data.durationSeconds);return data;}
 function list(parent,items,tag='ul'){if(!items?.length)return;const node=el(tag);for(const item of items)node.append(el('li',item));parent.append(node);}
 function notes(parent,title,items){if(!items?.length)return;const box=el('section',null,'vf-missing');box.append(el('h3',title));list(box,items);parent.append(box);}
 function sourceLinks(ids){const nav=el('nav',null,'vf-source-links');nav.setAttribute('aria-label','报告依据来源');for(const id of [...new Set(ids||[])]){const all=[rules.globalEvidence,...rules.platforms.flatMap(p=>p.sources)].filter(Boolean),source=all.find(s=>s.id===id);if(!source)continue;const link=el('a',source.title);link.href='#vf-source-'+id;link.addEventListener('click',()=>{const group=$('vf-source-'+id)?.closest('details');if(group)group.open=true;});nav.append(link);}return nav;}
 function render(result){
  const out=$('vf-result');out.replaceChildren();out.hidden=false;
  const head=el('header',null,'vf-report-head');
  if(isExample)head.append(el('p','合成草稿示例：用于了解工具，不是真实发布或结果','vf-example-label'));
  head.append(el('h2',{'needs-info':'先补充信息，再决定测试方向',revise:'先处理这些问题，再安排发布',test:'已有测试方向，用实际表现验证'}[result.status]||'发布准备评估'));
  const names=(result.priority||[]).map(id=>rules.platforms.find(p=>p.id===id)?.name||id);
  head.append(el('p',names.length?'优先小测：'+names.join('、'):'本次不指定优先平台。请按下方缺项或并列候选说明继续判断。'));
  if(result.alternate)head.append(el('p','备选：'+(rules.platforms.find(p=>p.id===result.alternate)?.name||result.alternate)));
  if(result.measured)head.append(el('p',`本机实测：${Math.round(result.measured.durationSeconds*10)/10} 秒，${result.measured.width} × ${result.measured.height}。尺寸与时长不能说明故事质量。`));
  head.append(el('p','这份报告是发布假设，不是爆款预测或平台审核结论。'));out.append(head);
  notes(out,'需要解决的不一致',result.conflicts);notes(out,'发布前先处理',result.blockers);notes(out,'仍需补充或确认',result.unknown);
  if(result.topActions?.length){const section=el('section',null,'vf-top-actions');section.append(el('h3','最值得先做的修改'));const items=el('ol');for(const item of result.topActions){const li=el('li');li.append(el('strong',item.text),el('span',`依据：${item.basis}；触发：${item.trigger}`,'vf-basis'));items.append(li);}section.append(items);out.append(section);}
  const platforms=el('section',null,'vf-platform-list');platforms.append(el('h3','六个平台分别怎么看'));
  for(const platform of result.platforms||[]){
   const details=el('details',null,'vf-platform');details.dataset.platform=platform.id;if((result.priority||[]).includes(platform.id)){details.dataset.vfPriority=platform.id;details.open=true;}
   const summary=el('summary');summary.append(el('strong',platform.name),el('span',tierLabels[platform.tier]||'待核对','vf-tier vf-tier-'+platform.tier));details.append(summary);
   const body=el('div',null,'vf-platform-body'),reasons=el('ul');
   for(const reason of platform.reasons||[]){const li=el('li');li.append(el('span',reason.text),el('span',`依据：${reason.basis}；触发：${reason.trigger}`,'vf-basis'));reasons.append(li);}body.append(reasons);
   if(platform.actions?.length){body.append(el('h4','这个版本可以怎么改'));list(body,platform.actions);}
   if(platform.experiment){const card=el('section',null,'vf-experiment');card.append(el('h4','发布测试卡'));for(const [key,label] of [['variant','只改一个变量'],['control','比较方式'],['window','观察窗口'],['metric','主要观察指标']])if(platform.experiment[key])card.append(el('p',`${label}：${platform.experiment[key]}`));body.append(card);}
   body.append(sourceLinks(platform.sourceIds));details.append(body);platforms.append(details);
  }out.append(platforms);
  if(result.supplied?.length){const details=el('details');details.append(el('summary','已提供的信息与证据类型'));list(details,result.supplied);out.append(details);}
  const limits=el('div',null,'vf-limitations');list(limits,result.limitations);limits.append(el('p',`规则版本：${result.version||rules.version}；来源核查：${rules.checkedAt}。同一题材不代表同一表现。`));out.append(limits);
  $('vf-report-actions').hidden=false;$('vf-export').disabled=isExample;$('vf-copy').disabled=isExample;
  $('vf-export-status').textContent=isExample?'此为示例编辑，修改后也不计入真实完成。点击“清空”后填写自己的信息即可导出。':'';
 }
 function evaluate(){
  if(reading){say('视频还在读取，请稍候，或切换为草稿。',true);return;}
  try{lastInput=input();lastResult=evaluateVideo(lastInput,media,rules);render(lastResult);say(isExample?'已生成合成示例。可继续修改试用；点击“清空”后开始真实评估。':'评估已生成。文字与视频均未上传；修改输入后需重新评估。');track(isExample?'example':'complete');$('vf-result').focus({preventScroll:true});$('vf-result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  catch{invalidate();say('暂时无法生成报告，请检查输入或清空后重试。',true);}
 }
 form.addEventListener('submit',event=>{event.preventDefault();evaluate();});
 form.addEventListener('input',event=>{if(event.target===$('vf-file'))return;invalidate();updateUnknown();say(isExample?'示例输入已修改，可重新试评估；开始真实评估请先清空。':'输入已修改，请重新生成评估。');});
 form.addEventListener('change',event=>{if(event.target.name==='mode'){clearMedia();$('vf-file').value='';$('vf-media-status').textContent=event.target.value==='draft'?'草稿模式：请填写预计时长与画幅，未确定可留空。':'请选择本机视频；仅在当前浏览器读取。';}if(event.target!==$('vf-file')){invalidate();updateUnknown();}});
 $('vf-file').addEventListener('change',()=>readFile($('vf-file').files[0]));
 video.addEventListener('error',()=>{if(media&&!reading)fileError('视频预览出现读取错误，已清除旧参数与报告。请换用兼容格式，或切换草稿。');});
 $('vf-reset').addEventListener('click',()=>{clearMedia();form.reset();isExample=false;updateUnknown();$('vf-performance-form').reset();$('vf-performance-result').replaceChildren();$('vf-performance-result').className='';$('vf-media-status').textContent='也可以直接填写草稿。文件上限 500 MiB；不会识别画面或台词。';say('已清空本页输入与报告，没有保存副本。');});
 $('vf-example').addEventListener('click',()=>{clearMedia();form.reset();const sample={mode:'draft',contentType:'general',goal:'views',title:'把桌面收整齐的三个步骤',audience:'想改善居家工作桌面的人',hook:'先展示整理后的桌面，再展示整理前的状态。',summary:'用自己拍摄的画面演示三步整理方法，同时说明小桌面的限制。此为合成草稿示例。',durationSeconds:75,aspect:'vertical',opening:'result',proof:'steps',captions:'yes',audio:'clear',rights:'confirmed',ai:'not_applicable',commercial:'not_applicable',claim:'supported',destination:'not_applicable'};for(const [name,value] of Object.entries(sample))form.elements[name].value=value;isExample=true;updateUnknown();$('vf-media-status').textContent='合成草稿示例，没有读取真实视频。';evaluate();});
 function report(){return lastResult&&!isExample?reportMarkdown(lastResult,lastInput):null;}
 $('vf-export').addEventListener('click',()=>{const text=report();if(!text)return;const blob=new Blob([text],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download='帧选-视频发布评估.md';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('vf-export-status').textContent='已发起文字报告下载，请保管本机文件。';track('export');});
 $('vf-copy').addEventListener('click',async()=>{const text=report();if(!text)return;try{await navigator.clipboard.writeText(text);$('vf-export-status').textContent='报告已复制到剪贴板。';track('export');}catch{$('vf-export-status').textContent='浏览器未允许复制，请使用下载文字报告。';}});
 $('vf-performance-form').addEventListener('submit',event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));for(const key of ['current','baseline','baselineCount'])data[key]=numberValue(data[key]);for(const key of matchNames)data[key]=event.currentTarget.elements[key].checked;const result=comparePerformance(data),out=$('vf-performance-result');out.replaceChildren();out.className='vf-performance-result';out.append(el('strong',{invalid:'先修正数值',incomparable:'当前条件不能直接比较',descriptive:'仅作描述性比较',compared:'可比条件下的描述结果'}[result.status]||'实际表现记录'));
 const platformName=rules.platforms.find(p=>p.id===data.platform)?.name||'未选择';
 const windowLabel={'24h':'发布后 24 小时','72h':'发布后 72 小时','7d':'发布后 7 天'}[data.window]||'未选择';
 const metricLabel={views:'播放量',follows:'新增关注数',activations:'实际激活数'}[data.metric]||'未选择';
 out.append(el('p',`平台：${platformName}；观察窗口：${windowLabel}；指标：${metricLabel}。`));
 const values=el('dl',null,'vf-comparison-values');
 for(const [key,label,attribute] of [['current','本条数值','current'],['baseline','历史中位数','baseline'],['baselineCount','历史样本','count']]){
  const group=el('div'),value=result[key]===null||result[key]===undefined?(data[key]===null?'未填写':'数值无效，请修正'):String(result[key])+(key==='baselineCount'?' 条':'');
  group.append(el('dt',label));const detail=el('dd',value);detail.setAttribute('data-vf-'+attribute,'');group.append(detail);values.append(group);
 }
 out.append(values,el('p','以上均为本人回填；缺失或不可比时不计算提升。','vf-basis'));
 if(result.delta!==null&&result.delta!==undefined)out.append(el('p',`与自报历史中位数相比，绝对变化 ${result.delta>0?'+':''}${result.delta}。`));if(result.relative!==null&&result.relative!==undefined)out.append(el('p',`相对变化 ${(result.relative*100).toFixed(1)}%。这不是因果证明或爆款结论。`));list(out,result.notes);if(['descriptive','compared'].includes(result.status))track('compare');});
 $('vf-performance-form').addEventListener('input',()=>{$('vf-performance-result').replaceChildren();$('vf-performance-result').className='';});
 window.addEventListener('pagehide',clearMedia);
 updateUnknown();
 $('vf-evaluate').disabled=false;$('vf-compare').disabled=false;
}
