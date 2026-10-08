import {VERSION,relevantMemory,followupDraft,correctionDraft,findingCorrectionDraft,markdown,safeURL,citedSources} from './core.mjs';
const zh=document.body.dataset.lang==='zh',lang=zh?'zh':'en',t=(en,cn)=>zh?cn:en,$=s=>document.querySelector(s);
const LINK='agi-jarvis-registration-v1';
const KEY='agi-jarvis-key-v1',MEM='agi-jarvis-memory-v1',MEMBER_KEY='workbench-member-key:agi';let tasks=[],selected=null,busy=false,poll=null,membership=null,credential='',authEpoch=0,pendingCreate=null,followupPrepared=false,correctionPrepared=false;
const observed=new Set();
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const uid=bytes=>[...crypto.getRandomValues(new Uint8Array(bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
const event=name=>{if(!new URL(location.href).searchParams.has('__qa'))dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'jarvis_'+name}}));};
const status=text=>{$('#status').textContent=text;};
function storageGet(k){try{return localStorage.getItem(k);}catch{return null;}}
function storageSet(k,v){try{localStorage.setItem(k,v);return localStorage.getItem(k)===v;}catch{return false;}}
function memberKey(){try{return sessionStorage.getItem(MEMBER_KEY)||storageGet(KEY)||'';}catch{return storageGet(KEY)||'';}}
function memorySlot(){return membership?MEM+':'+membership.scope:null;}
function memories(){if(!membership)return [];try{const m=JSON.parse(storageGet(memorySlot())||'[]');return Array.isArray(m)?m.filter(s=>typeof s==='string'&&s.length<=300).slice(0,8):[];}catch{return [];}}
function lock(message=''){
 authEpoch++;membership=null;pendingCreate=null;followupPrepared=false;correctionPrepared=false;$('#trial-notice').hidden=true;tasks=[];selected=null;observed.clear();clearTimeout(poll);
 $('#workspace').hidden=true;$('#member-bar').hidden=true;$('#member-gate').hidden=false;$('#member-status').textContent=message;
 $('#task-detail').replaceChildren();$('#task-list').replaceChildren();$('#memory').value='';$('#goal').value='';$('#selected-memories').replaceChildren();$('#public-query').value='';$('#cloud-consent').checked=false;
 $('#task-form').reset();$('#public-query-label').hidden=true;$('#public-query').required=false;status('');
}
function permitted(){if(membership&&credential===memberKey())return true;lock(t('Open your private workspace to continue.','请打开私有工作区后继续。'));return false;}
function unlock(value){
 const changed=membership?.scope!==value.scope;membership=value;$('#workspace').hidden=false;$('#member-gate').hidden=true;$('#member-bar').hidden=false;$('#member-key').value='';
 $('#member-until').textContent=value.member?t('AGI account · free Jarvis access','AGI 账号 · 贾维斯免费使用'):value.trialRemaining?t('Guest · 1 free task available','访客 · 剩余 1 次免费试用'):t('Guest trial used · register free to continue','访客试用已使用 · 免费注册后继续');
 updateTrial();
 if(changed){const legacy=storageGet(MEM);if(legacy&&storageGet(KEY)&&!storageGet(memorySlot())&&storageSet(memorySlot(),legacy)){try{localStorage.removeItem(MEM);}catch{}}$('#memory').value=memories().join('\n');renderMemories();}

}
function registrationLink(){try{const link=JSON.parse(sessionStorage.getItem(LINK)||'null');return link&&/^[a-f0-9]{64}$/.test(link.key)&&/^[a-f0-9]{64}$/.test(link.scope)&&Date.now()-link.at<1800000?link:null;}catch{return null;}}
function updateTrial(){
 const guest=!!membership&&!membership.member,used=guest&&membership.trialRemaining===0;
 $('#trial-notice').hidden=!guest;$('#trial-message').textContent=used?t('The guest trial allowance is used, including this network’s daily limit. Register a free AGI account to start another task or daily watch. Existing results remain available to read, export and delete.','访客试用次数已用完（含同 IP 限额）。免费注册 AGI 账号后，可新建任务或开启每日跟踪；已有结果仍可查看、导出和删除。'):t('Try one task free before registering. A saved submission uses the trial even if only a source pack is available.','注册前可免费试用一个任务。任务保存成功即使用这次机会，即使最终只能获得资料包。');
 $('#cadence option[value="daily"]').disabled=guest;if(guest)$('#cadence').value='once';$('#start').disabled=busy||used;
 $('#member-open').href=(zh?'/zh':'')+'/discuss/account'+(membership?.member?'':'?from=jarvis');
 $('#member-open').textContent=membership?.member?t('My free AGI account','我的免费 AGI 账号'):t('Register / sign in free','免费注册 / 登录');
}
function startAllowed(){if(!permitted())return false;if(!membership.member&&membership.trialRemaining===0){$('#trial-notice').scrollIntoView({block:'center'});$('#register-open').focus();return false;}return true;}
function rememberRegistration(){
 if(!membership)return;
 if(membership.member){sessionStorage.removeItem(LINK);return;}
 const value=JSON.stringify({key:credential,scope:membership.scope,at:Date.now()});sessionStorage.setItem(LINK,value);if(sessionStorage.getItem(LINK)!==value)throw Error('storage_unavailable');
}
function registerHere(e){
 try{rememberRegistration();}catch{e.preventDefault();return fail(Error('storage_unavailable'));}
 if(!membership?.member)event('registration_open');
}
async function api(body){
 const token=memberKey(),epoch=authEpoch;if(token!=='fleet'&&!/^[a-f0-9]{64}$/.test(token))throw Error('unauthorized');
 const link=registrationLink();
 const r=await fetch('/api/jarvis'+(body?'':'/tasks'),{method:body?'POST':'GET',headers:{authorization:token==='fleet'?'Fleet':'Bearer '+token,...(!body&&link&&link.key!==token?{'x-jarvis-legacy-key':link.key}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 let j;try{j=await r.json();}catch{throw Error('unavailable');}if(epoch!==authEpoch||token!==memberKey())throw Error('auth_changed');if(!r.ok||!j.ok)throw Error(j.code||'unavailable');
 if(!body&&link&&j.membership?.member){const old=storageGet(MEM+':'+link.scope),next=MEM+':'+j.membership.scope;if(old&&!storageGet(next))storageSet(next,old);try{sessionStorage.removeItem(LINK);}catch{}event('member_verified');}
 return j;
}
const errors={registration_required:t('Your free trial is used. Register a free AGI account to continue; no payment is required.','免费试用已使用，请免费注册 AGI 账号后继续，无需付费。'),request_timeout:t('The upload timed out. Please try again.','上传超时，请重试。'),rate_limited:t('The shared limit is reached. Your existing results are safe. Try again after the quota window resets.','已达到共享额度，现有结果仍保留。请在额度窗口重置后再试。'),active_limit:t('Pause an active mission or delete an old task (3 active, 20 saved maximum).','请先暂停正在执行的任务或删除旧记录（最多 3 个活动任务、20 条记录）。'),storage_unavailable:t('Browser storage is unavailable. Enable it before submitting so you can return to your private tasks.','浏览器存储不可用。请先启用存储，再提交任务，以便回来查看私有记录。'),cannot_resume:t('This task cannot resume. Start a new mission for another seven-day window.','本任务已不能恢复，可新建任务开始下一轮跟踪。'),unauthorized:t('The private browser key is missing or invalid.','本浏览器的私有访问密钥缺失或无效。'),invalid_request:t('Check the goal, language, memories and cloud consent.','请检查目标、记忆与云端执行选项。')};
function fail(e){if(e.message==='auth_changed')return;if(e.message==='registration_required'&&membership&&!membership.member){membership.trialRemaining=0;updateTrial();}if(['access_blocked','unauthorized'].includes(e.message)){lock(t('This workspace key is unavailable. Try your saved key or continue with this browser.','此工作区密钥暂不可用。请检查已保存的密钥，或使用本浏览器继续。'));return;}const message=errors[e.message]||t('Could not verify access. Please try again.','暂时无法验证访问权限，请重试。');if(!membership)$('#member-status').textContent=message;else status(message);}
const labels={queued:t('Queued','等待执行'),running:t('Working','执行中'),watching:t('Daily watch active','每日跟踪中'),completed:t('Draft ready','草稿已生成'),limited:t('Source pack only','仅资料包'),paused:t('Paused','已暂停')};
const reasons={model_interrupted:t('The previous model call has an unknown outcome. Its attempt is retained and was not repeated.','上次模型调用的结果未知。已保留调用次数，未重复调用。'),search_rate_limited:t('The public search allowance is exhausted. Try again after the quota window resets.','公开检索额度已耗尽，请在额度窗口重置后重试。'),evidence_unavailable:t('The requested public evidence was not retrieved. AI synthesis was skipped.','未取得本次需要的公开证据，已跳过 AI 综合。'),rate_limited:t('The shared model allowance is exhausted.','共享模型额度已耗尽。'),ai_unavailable:t('The model is unavailable.','模型暂不可用。'),model_unavailable:t('The model provider did not return a usable response.','模型服务未返回可用结果。'),model_timeout:t('The model response timed out.','模型响应超时。'),invalid_model_output:t('The model output did not pass format or citation checks.','模型输出未通过格式或引用检查。'),run_failed:t('The run could not finish.','本次运行未完成。')};
function date(n){return new Date(n*1000).toLocaleString(zh?'zh-CN':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
function renderList(){const list=$('#task-list');list.replaceChildren();if(!tasks.length){list.append(el('p',t('Start with one real task. Your results will stay here for 30 days.','从一项真实任务开始，结果会在这里保留 30 天。'),'quiet'));return;}
 for(const task of tasks){const b=el('button',undefined,'mission-item');b.type='button';b.setAttribute('aria-current',String(task.id===selected));b.append(el('strong',task.input.goal.slice(0,85)),el('span',(labels[task.status]||task.status)+' · '+date(task.created)));b.onclick=()=>{selected=task.id;render();};list.append(b);}}
function btn(text,fn,cls='secondary'){const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;}
async function mutate(action,extra={}){if(busy||!permitted())return;busy=true;try{await api({action,id:selected,...extra});if(action==='delete')selected=null;event(action);await refresh();}catch(e){fail(e);}finally{busy=false;updateTrial();}}
function prepareFollowup(task,nextAction){
 if(!startAllowed())return;
 selected=null;render();$('#task-form').reset();pendingCreate=null;$('#public-query-label').hidden=true;$('#public-query').required=false;
 for(const input of document.querySelectorAll('[data-memory]'))input.checked=false;
 $('#goal').value=followupDraft(task.input.goal,nextAction?.action,nextAction?.doneWhen,lang);followupPrepared=true;correctionPrepared=false;renderMemories();$('#goal').focus();
 event('followup_prepare');status(t('Add what happened, review the context, then start a new mission. Nothing is submitted yet.','补充实际结果并核对上下文后，再开始新任务；目前尚未提交。'));
}
function prepareCorrection(task,reason,finding=null){
 if(!startAllowed())return;
 selected=null;render();$('#task-form').reset();pendingCreate=null;$('#public-query-label').hidden=true;$('#public-query').required=false;
 for(const input of document.querySelectorAll('[data-memory]'))input.checked=false;
 $('#goal').value=finding?findingCorrectionDraft(task.input.goal,finding,task.result?.sources,lang):correctionDraft(task.input.goal,reason,lang);followupPrepared=false;correctionPrepared=true;renderMemories();$('#goal').focus();
 event('correction_prepare');status(finding?t('The selected interpretation and its cited metadata are in an editable draft. Add what is missing, then review and submit it yourself.','已把所选解读及其引用信息放入可编辑草稿。请补充缺失内容，核对后再自行提交。'):t('Add the missing detail, review the context, then start a corrected mission. Nothing is submitted yet.','补充缺失信息并核对上下文后，再开始修正任务；目前尚未提交。'));
}
function render(){renderList();const task=tasks.find(x=>x.id===selected);$('#compose').hidden=!!task;const d=$('#task-detail');d.hidden=!task;if(!task)return;d.replaceChildren();
 const r=task.result||{},top=el('div',undefined,'status-line');top.append(el('span',labels[task.status]||task.status,'status-pill'),el('span',t('Run ','已运行 ')+task.runs+(task.input.cadence==='daily'?' / 7':'')));d.append(top,el('h2',task.input.goal,'mission-title'));
 const pipeline=el('ol',undefined,'pipeline'),steps=[['observe',t('Observe','观察')],['plan',t('Plan','规划')],['tools',t('Use tools','调用工具')],['verify',t('Check','检查')],['complete',t('Deliver','交付')]],stage=task.stage==='thinking'?'plan':task.stage;
 for(const [id,label] of steps)pipeline.append(el('li',label,(id===stage||stage==='complete')?'active':''));d.append(pipeline);
 if(task.status==='queued'||task.status==='running')d.append(el('p',t('This task is saved. You can leave this page; the background runner checks queued work about every two hours; scheduled checks can be delayed.','任务已保存。你可以离开页面，后台约每两小时检查待执行任务，调度可能延迟。'),'notice'));
 if(task.stage==='interrupted')d.append(el('p',t('The previous worker stopped before completion. Run again resumes saved steps; an uncertain model call will not repeat.','上次运行中断。重新运行将接续已保存步骤；结果未知的模型调用不会重复执行。'),'notice'));
 if(['membership_required','access_blocked','registration_required'].includes(task.stage))d.append(el('p',t('Previously paused for access verification. Review this task and choose Run again to continue.','任务此前因访问验证而暂停。请核对任务，再点击重新运行。'),'notice'));
 if(r.reason)d.append(el('p',(reasons[r.reason]||reasons.run_failed)+' '+t('These are retrieved sources, not a completed AI report.','以下是检索到的资料，不是已完成的 AI 报告。'),'notice'));
	 if(r.report){d.append(el('p',t('AI draft · check the original sources before relying on it.','AI 草稿 · 使用前请核对原始来源。'),'notice'),el('p',r.report.summary,'report-summary'));if(r.report.findings.length)d.append(el('h3',t('AI interpretations to check','AI 解读（待核对）')));
	  for(const f of r.report.findings){const n=el('div',undefined,'finding');n.append(el('p',f.text));const evidence=el('details',undefined,'finding-evidence'),items=citedSources(f,r.sources);evidence.append(el('summary',t('Inspect cited source metadata','核阅引用来源信息')+' ('+items.length+')'));evidence.append(el('p',t('These source details help inspection; they do not prove the interpretation.','这些来源信息便于核查，但不能证明解读正确。'),'quiet small'));for(const s of items){const card=el('div',undefined,'finding-source'),href=safeURL(s.url);if(href){const a=el('a','['+s.id+'] '+s.title);a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.onclick=()=>event('source_open');card.append(a);}else card.append(el('strong','['+s.id+'] '+s.title));card.append(el('p',s.description||'','quiet'));evidence.append(card);}n.append(evidence,btn(t('Revise this finding','修正这条解读'),()=>prepareCorrection(task,'sources',f),'text-button finding-correction'));d.append(n);}
  d.append(el('h3',t('Next actions to try','建议尝试的下一步')));for(const a of r.report.nextActions){const n=el('div',undefined,'next-action');n.append(el('strong',a.action),el('p',t('Done when: ','完成标准：')+a.doneWhen,'quiet'),btn(t('Use as follow-up','接着做这一步'),()=>prepareFollowup(task,a),'text-button'));d.append(n);}
  d.append(el('h3',t('What is still uncertain','仍然不确定的部分')));const ul=el('ul');for(const u of r.report.uncertainties)ul.append(el('li',u));d.append(ul);
  d.append(el('p',t('Citation IDs were checked. They do not prove every interpretation is correct; inspect the linked sources.','已检查引用编号，但这不代表每条解读都正确，请核阅原始来源。'),'quiet small'));
 }
 if(r.sources){d.append(el('h3',t('Sources you can inspect','可以核阅的来源')+' ('+r.sources.length+')'));if(!r.sources.length)d.append(el('p',t('No matching sources were retrieved. Refine the goal or enable public search.','未检索到匹配来源，可以细化目标或启用公开搜索。'),'quiet'));
  for(const s of r.sources){const n=el('div',undefined,'source');n.id='source-'+s.id;const href=safeURL(s.url);if(href){const a=el('a',s.title);a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.onclick=()=>event('source_open');n.append(a);}else n.append(el('strong',s.title));n.append(el('p',s.description||'','quiet'));const kinds={editorial_view:t('Editorial view','编辑观点'),discovered_metadata:t('Unreviewed publisher metadata','未核阅的发布者元数据'),repository_metadata:t('Repository metadata','仓库元数据'),discussion_metadata:t('Discussion metadata','讨论元数据'),arithmetic:t('Arithmetic','算术结果')};n.append(el('span',(kinds[s.kind]||s.kind)+' · '+(s.publishedAt||s.updatedAt||s.checkedAt||'').slice(0,10),'source-id'));d.append(n);}
 }
 if(task.nextRun)d.append(el('p',t('Next background check: ','下次后台检查：')+date(task.nextRun),'quiet'));if(task.previous?.summary){const previous=el('details');previous.append(el('summary',t('Previous result','上次结果')),el('p',task.previous.summary,'quiet'));d.append(previous);}
 const actions=el('div',undefined,'task-actions');actions.append(btn(t('Refresh','刷新'),()=>refresh()),btn(t('Export result','导出结果'),()=>{if(!permitted())return;const blob=new Blob([markdown(task)],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='jarvis-result.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);event('export');}));
 if(['queued','running','watching'].includes(task.status))actions.append(btn(t('Pause','暂停'),()=>mutate('pause')));
 else if(task.runs<7&&task.until>Date.now()/1000&&(membership?.member||task.runs===0))actions.append(btn(t('Run again','重新运行'),()=>mutate('resume')));
 actions.append(btn(t('Continue with this goal','继续这个目标'),()=>prepareFollowup(task)));
 actions.append(btn(t('Delete task','删除任务'),()=>{if(confirm(t('Delete this task and its saved result?','删除本任务及保存的结果？')))mutate('delete');},'danger'));d.append(actions);
 if(r.report||task.stage==='source_pack'){const fb=el('div',undefined,'feedback');fb.append(el('span',t('Did this help with your task?','这次结果对你的任务有帮助吗？'),'quiet'));for(const [value,label]of [['useful',t('Useful','有用')],['not_useful',t('Not yet','还没有')]]){const b=btn(label,()=>mutate('feedback',{value}));b.setAttribute('aria-pressed',String(task.feedback===value||value==='not_useful'&&task.feedback?.startsWith('not_useful_')));fb.append(b);}d.append(fb);
  if(task.feedback?.startsWith('not_useful')){const recovery=el('div',undefined,'feedback-recovery');recovery.append(el('p',t('What should Jarvis correct? Choose one; no task text is sent to analytics.','贾维斯应该修正什么？请选择一项；任务正文不会发送到统计。'),'quiet small'));const options=[['sources',t('Sources did not support it','来源不足以支持')],['answer',t('Answer missed my goal','回答偏离目标')],['action',t('Next step was impractical','下一步不可执行')],['other',t('Another reason','其他原因')]];for(const [reason,label]of options){const value='not_useful_'+reason,b=btn(label,()=>mutate('feedback',{value}),'secondary');b.setAttribute('aria-pressed',String(task.feedback===value));recovery.append(b);}if(/^not_useful_(sources|answer|action|other)$/.test(task.feedback))recovery.append(btn(t('Revise and retry','修正后重试'),()=>prepareCorrection(task,task.feedback.slice(11))));d.append(recovery);}}
 const ex=el('details',undefined,'execution');ex.append(el('summary',t('Execution record','执行记录')+' · '+(r.modelCalls||0)+t(' model calls',' 次模型调用')));const ol=el('ol');for(const x of r.log||[])ol.append(el('li',x.step+': '+x.outcome));ex.append(ol,el('p',t('Only the listed tools ran. Proposed actions are not completed actions.','仅执行了记录中的工具，建议行动不等于已完成行动。'),'quiet small'));d.append(ex);
 d.append(el('p',t('Task expires: ','任务记录到期：')+date(task.expires),'quiet small'));
}
async function refresh(){try{const j=await api();if(!j.membership||!/^[a-f0-9]{64}$/.test(j.membership.scope))throw Error('unauthorized');unlock(j.membership);tasks=j.tasks;for(const task of tasks){const k=task.id+':'+task.runs;if(task.runs&&!observed.has(k)){observed.add(k);if(task.result?.report)event('report_ready');else if(task.stage==='source_pack')event('source_pack');}}
 if(selected&&!tasks.some(x=>x.id===selected))selected=null;render();status('');schedulePoll();}catch(e){fail(e);schedulePoll();}}
function schedulePoll(){clearTimeout(poll);if(!document.hidden&&tasks.some(x=>['queued','running'].includes(x.status)))poll=setTimeout(refresh,10000);}
function renderMemories(){const selectedTexts=new Set([...document.querySelectorAll('[data-memory]:checked')].map(x=>x.value)),m=memories(),suggested=relevantMemory($('#goal').value,m);const box=$('#selected-memories');box.replaceChildren();if(!m.length)return;box.append(el('p',t('Include up to 3 memories in this task:','为本次任务选择最多 3 条记忆：'),'quiet'));const sorted=[...suggested,...m.filter(x=>!suggested.includes(x))];for(const text of sorted){const label=el('label',undefined,'check'),input=el('input');input.type='checkbox';input.dataset.memory='';input.value=text;input.checked=selectedTexts.has(text);input.onchange=()=>{if(document.querySelectorAll('[data-memory]:checked').length>3){input.checked=false;status(t('Choose at most 3 memories.','最多选择 3 条记忆。'));}};label.append(input,document.createTextNode(text));box.append(label);}}
$('#memory').value=memories().join('\n');$('#save-memory').onclick=()=>{if(!permitted())return;const lines=$('#memory').value.split('\n').map(s=>s.trim()).filter(Boolean);if(lines.length>8||lines.some(s=>s.length>300)){status(t('Use up to 8 lines, with at most 300 characters each.','最多 8 行，每行不超过 300 个字符。'));return;}if(!storageSet(memorySlot(),JSON.stringify([...new Set(lines)])))return fail(Error('storage_unavailable'));renderMemories();status(t('Memories saved on this device.','记忆已保存在本机。'));event('memory_save');};
$('#goal').addEventListener('change',renderMemories);$('#new-task').onclick=()=>{if(!startAllowed())return;followupPrepared=false;correctionPrepared=false;selected=null;render();$('#goal').focus();};
const examples=zh?['我每周花两小时整理工作报告。研究可以采用的 AI 工作流程，并设计一个本周能验证的小测试。','研究一个面向独立开发者的低成本 AI 助手产品：比较已有方案，列出反对理由和最小需求验证。','我想用每周三小时学习 AI Agent 开发。制定一个以可运行作品为目标的学习计划，并找出可参考的来源。']:['I spend two hours preparing a weekly report. Research a practical AI workflow and design a small test I can run this week.','Research a low-cost AI assistant for solo developers. Compare existing approaches, state the strongest counterargument and propose a small demand test.','I have three hours a week to learn AI agent development. Build a learning plan around a working project and find useful sources.'];
$('#web').onchange=()=>{$('#public-query-label').hidden=!$('#web').checked;$('#public-query').required=$('#web').checked;};
for(const b of document.querySelectorAll('[data-example]'))b.onclick=()=>{if(!permitted())return;followupPrepared=false;correctionPrepared=false;$('#goal').value=examples[Number(b.dataset.example)];$('#public-query').value=['AI workflow','personal AI agent','AI agent tutorial'][Number(b.dataset.example)];renderMemories();$('#goal').focus();};
$('#task-form').onsubmit=async e=>{e.preventDefault();if(busy||!startAllowed())return;busy=true;$('#start').disabled=true;status(t('Saving your mission…','正在保存任务…'));try{const input={action:'create',goal:$('#goal').value,lang,cadence:$('#cadence').value,web:$('#web').checked,publicQuery:$('#public-query').value,consent:$('#cloud-consent').checked,memory:[...document.querySelectorAll('[data-memory]:checked')].map(x=>x.value),nonce:''},wasFollowup=followupPrepared,wasCorrection=correctionPrepared;const fingerprint=JSON.stringify(input);if(!pendingCreate||pendingCreate.fingerprint!==fingerprint)pendingCreate={fingerprint,nonce:uid(16)};input.nonce=pendingCreate.nonce;const j=await api(input);pendingCreate=null;followupPrepared=false;correctionPrepared=false;if(!membership.member)membership.trialRemaining=0;updateTrial();selected=j.task.id;tasks=tasks.filter(x=>x.id!==j.task.id);tasks.unshift(j.task);render();event('start');if(wasFollowup)event('followup_start');if(wasCorrection)event('correction_start');schedulePoll();status(t('Saved. Your mission is queued.','已保存，任务正在等待执行。'));}catch(e){fail(e);}finally{busy=false;updateTrial();}};
$('#member-form').onsubmit=async e=>{e.preventDefault();if(busy)return;const token=$('#member-key').value.trim();if(!/^[a-f0-9]{64}$/.test(token))return;lock();try{sessionStorage.setItem(MEMBER_KEY,token);credential=token;}catch{return fail(Error('storage_unavailable'));}$('#member-login').disabled=true;try{await refresh();if(membership?.member)event('member_verified');}finally{$('#member-login').disabled=false;}};
$('#restore-workspace').onclick=()=>{try{rememberRegistration();}catch{return fail(Error('storage_unavailable'));}lock();};
$('#member-open').onclick=registerHere;$('#register-open').onclick=registerHere;$('#gate-register').onclick=registerHere;
$('#member-logout').onclick=()=>{try{sessionStorage.removeItem(MEMBER_KEY);sessionStorage.removeItem(LINK);}catch{}credential='';lock();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(poll);else if(credential){if(memberKey()!==credential){lock();credential=memberKey();}if(credential)refresh();}});
// DOM visibility is fail-closed; the server independently verifies every request.
$('#workspace').addEventListener('click',e=>{if(!permitted()){e.preventDefault();e.stopImmediatePropagation();}},true);
async function openBrowser(){lock();try{sessionStorage.removeItem(MEMBER_KEY);}catch{}let token=storageGet(KEY);if(!/^[a-f0-9]{64}$/.test(token||'')){token=uid(32);if(!storageSet(KEY,token))return fail(Error('storage_unavailable'));}credential=token;await refresh();}
$('#continue-free').onclick=()=>openBrowser();
const googleEntry=el('a',t('Register / sign in with Google','使用 Google 注册 / 登录'));googleEntry.href='/auth/account';googleEntry.onclick=registerHere;$('#member-gate').prepend(googleEntry);
document.body.dataset.ready='true';credential=memberKey();if(credential)refresh();else openBrowser();
export {VERSION};
