import {VERSION,fields,scenario,assess,parseRecord,markdown} from './core.mjs';
const root=document.querySelector('#research-workbench');
if(root){
 const zh=root.dataset.lang==='zh', $=id=>document.getElementById('ir-'+id);
 const t=(en,cn)=>zh?cn:en;
 const names=Object.fromEntries(fields.map((k,i)=>[k,zh?['公司','假设','来源链接','披露日期','指标期间','观察事实','反证','改变判断的条件','复查日期'][i]:k]));
 Object.assign(names,{growth:t('EPS growth','EPS 增长率'),years:t('Years','年数'),entry:t('Entry P/E','起始市盈率'),exit:t('Exit P/E','期末市盈率'),weight:t('Weight','仓位比例'),shock:t('Sleeve shock','该仓位跌幅'),rest:t('Other assets shock','其余资产跌幅'),future_source:t('Publication date is in the future','披露日期在未来'),review_due:t('Review date has passed','已到复查日期')});
 const key='agi-invest-research-v1', inputKeys=['growth','years','entry','exit','weight','shock','rest'];
 let mode='sample';
 const status=msg=>$('status').textContent=msg;
 const event=action=>{if($('measure').checked&&!new URLSearchParams(location.search).has('__qa'))window.gtag?.('event','invest_tool_click',{location:'research_'+root.dataset.lang+'_'+action,label:mode});};
 const modeText=()=>{$('mode').textContent=mode==='sample'?t('Worked example — edits remain an example.','教学示例——修改后仍记作示例。'):t('Your research — user-entered, not verified.','你的研究——自行填写，尚未核验。');};
 function record(){const note=Object.fromEntries(fields.map(k=>[k,$(k).value]));const inputs=Object.fromEntries(inputKeys.map(k=>[k,$(k).value]));return parseRecord(JSON.stringify({version:VERSION,mode,note,inputs}));}
 function showError(e){status(t('Check this field: ','请检查字段：')+(names[e.message]||t('file format or size','文件格式或大小')));$('status').classList.add('error');}
 function clear(){ $('status').classList.remove('error');$('result').hidden=true;$('completeness').textContent='';status('');}
 function fill(r){for(const k of fields)$(k).value=r.note[k];for(const k of inputKeys)$(k).value=r.inputs[k];mode=r.mode;modeText();clear();}
 const pct=n=>(n>0?'+':'')+(100*n).toFixed(2)+'%';
 function run(){clear();try{const r=record(),s=scenario(r.inputs),a=assess(r.note);$('result').hidden=false;
   for(const [id,value] of Object.entries({earnings:s.earningsGrowth,return:s.priceReturn,annual:s.annualized,breakeven:s.breakEvenGrowth,stress:s.portfolioShock}))$(id).textContent=pct(value);
   $('recovery').textContent=s.recovery===null?t('No finite recovery after a 100% loss','损失 100% 后无法用有限涨幅回本'):pct(s.recovery);
   $('completeness').textContent=a.complete?t('All record fields supplied. Sources and conclusions still need verification.','记录字段已齐全；来源和结论仍需核验。'):t('To complete or review: ','待补全或复查：')+a.missing.map(k=>names[k]||k).join(' · ');
   status(t('Calculated from your assumptions. No market data or AI model was used.','已按输入假设计算，未调用行情或 AI 模型。'));event('calculate');
 }catch(e){showError(e);}}
 function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('calculate').addEventListener('click',run);
 for(const id of [...fields,...inputKeys])$(id).addEventListener('input',clear);
 $('own').addEventListener('click',()=>{for(const k of fields)$(k).value='';mode='own';modeText();clear();$('company').focus();event('own_start');});
 for(const button of root.querySelectorAll('[data-example]'))button.addEventListener('click',async()=>{clear();button.disabled=true;try{const response=await fetch('/invest-research/evidence.json');if(!response.ok)throw Error('source');const data=await response.json(),s=data.sources.find(x=>x.id===button.dataset.example);if(!s)throw Error('source');fill({mode:'sample',note:{company:s.company,source:s.source,published:s.published,period:s.period,...s[zh?'zh':'en'],review:''},inputs:{growth:20,years:3,entry:40,exit:25,weight:20,shock:-50,rest:-10}});status(t('Example loaded. Scenario inputs are fictional and unrelated to the company. Choose your own review date.','示例已载入。计算输入为虚构情景，与该公司无关；请自行设定复查日期。'));event('sample');}catch(e){status(t('Example unavailable. Use the source links or start your own research.','示例载入失败，可打开原始来源或填写自己的研究。'));}finally{button.disabled=false;}});
 $('export-json').addEventListener('click',()=>{try{const r=record();download('ai-invest-research.json',JSON.stringify({...r,exportedAt:new Date().toISOString()},null,2),'application/json');event('export_json');}catch(e){showError(e);}});
 $('export-md').addEventListener('click',()=>{try{download('ai-invest-research.md',markdown(record(),zh),'text/markdown;charset=utf-8');event('export_brief');}catch(e){showError(e);}});
 $('save').addEventListener('click',()=>{try{localStorage.setItem(key,JSON.stringify(record()));status(t('Saved only in this browser. Shared devices can read this record.','仅保存在当前浏览器，共用设备的其他使用者也能读取。'));event('save');}catch(e){status(t('Could not save. Download the JSON record instead.','无法保存，请改用 JSON 下载。'));}});
 $('restore').addEventListener('click',()=>{try{const raw=localStorage.getItem(key);if(!raw){status(t('No saved record in this browser.','当前浏览器没有已存记录。'));return;}fill(parseRecord(raw));status(t('Restored. Verify sources and dates again.','已恢复，请再次核对来源和日期。'));event('restore');}catch(e){status(t('Could not restore. Import an exported JSON record instead.','无法恢复，请导入之前导出的 JSON。'));}});
 $('delete').addEventListener('click',()=>{try{localStorage.removeItem(key);status(t('Saved browser copy deleted. Current fields and downloaded files remain.','已删除浏览器保存的副本，当前表单和下载文件仍保留。'));}catch{status(t('Browser storage unavailable.','浏览器存储不可用。'));}});
 $('import').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>50000)throw Error('size');fill(parseRecord(await f.text()));status(t('Imported. User-supplied records are not authenticated.','已导入，文件内的用户资料未经真实性核验。'));event('import');}catch(err){showError(err);}finally{e.target.value='';}});
 if(new URLSearchParams(location.search).get('embed')==='research')document.documentElement.classList.add('research-embed');
 for(const link of root.querySelectorAll('[data-research-action]'))link.addEventListener('click',()=>event(link.dataset.researchAction));
 modeText();
}
