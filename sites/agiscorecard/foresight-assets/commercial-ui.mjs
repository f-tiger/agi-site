import {COMMERCIAL_VERSION,fitQuestions,emptyFit,qualifies,evidenceFor} from './commercial.mjs';
export function initCommercial({root=document,lang,onAttach}){
 const $=id=>root.querySelector('#'+id),t=(en,zh)=>lang==='zh'?zh:en;
 if(!$('commercial-evidence'))return null;
 const read=()=>Object.fromEntries(fitQuestions.map(q=>{const v=$('commercial-'+q.id).value;return [q.id,v==='yes'?true:v==='no'?false:null];}));
 function render(){
  const fit=read(),yes=qualifies(fit);
  $('commercial-case').hidden=!yes;
  $('commercial-fit-status').textContent=yes?t('Conditional fit only. Attach to replace this draft’s task/action/stop condition with a check of one existing failure; your review date stays unchanged. Demand and willingness to pay remain untested.','仅为有条件匹配。明确附加后，将本草稿的任务、行动和停止条件改为核对一次既有失败，复查日期不变。需求与付费意愿仍未验证。'):t('No maintenance recommendation. Missing or unknown prerequisites block the mapping; attaching evidence will keep your existing plan unchanged.','不推荐工作流维护方案。前提缺失或未知时停止匹配；附加证据也会保留已有计划。');
  $('commercial-attach').textContent=yes?t('Use this bounded check in my plan','把这项有界检查用到计划中'):t('Attach evidence without a recommendation','仅附加证据，不推荐方案');
 }
 for(const q of fitQuestions)$('commercial-'+q.id).addEventListener('change',()=>{render();$('commercial-saved-status').textContent=t('Draft answers only; no saved plan has changed.','仅改变回答草稿，已保存计划未改动。');});
 $('commercial-attach').onclick=()=>{onAttach({version:COMMERCIAL_VERSION,fit:read()});$('commercial-saved-status').textContent=t('Attached to the draft. Use Save in the existing planner to keep it.','已附加到草稿。请在既有计划中点击保存以保留。');};
 return {load(value){const fit=evidenceFor(value)?value.fit:emptyFit();for(const q of fitQuestions)$('commercial-'+q.id).value=fit[q.id]===true?'yes':fit[q.id]===false?'no':'unknown';render();$('commercial-saved-status').textContent=value&&!evidenceFor(value)?t('Saved evidence version unavailable. Your plan is retained; no recommendation was restored.','已存证据版本不可用。计划已保留，未恢复推荐。'):evidenceFor(value)?t('Evidence receipt restored. Answers are self-reported, not verified demand.','已恢复证据记录。回答为自报，不代表已验证需求。'):'';}};
}
