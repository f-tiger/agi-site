// Append-only editorial receipts. Feed discovery and a published price do not
// verify a business outcome. Keep old versions when an editorial receipt changes.
const pair=(en,zh)=>({en,zh});
export const COMMERCIAL_CLAIM='distribution-opportunity';
export const COMMERCIAL_VERSION='openrouter-commercial-20261009-v1';
const transcript='https://www.latent.space/p/openrouter';
export const commercialEvidence={
 version:COMMERCIAL_VERSION,claimId:COMMERCIAL_CLAIM,discoveryId:'43b4c17eaa8b43df42b5',videoId:'dCX4PE2HxMs',
 publishedAt:'2026-09-25T23:01:42Z',firstSeenAt:'2026-10-03T09:00:29Z',checkedAt:'2026-10-09',
 rows:[
  {id:'access',kind:'participant_account',url:transcript,start:1047,locator:'17:27–20:02',
   statement:pair('The interview describes developers needing usable access around model capabilities.','访谈讨论了开发者在模型能力之外，对可用接入方式的需要。'),
   limit:pair('An industry participant’s account; it does not prove demand for our service.','行业参与者的描述，不能证明有人需要我们的服务。')},
  {id:'community',kind:'participant_account',url:transcript,start:1749,locator:'29:09–30:28',
   statement:pair('Participants describe finding blocked workflows in existing communities.','参与者描述了从已有社群中寻找受阻流程的做法。'),
   limit:pair('No first-ten-buyer attribution, acquisition cost or causal growth test was established.','没有核实前十位买家的归因、获客成本或增长因果效果。')},
  {id:'pricing',kind:'official_offer',url:'https://openrouter.ai/pricing',start:null,locator:'Standard / Business comparison',
   statement:pair('The public offer lists 5.5% Standard and 8% Business pay-as-you-go platform fees.','公开报价列出 Standard 5.5%、Business 8% 的按量平台费。'),
   limit:pair('These are not monthly prices or profit margins. BYOK is separate. Actual revenue, CAC and paid retention are unknown.','这不是月费或利润率；BYOK 另有规则。实际收入、获客成本和付费留存未知。')}
 ],
 method:pair('Publisher transcript passages and the public pricing page were read; no full-video viewing or financial audit. Transcript speaker labels appear inconsistent, so the account is attributed to the discussion.','核阅了发布方文字稿相关段落和公开定价页；未完整观看视频或做财务审计。文字稿说话人标签存在不一致，因此按访谈讨论归述。'),
 hypothesis:pair('AGI hypothesis: resolving one demonstrated access or output failure may be useful to an existing workflow owner. A working check does not prove willingness to pay.','本站假设：为已有流程的负责人定位一次真实接入或输出失败，可能有用。检查完成不证明愿意付费。'),
 boundary:pair('OpenRouter’s community, supplier relationships and scale are not reproduced by this exercise. Do not infer passive income or build a model marketplace from it.','这次练习不能复制 OpenRouter 的社群、供应商关系和规模，也不支持被动收入或复制模型市场的推论。')
};
const versions=new Map([[COMMERCIAL_VERSION,commercialEvidence]]);
export const fitQuestions=[
 {id:'recurring',label:pair('I have an existing recurring workflow.','我已有一项周期性运行的流程。')},
 {id:'records',label:pair('I can use de-identified failure or rework records with permission.','我能获准使用脱敏的失败或返工记录。')},
 {id:'owner',label:pair('An output owner can define and check the expected result.','有输出负责人可以定义并核对预期结果。')}
];
export const emptyFit=()=>Object.fromEntries(fitQuestions.map(x=>[x.id,null]));
export const qualifies=fit=>fitQuestions.every(x=>fit?.[x.id]===true);
export function normalizeCommercial(value,claimId){
 if(value===undefined)return undefined;
 if(claimId!==COMMERCIAL_CLAIM||!value||!versions.has(value.version)||!value.fit||fitQuestions.some(x=>![true,false,null].includes(value.fit[x.id])))return {version:'unavailable'};
 return {version:value.version,fit:Object.fromEntries(fitQuestions.map(x=>[x.id,value.fit[x.id]]))};
}
export const evidenceFor=value=>versions.get(value?.version)||null;
export function boundedPlan(lang){return {
 task:pair('Check one failed run in an existing workflow','核对现有流程的一次失败运行')[lang],
 action:pair('With the output owner, compare one permitted, de-identified failure record with the expected output. Record the observed gap and one harmless retest; include review and rework time. Do not change the live workflow.','与输出负责人对照一条获准使用的脱敏失败记录和预期输出，记录实际差异及一次无害复测，计入复核与返工时间；不改生产流程。')[lang],
 counter:pair('Stop if permission, an owner or an observable expected output is missing, the failure cannot be reproduced, or no useful improvement can be demonstrated. A passed check is not customer demand.','缺少许可、负责人或可观察的预期输出，不能复现失败，或无法证明有用改善时停止。检查通过不等于客户需求。')[lang],done:false
};}
const kindLabel=(kind,lang)=>({participant_account:pair('Participant account in publisher transcript','发布方文字稿中的参与者自述'),official_offer:pair('Official published offer','官方公开报价')}[kind][lang]);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function commercialMarker(claimId,lang){return claimId===COMMERCIAL_CLAIM?`<p class="meta commercial-marker">${lang==='zh'?'经营证据逐条核对':'Claim-level business evidence'} · ${commercialEvidence.checkedAt}</p>`:'';}
export function commercialMarkup(claimId,lang){
 if(claimId!==COMMERCIAL_CLAIM)return '';
 const e=commercialEvidence,t=(en,zh)=>lang==='zh'?zh:en;
 return `<section class="evidence-block commercial-evidence" id="commercial-evidence"><p class="evidence-label">${t('Business evidence, claim by claim','经营证据，逐条来看')}</p><h2>${t('What can we borrow from this business?','这个商业案例，哪些值得借鉴？')}</h2><p class="meta">${t('Business evidence checked: ','经营证据核对：')}${e.checkedAt} · ${t('An existing reviewed interview, not a newly verified business','这是既有已核对访谈，不代表新增一家已验证的成功企业')}</p><p>${e.method[lang]}</p>${e.rows.map(r=>`<article class="commercial-row"><h3>${esc(kindLabel(r.kind,lang))}</h3><p>${esc(r.statement[lang])}</p><p class="meta"><a href="${r.url}" target="_blank" rel="noopener" data-track="source">${t('Source','出处')} · ${esc(r.locator)}</a>${r.start===null?'':` · <a href="https://www.youtube.com/watch?v=${e.videoId}&amp;t=${r.start}s" target="_blank" rel="noopener" data-track="source">${t('Video chapter','视频章节')}</a>`}</p><p>${esc(r.limit[lang])}</p></article>`).join('')}<p><strong>${t('Our application hypothesis: ','本站应用假设：')}</strong>${e.hypothesis[lang]}</p><p>${e.boundary[lang]}</p><p class="meta">${t('Feed health (36 hours), this editorial check, your review date and Earn’s original 28-day observation window are different clocks. None resets another.','订阅源健康（36 小时）、本次人工核对、你的复查日期、Earn 原有 28 天观察窗各自独立，不互相重置。')}</p><fieldset class="commercial-fit"><legend>${t('Does the existing workflow-maintenance brief fit?','现有工作流维护方案适合我吗？')}</legend><p>${t('Answer without sharing customer text. Choices stay in this draft until you explicitly attach them; existing plans are not changed by these selections.','无需提交客户文本。选择只改变当前草稿，明确附加后才进入记录；选择本身不会改动已有计划。')}</p>${fitQuestions.map(q=>`<label class="field">${q.label[lang]}<select id="commercial-${q.id}"><option value="unknown">${t('Not established','尚未明确')}</option><option value="yes">${t('Yes','是')}</option><option value="no">${t('No','否')}</option></select></label>`).join('')}<p id="commercial-fit-status" role="status"></p><p id="commercial-saved-status" class="meta"></p><div class="actions"><button type="button" id="commercial-attach">${t('Attach evidence to my existing plan','把证据附到现有计划')}</button><a id="commercial-case" href="${lang==='zh'?'/zh':''}/earn/cases/workflow-maintenance" hidden data-track="open">${t('Inspect the existing maintenance brief','查看已有工作流维护方案')} ↗</a></div><p class="meta">${t('No service is sold here. Use Save in the existing planner to keep the draft; cloud upload still needs your explicit save on the member page.','这里不销售服务。请用下方既有计划的“保存”保留草稿；云端上传仍须在会员页明确保存。')}</p></fieldset></section>`;
}
export function commercialText(value,lang){
 if(value===undefined)return '';
 const e=evidenceFor(value),t=(en,zh)=>lang==='zh'?zh:en;
 if(!e)return t('\nBusiness evidence version unavailable; no business recommendation restored.','\n经营证据版本不可用；未恢复商业方案推荐。');
 return ['','## '+t('Business evidence receipt','经营证据记录'),t('Editorial check: ','人工核对：')+e.checkedAt,'Evidence version: '+e.version,'Discovery ID: '+e.discoveryId,'Video: https://www.youtube.com/watch?v='+e.videoId,'Published: '+e.publishedAt,'First discovered: '+e.firstSeenAt,e.method[lang],...e.rows.flatMap(r=>[kindLabel(r.kind,lang)+': '+r.statement[lang],r.url+' · '+r.locator,...(r.start===null?[]:['https://www.youtube.com/watch?v='+e.videoId+'&t='+r.start+'s']),r.limit[lang]]),t('AGI hypothesis: ','本站假设：')+e.hypothesis[lang],e.boundary[lang],...fitQuestions.map(q=>q.label[lang]+' '+(value.fit[q.id]===true?t('Yes (self-reported)','是（自报）'):value.fit[q.id]===false?t('No (self-reported)','否（自报）'):t('Unknown','未知'))),qualifies(value.fit)?t('Conditional editorial match only: ','仅为有条件的本站编辑匹配：')+'https://agiscorecard.com'+(lang==='zh'?'/zh':'')+'/earn/cases/workflow-maintenance':t('No maintenance recommendation: prerequisites are missing or unknown.','不推荐工作流维护方案：前提缺失或尚未明确。'),t('No verified revenue, acquisition cost, paid retention or willingness to pay.','未验证收入、获客成本、付费留存或付费意愿。')].join('\n\n');
}
