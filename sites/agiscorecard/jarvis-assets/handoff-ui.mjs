import {HANDOFF_KEY,HANDOFF_FROM,consumeEnvelope,readEnvelope,planGoal,contextReceipt,contextQualifies,contextEvidence} from './handoff.mjs';
// This controller only prepares visible text. It never calls an API, changes
// trial state, chooses memories, or creates a workspace/credential.
export function initHandoff({root=document,lang,getEpoch,getScope,onApply}){
 const $=s=>root.querySelector(s),zh=lang==='zh',t=(en,cn)=>zh?cn:en;
 const el=(tag,text)=>{const n=root.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 let pending=null,applied=null,binding=null;
 const panel=el('section');panel.id='handoff-preview';panel.className='notice';panel.hidden=true;
 const title=el('h3',t('Review the selected plan','核对带来的计划')),body=el('div'),receipt=el('pre'),notice=el('p'),message=el('p'),actions=el('div'),apply=el('button',t('Apply to my empty goal','填入空白目标框')),cancel=el('button',t('Discard this handoff','取消这次交接'));
 receipt.className='handoff-receipt';message.id='handoff-status';message.setAttribute('role','status');apply.id='handoff-apply';cancel.id='handoff-cancel';apply.type=cancel.type='button';actions.className='task-actions';actions.append(apply,cancel);panel.append(title,body,receipt,notice,actions,message);$('#task-form').before(panel);
 const clear=()=>{pending=null;applied=null;binding=null;panel.hidden=true;body.replaceChildren();receipt.textContent='';try{sessionStorage.removeItem(HANDOFF_KEY);}catch{}};
 const bound=()=>binding&&binding.epoch===getEpoch()&&binding.scope===getScope();
 function bind(){if((pending||applied)&&binding&&!bound()){clear();return;}if((pending||applied)&&!binding&&getScope())binding={epoch:getEpoch(),scope:getScope()};}
 try{
  if(new URL(location.href).searchParams.get('from')===HANDOFF_FROM){pending=consumeEnvelope(sessionStorage);if(!pending)throw Error('invalid_handoff');
   panel.hidden=false;for(const [key,label]of [['task',t('Task','任务')],['action',t('Action','行动')],['counter',t('Stop or change course if','停止或调整条件')],['review',t('Review date','复查日期')]])body.append(el('p',label+': '+(pending.plan[key]||'—')));
   receipt.textContent=contextReceipt(pending.context,lang);const links=el('p');for(const row of contextEvidence(pending.context).rows){const a=el('a',t('Source','原出处')+' · '+row.locator);a.href=row.url;a.target='_blank';a.rel='noopener noreferrer';links.append(a,root.createTextNode(' · '));}body.append(links);notice.textContent=t('Review a draft only. Nothing has been submitted. Applying does not start a task, enable public search or use your trial. The fit answers are self-reported.','这里只准备草稿，目前尚未提交。应用不会开始任务、启用公开搜索或消耗试用；适配回答均为自报。');
   if(!contextQualifies(pending.context))body.append(el('p',t('Prerequisites are missing or unknown. No maintenance recommendation is applied; this is only your existing plan.','前提缺失或未知，不套用工作流维护推荐；这里只保留你已有的计划。')));
  }else sessionStorage.removeItem(HANDOFF_KEY);
 }catch{clear();panel.hidden=false;title.textContent=t('Plan handoff unavailable','计划交接不可用');notice.textContent=t('It may be expired, already used or invalid. Your saved plan is unchanged. Return to it and explicitly prepare a new handoff.','交接可能已过期、用过或格式无效。原计划未改变，请回原页面明确发起新的交接。');apply.hidden=true;}
 apply.onclick=()=>{
  if(!pending||!bound()){clear();return;}
  try{pending=readEnvelope(JSON.stringify(pending));}catch{clear();panel.hidden=false;apply.hidden=true;message.textContent=t('This handoff expired. Return to your saved plan.','交接已过期，请回到原计划重新准备。');return;}
  if($('#goal').value.trim()){message.textContent=t('Your goal is not empty. Keep it, or clear it yourself before applying this plan.','目标框已有内容。可以保留，或自行清空后再应用计划。');return;}
  let goal;try{goal=planGoal(pending.plan,lang);}catch{message.textContent=t('The complete plan exceeds the 1,200-character goal limit. Shorten it in the original planner, keeping the stop condition. Nothing was truncated.','完整计划超过目标框 1200 字符上限。请回原计划缩短内容并保留停止条件；未截断任何内容。');return;}
  applied=pending.context;pending=null;$('#goal').value=goal;$('#cloud-consent').checked=false;$('#web').checked=false;$('#public-query-label').hidden=true;$('#public-query').required=false;
  apply.hidden=true;body.replaceChildren();notice.textContent=t('Only the final visible goal and this evidence receipt will be submitted when you consent and start. You may edit the goal; your original plan remains on the original page. No diagnosis, repair or execution has occurred.','只有你同意并开始后，才会提交最终可见目标与这份证据记录。你可以编辑目标；原计划仍留在原页面。目前没有完成诊断、修复或执行。');cancel.textContent=t('Detach the evidence receipt','移除附加证据');message.textContent=t('Applied. Review the goal, then choose cloud consent and Start yourself.','已填入。请核对目标，再自行勾选云端同意并点击开始。');onApply();$('#goal').focus();
 };
 cancel.onclick=clear;
 return {clear,bind,context(){if(!applied)return undefined;if(!bound()){clear();throw Error('auth_changed');}return applied;}};
}
