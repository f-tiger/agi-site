import {COPY} from './quote-copy.mjs';
import {EDITION,newPolicy,newQuote,CURRENCIES} from './quote-core.mjs';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateFields=['as_of','valid_until','fx_date'];
const numberFields=['requested_units','max_lead_days','price_per_quoted_unit','units_per_box','moq_units','order_multiple_units','tax_rate','shipping_gross_quote_currency','lead_days','stated_line_total','stated_quantity','fx_rate'];
function field(key,value,L,group,options={}) {
  if (key==='currency'||key==='base_currency')options={...options,choices:CURRENCIES.map(c=>[c,c])};
  const id=`qc-${group}-${key}`, attr=`id="${id}" data-${group}="${key}"`,label=options.label||L[key];
  // A value outside the menu is shown as blank, never as the first option: the form must not display a value the model does not hold.
  const control=options.choices?`<select ${attr}>${options.choices.some(([v])=>v===value)?'':'<option value="" selected disabled>—</option>'}${options.choices.map(([v,s])=>`<option value="${esc(v)}"${value===v?' selected':''}>${esc(s)}</option>`).join('')}</select>`
    :options.area?`<textarea ${attr} rows="${options.rows||4}" maxlength="${key==='source_text'?8000:2000}">${esc(value)}</textarea>`
    :`<input ${attr} type="${dateFields.includes(key)?'date':'text'}" ${numberFields.includes(key)?'inputmode="decimal"':''} maxlength="${key==='source_name'?400:200}" value="${esc(value)}" autocomplete="off">`;
  return `<label${options.full?' class="span-full"':''} for="${id}"><span>${esc(label)}</span>${control}</label>`;
}
function check(key,value,L){return `<label class="quote-check span-full" for="qc-quote-${key}"><input id="qc-quote-${key}" type="checkbox" data-quote="${key}"${value?' checked':''}><span>${esc(L[key])}</span></label>`;}
export function renderPolicy(p,L){return ['name','required_sku','requested_units','max_lead_days','as_of','base_currency'].map(k=>field(k,p[k],L,'policy')).join('');}
export function renderTabs(quotes,selected,L){return quotes.map((q,i)=>`<button type="button" data-select="${i}" aria-pressed="${i===selected}" aria-controls="qc-editor">${i+1}. ${esc(q.supplier||L.untitled)}</button>`).join('');}
export function renderQuote(q,p,L,tiersDraft){
  return `<div class="quote-grid">${['supplier','sku','price_per_quoted_unit'].map(k=>field(k,q[k],L,'quote')).join('')}
    ${field('quoted_unit',q.quoted_unit,L,'quote',{choices:[['piece',L.piece],['box',L.box]]})}
    ${q.quoted_unit==='box'?field('units_per_box',q.units_per_box,L,'quote'):''}
    ${['moq_units','order_multiple_units','currency'].map(k=>field(k,q[k],L,'quote')).join('')}
    ${field('tax_mode',q.tax_mode,L,'quote',{choices:[['unknown',L.unknown],['included',L.included],['excluded',L.excluded]]})}
    ${q.tax_mode==='excluded'?field('tax_rate',q.tax_rate,L,'quote'):''}
    ${['shipping_gross_quote_currency','valid_until','lead_days'].map(k=>field(k,q[k],L,'quote')).join('')}</div>
  <details${q.currency!==p.base_currency?' open':''}><summary>${esc(L.advanced)}</summary><div class="quote-grid">
    ${field('tiers',tiersDraft??q.tiers.map(t=>`${t.min_units}:${t.price_per_quoted_unit}`).join('\n'),L,'quote',{area:true,full:true})}<p class="quote-note span-full">${esc(L.tierHelp)}</p>
    ${q.currency!==p.base_currency?[field('fx_rate',q.fx_rate,L,'quote',{label:`${L.fx_rate} (${esc(q.currency)} → ${esc(p.base_currency)})`}),field('fx_date',q.fx_date,L,'quote'),check('fx_confirmed',q.fx_confirmed,L)].join(''):''}
    ${['stated_line_total','stated_quantity','superseded_by'].map(k=>field(k,q[k],L,'quote')).join('')}</div></details>
  <section class="quote-source"><h3>${esc(L.source)}</h3><p class="quote-note">${esc(L.sourceHelp)}</p><div class="quote-grid">
    ${field('source_name',q.source_name,L,'quote',{full:true})}${field('source_text',q.source_text,L,'quote',{area:true,rows:5,full:true})}
    ${['reviewed','overbuy_approved','sku_approved'].map(k=>check(k,q[k],L)).join('')}</div></section>
    <button type="button" class="quote-remove" id="qc-remove">${esc(L.remove)}</button>`;
}
export function renderWorkspace(lang='zh') {
  const L=COPY[lang],p=newPolicy(),q=newQuote('q1');
  return `<section id="quote-workspace" class="quote-workspace" data-locale="${lang}" data-edition="${EDITION}">
    <div class="studio-actions"><button type="button" id="qc-example">${L.sample}</button><button type="button" id="qc-new">${L.fresh}</button><button type="button" id="qc-import">${L.import}</button><button type="button" id="qc-template">${L.template}</button></div>
    <input id="qc-file" type="file" accept=".csv,.json,text/csv,application/json" hidden>
    <p class="quote-note">${L.importHelp}</p><p id="qc-notice" class="quote-notice">${L.ownNote}</p>
    <p id="qc-status" class="quote-status" role="status" aria-live="polite"></p>
    <section class="quote-step"><h2><span class="step-number">01</span>${L.policy}</h2><div id="qc-policy" class="quote-grid">${renderPolicy(p,L)}</div></section>
    <section class="quote-step"><h2><span class="step-number">02</span>${L.suppliers}</h2><p class="quote-note">${L.quoteHelp}</p>
    <div id="qc-tabs" class="quote-tabs" role="group" aria-label="${L.suppliers}">${renderTabs([q],0,L)}</div><div id="qc-editor" class="quote-editor">${renderQuote(q,p,L)}</div>
    <div class="studio-actions"><button type="button" id="qc-add">${L.add}</button><button type="button" id="qc-calculate" class="primary">${L.go}</button></div></section>
    <section class="quote-step quote-results-step" id="qc-result-section"><h2><span class="step-number">03</span>${L.results}</h2><div id="qc-results" aria-live="polite"><p>${L.empty}</p></div>
    <div id="qc-export-actions" class="studio-actions" hidden><button type="button" id="qc-csv">${L.csv}</button><button type="button" id="qc-report">${L.report}</button></div></section>
    <details class="quote-save"><summary>${L.local}</summary><p class="quote-note">${L.free}</p><div class="studio-actions"><button type="button" id="qc-backup">${L.backup}</button><button type="button" id="qc-save">${L.save}</button><button type="button" id="qc-restore">${L.restore}</button><button type="button" id="qc-clear">${L.clear}</button></div></details>
  </section>`;
}
export function renderResults(result,quotes,p,L) {
  const amount=(v,currency)=>v===null?'—':`${esc(v)} ${esc(currency)}`;
  const rows=[...result.ready,...result.results.filter(r=>r.status!=='READY')];
  const best=result.ready[0];
  return `<dl class="quote-result-summary"><div><dt>${L.summary}</dt><dd>${result.ready.length} / ${quotes.length}</dd></div><div><dt>${L.pending}</dt><dd>${quotes.length-result.ready.length}</dd></div><div><dt>${L.lowest}</dt><dd>${best?amount(best.total,p.base_currency):'—'}</dd></div></dl>
    <p class="quote-note">${best?L.winner:L.noReady}</p><p class="quote-scroll-note">${L.at}: ${esc(p.as_of)} · ${esc(p.required_sku)} · ${esc(p.requested_units)} ${L.units}</p>
    <div class="quote-table-wrap" tabindex="0" role="region" aria-label="${L.results}"><table class="quote-table"><thead><tr>${L.columns.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr data-ready="${r.status==='READY'}"><th scope="row">${esc(r.supplier||L.untitled)}</th><td><span class="quote-state" data-state="${r.status}">${L.status[r.status]}</span></td><td>${r.ordered_units??'—'}</td><td>${r.extra_units??'—'}</td><td>${amount(r.subtotal,r.currency)}</td><td>${amount(r.goods_gross,r.currency)}</td><td>${amount(r.freight,r.currency)}</td><td>${amount(r.total,p.base_currency)}</td><td>${r.rank?L.rank+' '+r.rank:'—'}</td></tr>`).join('')}</tbody></table></div>
    ${rows.map(r=>{const q=quotes.find(q=>q.id===r.id),i=quotes.indexOf(q);return `<details class="quote-result-detail"${r.status!=='READY'?' open':''}><summary>${esc(r.supplier||L.untitled)} <span class="quote-state" data-state="${r.status}">${L.status[r.status]}</span> <span>${L.details}</span></summary>
      ${r.issues.length?`<ul>${r.issues.map(i=>`<li>${esc(L.issues[i.code]||L.issues.INVALID_INPUT)}</li>`).join('')}</ul>`:''}
      ${r.subtotal!==null?`<p><b>${L.calculation}</b>: ${r.ordered_units} ÷ ${r.pack} × ${esc(r.price)} = ${amount(r.subtotal,r.currency)}; (${amount(r.goods_gross,r.currency)} + ${amount(r.freight,r.currency)}) × ${esc(r.fx)} = ${amount(r.total,p.base_currency)}</p><p class="quote-note">${L.formula}</p>`:''}
      <p><b>${L.original}</b>: ${esc(q.source_name)}</p><pre>${esc(q.source_text)}</pre><button type="button" data-result-edit="${i}">${L.edit}: ${esc(q.supplier||L.untitled)}</button></details>`;}).join('')}`;
}
