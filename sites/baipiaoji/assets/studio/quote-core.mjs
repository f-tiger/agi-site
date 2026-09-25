// First-party quotation arithmetic. No network, OCR, model calls, or purchase actions.
export const EDITION = '2026-09-25.1';
export const PRODUCT = 'bpj-quote-compare';
export const MAX_QUOTES = 10;
export const CURRENCIES = ['CNY','USD','EUR','GBP','HKD','AUD','CAD','SGD','CHF'];
const SCALE = 1000000n;
const priorities = ['BLOCKED', 'EXCLUDED', 'NEEDS_INPUT', 'NEEDS_APPROVAL'];
const requiredEvidence = ['sku', 'price', 'unit', 'currency', 'quantity_terms', 'tax', 'shipping', 'validity', 'delivery', 'version'];
const empty = v => v === '' || v === null || v === undefined;
const text = (v, max = 200) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
function decimal(v, positive = false) {
  if (typeof v !== 'string' && typeof v !== 'number') throw Error('NUMBER');
  const s = String(v).trim();
  if (!/^\d{1,12}(\.\d{1,6})?$/.test(s)) throw Error('NUMBER');
  const [whole, fraction = ''] = s.split('.');
  const n = BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, '0'));
  if (positive && n === 0n) throw Error('NUMBER');
  return n;
}
function integer(v, zero = false) {
  const n = decimal(v, !zero);
  if (n % SCALE || n / SCALE > 10000000n) throw Error('INTEGER');
  return Number(n / SCALE);
}
const roundDiv = (a, b) => (a + b / 2n) / b;
const cents = n => roundDiv(n, 10000n);
export const money = n => `${n / 100n}.${String(n % 100n).padStart(2, '0')}`;
const decimalText = n => `${n/SCALE}.${String(n%SCALE).padStart(6,'0')}`.replace(/\.?0+$/,'');
export function validDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
}
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function newPolicy() { return {name:'', required_sku:'', requested_units:'100', max_lead_days:'14', as_of:today(), base_currency:'CNY'}; }
export function newQuote(id) {
  return {id, supplier:'', sku:'', price_per_quoted_unit:'', quoted_unit:'piece', units_per_box:'', moq_units:'', order_multiple_units:'', currency:'CNY', tax_mode:'unknown', tax_rate:'', shipping_gross_quote_currency:'', valid_until:'', lead_days:'', stated_line_total:'', stated_quantity:'', superseded_by:'', tiers:[], fx_rate:'', fx_date:'', fx_confirmed:false, reviewed:false, overbuy_approved:false, sku_approved:false, source_name:'', source_text:''};
}
export function policyErrors(p) {
  const codes=[];
  if (!p || typeof p !== 'object') return ['POLICY'];
  if (!text(p.required_sku,120)) codes.push('REQUIRED_SKU');
  for (const [key, zero] of [['requested_units',false],['max_lead_days',true]]) { try { integer(p[key],zero); } catch { codes.push(key==='requested_units'?'QUANTITY':'DEADLINE'); } }
  if (!validDate(p.as_of)) codes.push('AS_OF');
  if (!CURRENCIES.includes(p.base_currency)) codes.push('BASE_CURRENCY');
  return codes;
}
export function evaluate(q, p) {
  const r={id:q?.id, supplier:q?.supplier||'', status:'BLOCKED', issues:[], ordered_units:null, extra_units:null, total:null, subtotal:null, goods_gross:null, freight:null, fx:null, price:null, pack:1, currency:q?.currency, base_currency:p?.base_currency};
  const issue=(code,level='BLOCKED')=>r.issues.push({code,level});
  const finish=()=>{r.status=priorities.find(s=>r.issues.some(i=>i.level===s))||'READY';return r;};
  if (policyErrors(p).length) { issue('POLICY'); return finish(); }
  try {
    if (!q || typeof q!=='object') throw Error('INVALID_INPUT');
    for (const k of ['reviewed','overbuy_approved','sku_approved','fx_confirmed']) if (q[k]!==undefined && typeof q[k]!=='boolean') throw Error('INVALID_INPUT');
    if (!text(q.supplier)) issue('SUPPLIER','NEEDS_INPUT');
    if (!text(q.source_name,400) || !text(q.source_text,8000)) issue('SOURCE','NEEDS_INPUT');
    if (q.reviewed!==true) issue('REVIEW','NEEDS_APPROVAL');
    // Imported benchmark / structured references are checked if present. A match is not semantic proof.
    if (q.evidence!==undefined) {
      if (!Array.isArray(q.evidence) || q.evidence.length>40) throw Error('INVALID_INPUT');
      const lines=(q.source_text||'').split(/\r?\n/), supplied=new Set();
      for (const e of q.evidence) {
        if (!e || !Number.isInteger(e.line) || e.line<1 || e.line>lines.length || !text(e.snippet,8000) || !lines[e.line-1].includes(e.snippet)) issue('BAD_SOURCE');
        else supplied.add(e.field);
      }
      if (requiredEvidence.some(k=>!supplied.has(k))) issue('MISSING_EVIDENCE');
      if (r.issues.some(i=>i.level==='BLOCKED')) return finish();
    }
    if (q.fx_pair && q.fx_pair!==p.base_currency+'_PER_'+q.currency) { issue('FX_DIRECTION');return finish(); }
    // Evaluate exclusions even if a price component is unknown; exclusions must not be lost in an early return.
    if (!empty(q.superseded_by)) issue('SUPERSEDED','EXCLUDED');
    if (empty(q.valid_until)) issue('VALIDITY','NEEDS_INPUT');
    else if (!validDate(q.valid_until)) issue('INVALID_DATE');
    else if (q.valid_until<p.as_of) issue('EXPIRED','EXCLUDED');
    if (empty(q.lead_days)) issue('DELIVERY','NEEDS_INPUT');
    else if (integer(q.lead_days,true)>integer(p.max_lead_days,true)) issue('LATE','EXCLUDED');
    if (!text(q.sku,120)) issue('SKU','NEEDS_INPUT');
    else if (q.sku!==p.required_sku && q.sku_approved!==true) issue('SKU_APPROVAL','NEEDS_APPROVAL');
    if (!['included','excluded','unknown'].includes(q.tax_mode)) throw Error('INVALID_INPUT');
    if (!['piece','box'].includes(q.quoted_unit)) throw Error('INVALID_INPUT');
    if (!CURRENCIES.includes(q.currency)) issue('CURRENCY','NEEDS_INPUT');
    const req=integer(p.requested_units);
    let moq, multiple, price, pack=1, shipping, fx=SCALE, tax=0n;
    for (const [key, code] of [['moq_units','MOQ'],['order_multiple_units','MULTIPLE'],['price_per_quoted_unit','PRICE']]) if (empty(q[key])) issue(code,'NEEDS_INPUT');
    if (!empty(q.moq_units)) moq=integer(q.moq_units);
    if (!empty(q.order_multiple_units)) multiple=integer(q.order_multiple_units);
    if (!empty(q.price_per_quoted_unit)) price=decimal(q.price_per_quoted_unit,true);
    if (q.quoted_unit==='box') {
      if (empty(q.units_per_box)) issue('PACK_UNKNOWN','NEEDS_INPUT');
      else { pack=integer(q.units_per_box); if (multiple && multiple%pack) issue('PACK_MULTIPLE'); }
    }
    if (moq && multiple) {
      r.ordered_units=Math.ceil(Math.max(req,moq)/multiple)*multiple;
      if (r.ordered_units>10000000) throw Error('INTEGER');
      r.extra_units=r.ordered_units-req;
      if (r.extra_units && q.overbuy_approved!==true) issue('OVERBUY_APPROVAL','NEEDS_APPROVAL');
    }
    if (!Array.isArray(q.tiers) || q.tiers.length>20) throw Error('TIERS');
    let threshold=0; const seen=new Set();
    for (const tier of q.tiers) {
      const min=integer(tier.min_units), value=decimal(tier.price_per_quoted_unit,true);
      if (seen.has(min)) throw Error('TIERS'); seen.add(min);
      if (r.ordered_units>=min && min>threshold) { price=value; threshold=min; }
    }
    if (q.tax_mode==='unknown') issue('TAX_UNKNOWN','NEEDS_INPUT');
    if (q.tax_mode==='excluded') {
      if (empty(q.tax_rate)) issue('TAX_RATE_UNKNOWN','NEEDS_INPUT');
      else { tax=decimal(q.tax_rate); if (tax>SCALE) throw Error('TAX_RATE'); }
    }
    if (empty(q.shipping_gross_quote_currency)) issue('SHIPPING_UNKNOWN','NEEDS_INPUT');
    else shipping=decimal(q.shipping_gross_quote_currency);
    if (q.currency!==p.base_currency) {
      if (empty(q.fx_rate)) issue('FX_UNKNOWN','NEEDS_INPUT');
      else fx=decimal(q.fx_rate,true);
      if (!validDate(q.fx_date) || q.fx_date>p.as_of || q.fx_confirmed!==true) issue('FX_REVIEW','NEEDS_INPUT');
    }
    // Validate even optional values before returning for a missing unrelated field.
    if (!empty(q.stated_line_total)) decimal(q.stated_line_total);
    if (!empty(q.stated_quantity)) integer(q.stated_quantity);
    if (r.issues.some(i=>['BLOCKED','NEEDS_INPUT'].includes(i.level))) return finish();
    const subtotal=roundDiv(BigInt(r.ordered_units)*price,BigInt(pack)*10000n);
    if (!empty(q.stated_line_total)) {
      if (empty(q.stated_quantity)) issue('STATED_QUANTITY','NEEDS_INPUT');
      else if (integer(q.stated_quantity)===r.ordered_units) {
        const expected=cents(decimal(q.stated_line_total)), diff=subtotal>expected?subtotal-expected:expected-subtotal;
        if (diff>1n) issue('AMOUNT_CONFLICT');
      } else issue('STATED_DIFFERENT_QUANTITY','NEEDS_APPROVAL');
    }
    r.pack=pack; r.price=decimalText(price);
    const gross=roundDiv(subtotal*(SCALE+tax),SCALE), freight=cents(shipping);
    r.subtotal=money(subtotal);r.goods_gross=money(gross);r.freight=money(freight);r.fx=decimalText(fx);
    if (!r.issues.some(i=>['BLOCKED','NEEDS_INPUT'].includes(i.level))) r.total=money(roundDiv((gross+freight)*fx,SCALE));
    return finish();
  } catch (e) { issue(['NUMBER','INTEGER','TIERS','TAX_RATE'].includes(e.message)?e.message:'INVALID_INPUT');r.total=null;return finish(); }
}
export function compare(quotes,p) {
  if (!Array.isArray(quotes)||quotes.length>MAX_QUOTES) throw Error('QUOTE_LIMIT');
  const results=quotes.map(q=>evaluate(q,p));
  // Never rank excluded/incomplete/unreviewed inputs or compare unrelated jobs.
  const ready=results.filter(r=>r.status==='READY'&&r.total!==null).sort((a,b)=>{const aa=BigInt(a.total.replace('.','')),bb=BigInt(b.total.replace('.',''));return aa<bb?-1:aa>bb?1:0;});
  let prior=null,rank=0;ready.forEach((r,i)=>{if(r.total!==prior)rank=i+1;r.rank=rank;prior=r.total;});
  return {results,ready};
}
export function parseTiers(s) {
  if (!s.trim()) return [];
  return s.split(/\r?\n/).filter(x=>x.trim()).map(line=>{const a=line.split(':').map(x=>x.trim());if(a.length!==2)throw Error('TIERS');integer(a[0]);decimal(a[1],true);return {min_units:a[0],price_per_quoted_unit:a[1]};});
}
export const CSV_FIELDS=['supplier','sku','price_per_quoted_unit','quoted_unit','units_per_box','moq_units','order_multiple_units','currency','tax_mode','tax_rate','shipping_gross_quote_currency','valid_until','lead_days','source_name','source_text'];
export const safeCell=v=>{let s=String(v??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
export const csv=rows=>'\uFEFF'+rows.map(row=>row.map(safeCell).join(',')).join('\r\n');
export function parseCSV(input) {
  if (typeof input!=='string'||input.length>150000) throw Error('CSV_SIZE');
  const s=input.replace(/^\uFEFF/,''), rows=[];let row=[],value='',quoted=false,closed=false;
  for(let i=0;i<s.length;i++) {const c=s[i];if(quoted){if(c==='"'){if(s[i+1]==='"'){value+='"';i++;}else {quoted=false;closed=true;}}else value+=c;}
    else if(c==='"'){if(value||closed)throw Error('CSV_FORMAT');quoted=true;}
    else if(c===','||c==='\n'||c==='\r'){row.push(value);value='';closed=false;if(c!==','){if(c==='\r'&&s[i+1]==='\n')i++;if(row.some(x=>x!==''))rows.push(row);row=[];}}
    else{if(closed)throw Error('CSV_FORMAT');value+=c;}}
  if(quoted)throw Error('CSV_FORMAT');row.push(value);if(row.some(x=>x!==''))rows.push(row);
  if(rows.length<2||rows.length>MAX_QUOTES+1)throw Error('QUOTE_LIMIT');
  const headers=rows.shift().map(x=>x.trim());
  if(new Set(headers).size!==headers.length||headers.some(h=>!CSV_FIELDS.includes(h))||!['supplier','sku','price_per_quoted_unit'].every(h=>headers.includes(h)))throw Error('CSV_HEADERS');
  return rows.map((r,i)=>{if(r.length!==headers.length)throw Error('CSV_FORMAT');const q=newQuote('q'+(i+1));headers.forEach((h,j)=>q[h]=r[j]);return q;});
}
export function snapshot(policy,quotes,demo=false) { return {version:1,product:PRODUCT,edition:EDITION,example_data:demo,policy,quotes}; }
export function restore(data) {
  if (!data||data.version!==1||data.product!==PRODUCT||!data.policy||!Array.isArray(data.quotes)||data.quotes.length>MAX_QUOTES||data.quotes.length<1)throw Error('BACKUP');
  if (data.example_data!==undefined&&typeof data.example_data!=='boolean')throw Error('BACKUP');
  const policy=newPolicy();
  for(const k of Object.keys(policy)){const v=data.policy[k];if(typeof v!=='string'||v.length>200)throw Error('BACKUP');policy[k]=v;}
  const quotes=data.quotes.map((old,i)=>{
    if(!old||typeof old!=='object')throw Error('BACKUP');const q=newQuote('q'+(i+1));
    for(const [k,def] of Object.entries(q)){
      if(k==='id')continue;const v=old[k];
      if(Array.isArray(def)) {if(!Array.isArray(v)||v.length>20)throw Error('BACKUP');q[k]=parseTiers(v.map(t=>`${t.min_units}:${t.price_per_quoted_unit}`).join('\n'));}
      else if(typeof def==='boolean'){if(typeof v!=='boolean')throw Error('BACKUP');q[k]=false;}
      else {if(typeof v!=='string'||v.length>(k==='source_text'?8000:k==='source_name'?400:200))throw Error('BACKUP');q[k]=v;}
    }
    // A restored quote needs a fresh review. Never trust imported approval flags or hidden metadata.
    return q;
  });return {policy,quotes,demo:data.example_data===true};
}
export function example(lang='zh',asOf=today()) {
  const en=lang==='en',expires=new Date(asOf+'T12:00:00Z');expires.setUTCDate(expires.getUTCDate()+30);
  const policy={...newPolicy(),name:en?'Fictional packaging order':'虚构包装采购示例',required_sku:'BOX-100',as_of:asOf};
  const names=en?['Sample A','Sample B','Sample C']:['示例供应商甲','示例供应商乙','示例供应商丙'];
  const quotes=names.map((supplier,i)=>({...newQuote('q'+(i+1)),supplier,sku:policy.required_sku,price_per_quoted_unit:['10','9','9.2'][i],moq_units:i===1?'120':'1',order_multiple_units:i===1?'20':'1',tax_mode:'included',shipping_gross_quote_currency:i===2?'':'80',lead_days:['7','10','5'][i],valid_until:expires.toISOString().slice(0,10),reviewed:true,source_name:en?`Fictional quote ${i+1}, page 1`:`虚构报价 ${i+1}，第 1 页`}));
  for(const q of quotes)q.source_text=en?`Fictional source, not a real supplier.\nSKU: ${q.sku}\nUnit price: ${q.price_per_quoted_unit} CNY / piece, tax included\nMOQ: ${q.moq_units}; order multiple: ${q.order_multiple_units}\nGross freight: ${q.shipping_gross_quote_currency||'not stated'} CNY\nValid until: ${q.valid_until}; lead time: ${q.lead_days} days`:`合成来源，并非真实供应商。\n料号：${q.sku}\n含税单价：${q.price_per_quoted_unit} CNY / 件\n起订量：${q.moq_units}；整订倍数：${q.order_multiple_units}\n含税运费：${q.shipping_gross_quote_currency||'未说明'} CNY\n有效期：${q.valid_until}；交期：${q.lead_days} 天`;
  return {policy,quotes};
}
