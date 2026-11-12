// Deterministic review conditions. A matched condition is not a trading signal.
export const RULE_METRICS = ['revenue_growth', 'ocf_margin', 'capex_to_ocf'];
export const RULE_LIMIT = 3;
const DAY = 86400000;
const date = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
const stamp = s => {if(typeof s!=='string'||!Number.isFinite(Date.parse(s)))return false;const iso=new Date(s).toISOString();return s===iso||s===iso.replace('.000Z','Z');};
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const signature = r => [r.metric,r.op,r.threshold].join(':');
export function normalizeRule(raw) {
  if (!plain(raw) || !RULE_METRICS.includes(raw.metric) || !['lt','gt'].includes(raw.op) || !['sample','own'].includes(raw.mode) || typeof raw.threshold !== 'number' || !Number.isFinite(raw.threshold) || Math.abs(raw.threshold)>10000) throw Error('rule');
  const r = {metric:raw.metric,op:raw.op,threshold:raw.threshold,mode:raw.mode};
  if (raw.reviewed != null) {
    const v=raw.reviewed;
    if (!plain(v) || v.signature!==signature(r) || !Number.isFinite(v.value) || !date(v.start) || !date(v.end) || v.start>=v.end || !stamp(v.at) || typeof v.snapshot!=='string' || !/^[a-f0-9]{20}$/.test(v.snapshot)) throw Error('review');
    r.reviewed={signature:v.signature,value:v.value,start:v.start,end:v.end,at:v.at,snapshot:v.snapshot};
  }
  return r;
}
export function normalizeRules(raw) {
  if (!Array.isArray(raw) || raw.length>RULE_LIMIT) throw Error('rules');
  const rules=raw.map(normalizeRule);
  if (new Set(rules.map(signature)).size!==rules.length) throw Error('duplicate_rule');
  return rules;
}
function factOK(f,now) {
  if (!plain(f) || f.error || typeof f.val!=='number' || !Number.isFinite(f.val) || Math.abs(f.val)>Number.MAX_SAFE_INTEGER || f.unit!=='USD' || f.basis!=='US GAAP' || f.kind!=='annual' || !['10-K','10-K/A'].includes(f.form)) return false;
  if (![f.start,f.end,f.filed].every(date) || f.end>f.filed || Date.parse(f.filed)>now) return false;
  const duration=(Date.parse(f.end)-Date.parse(f.start))/DAY;
  if (duration<330 || duration>400 || typeof f.tag!=='string' || typeof f.id!=='string' || !/^\d{10}-\d{2}-\d{6}$/.test(f.accn||'')) return false;
  try {const u=new URL(f.source);return u.protocol==='https:' && u.hostname==='www.sec.gov' && !u.port && !u.username && !u.password && u.pathname.startsWith('/Archives/edgar/data/');} catch {return false;}
}
export function evaluateRule(company,raw,{now=Date.now(),snapshot=''}={}) {
  const rule=normalizeRule(raw);
  const unknown=reason=>({status:'unknown',reason,value:null,facts:[],rule});
  if (!plain(company) || company.refresh_failed || !stamp(company.checked_at) || now-Date.parse(company.checked_at)>3*DAY || Date.parse(company.checked_at)>now+300000) return unknown('refresh');
  const keys=rule.metric==='revenue_growth'?['revenue']:rule.metric==='ocf_margin'?['ocf','revenue']:['capex','ocf'];
  const facts=keys.map(k=>company.facts?.[k]);
  if (facts.some(f=>!factOK(f,now))) return unknown('facts');
  const tags={revenue:['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],ocf:['NetCashProvidedByUsedInOperatingActivities'],capex:['PaymentsToAcquirePropertyPlantAndEquipment']};
  if(facts.some((f,i)=>!tags[keys[i]].includes(f.tag)))return unknown('facts');
  if (facts.some(f=>f.start!==facts[0].start || f.end!==facts[0].end || f.end!==company.annual_end)) return unknown('period');
  const f=facts[0];
  if (now-Date.parse(f.end)>450*DAY) return unknown('annual_age');
  let value,prior=null;
  if (rule.metric==='revenue_growth') {
    prior=f.previous;
    if (!plain(prior) || ![prior.start,prior.end,prior.filed].every(date) || !Number.isFinite(prior.val) || prior.val<=0 || prior.val>Number.MAX_SAFE_INTEGER || f.val<0 || prior.end>prior.filed || Date.parse(prior.filed)>now || !/^\d{10}-\d{2}-\d{6}$/.test(prior.accn||'')) return unknown('previous');
    const duration=(Date.parse(prior.end)-Date.parse(prior.start))/DAY, gap=(Date.parse(f.end)-Date.parse(prior.end))/DAY;
    if(duration<330 || duration>400 || gap<330 || gap>400 || Math.abs(duration-(Date.parse(f.end)-Date.parse(f.start))/DAY)>7) return unknown('previous');
    value=(f.val/prior.val-1)*100;
  } else {
    if(facts[1].val<=0 || (rule.metric==='capex_to_ocf' && f.val<0)) return unknown('denominator');
    value=f.val/facts[1].val*100;
  }
  if (!Number.isFinite(value)) return unknown('facts');
  const hit=x=>rule.op==='lt'?x<rule.threshold:x>rule.threshold;
  const old=rule.reviewed;
  // Imported checkpoints are user records, never authenticated filing history.
  const comparable=old && Date.parse(old.at)<=now+300000 && old.end<=f.end && old.start<=f.start;
  return {status:hit(value)?'triggered':'not_triggered',reason:null,value,facts,prior,rule,start:f.start,end:f.end,
    previous:comparable?old:null,changed:!!comparable && (old.value!==value || old.end!==f.end || old.start!==f.start),
    crossed:!!comparable && !hit(old.value) && hit(value),snapshot};
}
export function markReviewed(company,rule,context) {
  const result=evaluateRule(company,rule,context);
  if(result.status==='unknown' || !/^[a-f0-9]{20}$/.test(context.snapshot||'')) throw Error('unavailable');
  return {...result.rule,reviewed:{signature:signature(rule),value:result.value,start:result.start,end:result.end,at:new Date(context.now??Date.now()).toISOString(),snapshot:context.snapshot}};
}
