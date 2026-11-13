import {RULE_LIMIT,normalizeRule,normalizeRules,evaluateRule,markReviewed} from './thesis.mjs';
import {emitThesis,publicThesisLink} from './thesis-signals.mjs';

export function createThesis({company,note,snapshot,notice,download}) {
  const zh=document.body.dataset.language==='zh',t=(en,cn)=>zh?cn:en,$=id=>document.getElementById(id);
  const labels={revenue_growth:t('Annual revenue growth','年度收入增长'),ocf_margin:t('Operating cash-flow margin','经营现金流率'),capex_to_ocf:t('Cash property capex / operating cash flow','固定资产现金支出 / 经营现金流')};
  const statusNames={triggered:t('Review condition met','已触发复查条件'),not_triggered:t('Condition not met','未触发条件'),unknown:t('Cannot determine','无法判断')};
  const reasons={refresh:t('Source check is overdue, failed or invalid. Refresh the page after the next data update.','来源核对已过期、失败或时间无效，请在下次数据更新后刷新页面。'),facts:t('A required USD / US GAAP annual fact is unavailable or invalid. Open the original filing.','所需 USD / US GAAP 年度数据缺失或无效，请查看披露原文。'),period:t('The inputs do not cover the same annual period. They were not combined.','所用数据不是相同年度期间，未将它们混算。'),annual_age:t('The latest annual period ended more than 450 days ago. Review the source coverage.','最新年度截至日已超过 450 天，请核对来源覆盖。'),previous:t('No comparable positive prior-year revenue is available.','缺少可比且大于零的上年度收入。'),denominator:t('The denominator must be positive and cash capex nonnegative. This ratio is unavailable.','分母必须大于零，固定资产现金支出不得为负；当前比率不可用。')};
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const context=()=>({snapshot:snapshot().id,now:Date.now()});
  const rules=()=>note().rules||[];
  const results=()=>rules().map(r=>evaluateRule(company(),r,context()));
  const pct=n=>n.toLocaleString(zh?'zh-CN':'en-US',{maximumFractionDigits:2})+'%';
  const number=n=>n.toLocaleString('en-US',{maximumFractionDigits:0});
  const priorSource=(c,r)=>`https://www.sec.gov/Archives/edgar/data/${c.cik}/${r.prior.accn.replaceAll('-','')}/${r.prior.accn}-index.html`;
  const ruleText=r=>labels[r.metric]+' '+(r.op==='lt'?t('below','低于'):t('above','高于'))+' '+pct(r.threshold);
  const modes=items=>[...new Set(items.map(r=>(r.rule||r).mode))];
  function track(action,items=rules()){for(const mode of modes(items))emitThesis(action,mode);}
  function equation(r) {
    if(r.status==='unknown')return reasons[r.reason];
    const vals=r.facts.map(f=>number(f.val));
    return r.rule.metric==='revenue_growth'?`(${vals[0]} / ${number(r.prior.val)} − 1) × 100 = ${pct(r.value)}`:`${vals[0]} / ${vals[1]} × 100 = ${pct(r.value)}`;
  }
  function render() {
    const items=results();$('thesis-results').replaceChildren();
    $('thesis-empty').hidden=items.length>0;
    for (const [i,r] of items.entries()) {
      const row=el('article',undefined,'thesis-result '+r.status);
      const heading=el('div',undefined,'thesis-heading');heading.append(el('h4',ruleText(r.rule)),el('strong',statusNames[r.status],'thesis-state'));row.append(heading);
      if(r.rule.mode==='sample')row.append(el('p',t('Example threshold. This is not your investment rule.','示例阈值，不是你的投资条件。'),'small'));
      row.append(el('p',equation(r),'thesis-equation'));
      if(r.status!=='unknown'){
        row.append(el('p',t('Annual period: ','年度期间：')+r.start+' → '+r.end,'small'));
        const list=el('ul',undefined,'thesis-sources');
        for(const f of r.facts){const li=el('li'),a=el('a',`${f.tag} · USD ${number(f.val)} · ${t('filed','披露')} ${f.filed}`);a.href=f.source;a.target='_blank';a.rel='noopener noreferrer';li.append(a);list.append(li);}
        if(r.prior){const li=el('li'),a=el('a',t('Prior annual period: ','上个年度期间：')+r.prior.start+' → '+r.prior.end+' · USD '+number(r.prior.val));a.href=priorSource(company(),r);a.target='_blank';a.rel='noopener noreferrer';li.append(a);list.append(li);}
        const detail=el('details'),summary=el('summary',t('Inspect calculation sources','核对计算来源'));detail.append(summary,list);row.append(detail);
        if(r.previous){row.append(el('p',t('Your saved review: ','你的已存复查：')+pct(r.previous.value)+' · '+r.previous.end+' · '+r.previous.at.slice(0,10),'small'));row.append(el('p',r.crossed?t('Now meets the condition; your saved review did not. Recheck the filing.','当前已触发，你保存的上次复查未触发，请核对披露。'):r.changed?t('The value or reporting period differs from your saved review.','数值或财务期间与保存的复查记录不同。'):t('Value and reporting period match your saved review.','数值和财务期间与保存的复查记录一致。'),'small'));}
      }
      const actions=el('div',undefined,'actions'),review=el('button',t('Record my review','记录本次复查'));review.type='button';review.dataset.ruleReview=String(i);review.disabled=r.status==='unknown';
      review.onclick=()=>{try{const n=note();n.rules[i]=markReviewed(company(),n.rules[i],context());render();track('review',[n.rules[i]]);notice(t('Review recorded in this tab. Save locally or in your member workspace to keep it.','复查已记录在当前标签页，请保存到本机或会员工作区。'));}catch{notice(t('This result is no longer available. Check the conditions again.','当前结果不可用，请重新检查条件。'));}};
      const remove=el('button',t('Remove condition','移除条件'));remove.type='button';remove.dataset.ruleRemove=String(i);remove.onclick=()=>{note().rules.splice(i,1);render();notice(t('Condition removed. Save to keep this change.','条件已移除，请保存此项修改。'));};actions.append(review,remove);row.append(actions);$('thesis-results').append(row);
    }
    $('thesis-check').disabled=!items.length;$('thesis-export').disabled=!items.length;
    $('thesis-add').disabled=items.length>=RULE_LIMIT;$('thesis-example').disabled=items.length>=RULE_LIMIT;
  }
  function add(raw) {
    try{const r=normalizeRule(raw),next=normalizeRules([...rules(),r]);note().rules=next;render();track('add',[r]);notice(t('Condition added. Check its sources, then save your work.','条件已添加，请核对来源并保存。'));}
    catch{notice(t('Use a finite threshold between −10,000% and 10,000%. Up to three different conditions per company.','请输入 −10,000% 至 10,000% 的有限阈值；每家公司最多三条不同条件。'));}
  }
  $('thesis-form').addEventListener('submit',e=>{e.preventDefault();const value=$('thesis-threshold').value.trim();if(!value)return;add({metric:$('thesis-metric').value,op:$('thesis-op').value,threshold:Number(value),mode:'own'});});
  $('thesis-example').onclick=()=>add(Number.isFinite(company().facts.capex?.val)?{metric:'capex_to_ocf',op:'gt',threshold:50,mode:'sample'}:{metric:'revenue_growth',op:'lt',threshold:20,mode:'sample'});
  $('thesis-check').onclick=()=>{
    const items=results(),known=items.filter(r=>r.status!=='unknown');render();track('check',known);track('blocked',items.filter(r=>r.status==='unknown'));
    track('recheck',known.filter(r=>r.previous&&Date.now()-Date.parse(r.previous.at)>=86400000));
    notice(t('Checked against the loaded snapshot. Open the sources before recording your review.','已依据当前载入的快照检查，请打开来源再记录复查。'));
  };
  function markdown() {
    const c=company(),lines=['# '+t('Investment thesis check','投资论点复查')+' · '+c.ticker,'',t('Snapshot: ','数据快照：')+snapshot().id,t('Source checked: ','来源核对：')+c.checked_at,t('Exported: ','导出：')+new Date().toISOString(),t('Annual company-wide USD / US GAAP figures, not AI segment revenue. Thresholds are user choices or labelled examples. These conditions are not trading recommendations.','年度公司整体 USD / US GAAP 数据，不是 AI 分部收入。阈值来自用户选择或标注的示例；条件结果不是交易建议。'),''];
    for(const r of results()){lines.push('## '+ruleText(r.rule),r.rule.mode==='sample'?t('Example threshold','示例阈值'):t('User condition','用户条件'),statusNames[r.status],equation(r));if(r.status!=='unknown'){lines.push(r.start+' → '+r.end);for(const f of r.facts)lines.push(`${f.tag}: USD ${f.val}; ${f.start} → ${f.end}; filed ${f.filed}`,f.source);if(r.prior)lines.push(t('Prior-period input: ','上期输入：')+JSON.stringify(r.prior),priorSource(c,r));}if(r.rule.reviewed)lines.push(t('User-saved checkpoint (not authenticated): ','用户保存的复查记录（未经真实性核验）：')+JSON.stringify(r.rule.reviewed));lines.push('');}
    lines.push(t('Cash property capex excludes finance leases and acquisitions. No personal background alerts are sent.','固定资产现金支出不含融资租赁与收购，不发送个人后台提醒。'),'',t('Public company check — this link contains no personal conditions or notes.','公开公司复查入口——此链接不包含个人条件或笔记。'),publicThesisLink(c.ticker,zh?'zh':'en'));return lines.join('\n');
  }
  $('thesis-export').onclick=()=>{download(company().ticker+'-thesis-check.md',markdown(),'text/markdown;charset=utf-8');track('export');};
  return {render,markdown,track};
}
