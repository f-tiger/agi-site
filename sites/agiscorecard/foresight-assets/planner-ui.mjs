import {scenarios,actions,counters,reviewChoices,reviewDate,makePlan,defaultChoices} from './planner.mjs?v=20261003-select1';
export function initPlanner({root=document,lang,onGoal=()=>{},onChange=()=>{}}){
 const $=id=>root.querySelector('#'+id),t=(en,zh)=>lang==='zh'?zh:en;
 let legacy={},fixedReview='',goal='work';
 function options(id,rows,value,retained){
  const select=$(id);select.replaceChildren();
  for(const r of rows){const o=document.createElement('option');o.value=r.id;o.textContent=r.label[lang];select.append(o);}
  if(retained!==undefined){const o=document.createElement('option');o.value='saved';o.textContent=retained;select.prepend(o);}
  select.value=value;
 }
 function populate(note={}){
  legacy={};const base=defaultChoices(goal);
  for(const [field,rows]of [['task',scenarios[goal]],['action',actions[goal]],['counter',counters[goal]]]){
   const retained=typeof note[field]==='string';if(retained)legacy[field]=note[field];
   const label=note[field]===''?t('Not chosen yet','尚未选择'):field==='task'?t('Saved: ','已存：')+note[field]:field==='action'?t('Keep my saved action','保留已保存的行动'):t('Keep my saved condition','保留已保存的调整条件');
   options('note-'+field,rows,retained?'saved':base[field],retained?label:undefined);
  }
  // Resolve relative choices once, using the visitor's local calendar. Restoring
  // an absolute date never silently moves a review into the future.
  const dated=typeof note.review==='string'&&note.review.length>0,restored=Object.hasOwn(note,'review');
  options('note-review',reviewChoices.map(([id,en,zh])=>({id,label:{en,zh}})),dated?'saved':restored?'none':'7',dated?t('Saved: ','已存：')+note.review:undefined);
  fixedReview=dated?note.review:reviewDate(restored?'none':'7');$('note-done').value=note.done?'tried':'planned';preview();
 }
 function read(){
  const defaults=defaultChoices(goal),choice={goal,done:$('note-done').value==='tried',review:'none'};
  for(const k of ['task','action','counter'])choice[k]=$('note-'+k).value==='saved'?defaults[k]:$('note-'+k).value;
  const note=makePlan(choice,lang);for(const k of ['task','action','counter'])if($('note-'+k).value==='saved')note[k]=legacy[k];
  if($('note-task').value==='saved'&&legacy.task&&$('note-action').value!=='saved'){
   const scenario=scenarios[goal].find(s=>s.label.en===legacy.task||s.label.zh===legacy.task)||{input:{en:legacy.task,zh:legacy.task},output:{en:'a result you can check',zh:'一份可核对的结果'}};
   note.action=actions[goal].find(a=>a.id===choice.action).make(scenario)[lang];
  }
  note.review=fixedReview;return note;
 }
 function preview(){const note=read();for(const k of ['task','action','counter','review'])root.querySelector('[data-plan-output='+k+']').textContent=note[k]||(k==='review'?t('No review date set','暂未安排复查'):t('Not chosen yet','尚未选择'));}
 function changed(){preview();onChange();}
 $('plan-goal').addEventListener('change',()=>{goal=$('plan-goal').value;populate();onGoal(goal);changed();});
 $('note-task').addEventListener('change',()=>{
  // A new scenario gets a matching action; a saved action is retained until the
  // reader actively chooses another scenario or direction.
  if($('note-task').value!=='saved'){const id=$('note-action').value;options('note-action',actions[goal],actions[goal].some(a=>a.id===id)?id:actions[goal][0].id);delete legacy.action;}$('note-done').value='planned';changed();
 });
 $('note-action').addEventListener('change',()=>{if($('note-action').value!=='saved'&&$('note-task').value==='saved'&&!legacy.task)$('note-task').value=defaultChoices(goal).task;$('note-done').value='planned';changed();});
 for(const k of ['counter','done'])$('note-'+k).addEventListener('change',changed);
 $('note-review').addEventListener('change',()=>{fixedReview=$('note-review').value==='saved'?legacy.review:reviewDate($('note-review').value);changed();});
 return {read,load(nextGoal,note){goal=nextGoal;$('plan-goal').value=goal;populate(note);legacy.review=note?.review||'';}};
}
