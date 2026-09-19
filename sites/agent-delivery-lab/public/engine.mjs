// Agent Delivery Lab v0.2. Offline, deterministic checks; no payment or network calls.
export const VERSION = '0.2.0';
export const LIMIT = 131072;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export function parse(text) {
  if (typeof text !== 'string' || !text.trim()) throw Error('Paste a JSON document first.');
  if (new TextEncoder().encode(text).length > LIMIT) throw Error('Input exceeds 128 KiB. Use a smaller response fixture.');
  let value;
  try { value = JSON.parse(text); } catch { throw Error('Invalid JSON. Check commas, quotes and brackets.'); }
  const stack = [[value, 0]];
  while (stack.length) {
    const [v, depth] = stack.pop();
    if (depth > 64) throw Error('JSON nesting exceeds 64 levels.');
    if (typeof v === 'number' && !Number.isFinite(v)) throw Error('Numbers must be finite.');
    if (typeof v === 'number' && Number.isInteger(v) && !Number.isSafeInteger(v)) throw Error('Integers outside the safe number range must be encoded as strings.');
    if (v && typeof v === 'object') for (const a of Object.values(v)) stack.push([a, depth + 1]);
  }
  return value;
}
export function decodeChallenge(text) {
  let s = text.trim();
  if (/^payment-required\s*:/i.test(s)) s = s.replace(/^payment-required\s*:\s*/i, '');
  if (!s.startsWith('{')) {
    if (s.length > LIMIT * 1.4) throw Error('Header exceeds the input limit.');
    try { s = new TextDecoder('utf-8', {fatal:true}).decode(Uint8Array.from(atob(s), x => x.charCodeAt(0))); }
    catch { throw Error('Paste PaymentRequired JSON or a base64 PAYMENT-REQUIRED header value. MPP headers are outside this beta.'); }
  }
  return parse(s);
}
const issue = (level, path, message) => ({level, path, message});
export function inspectChallenge(text) {
  const value = decodeChallenge(text), issues = [];
  const error = (p, m) => issues.push(issue('error', p, m));
  const unsupported = (p, m) => issues.push(issue('unsupported', p, m));
  if (!object(value)) throw Error('PaymentRequired must be an object.');
  if (value.x402Version !== 2) {
    unsupported('/x402Version', 'This beta checks x402 v2 only. Other versions have not been evaluated.');
    return {kind:'challenge', status:'unsupported', issues, options:[], coverage:'x402 v2 / exact / EVM; offline shape checks only'};
  }
  if (!object(value.resource)) error('/resource', 'Provide a resource object with its absolute HTTP(S) URL.');
  else {
    try { if (typeof value.resource.url !== 'string') throw Error(); const u = new URL(value.resource.url); if (!['http:','https:'].includes(u.protocol) || u.username || u.password) throw Error(); }
    catch { error('/resource/url', 'Use an absolute HTTP(S) URL without embedded credentials.'); }
    for (const key of ['description','mimeType']) if (own(value.resource,key) && typeof value.resource[key] !== 'string') error('/resource/'+key, 'Expected a string.');
  }
  if (own(value,'error') && typeof value.error !== 'string') error('/error', 'Expected a string.');
  if (own(value,'extensions') && !object(value.extensions)) error('/extensions', 'Expected an object.');
  else if (value.extensions && Object.keys(value.extensions).length) issues.push(issue('note','/extensions','Extension payloads have not been checked.'));
  if (!Array.isArray(value.accepts) || !value.accepts.length) error('/accepts', 'Provide at least one payment option.');
  if (value.accepts?.length > 50) throw Error('At most 50 payment options are supported.');
  const options = [];
  if (Array.isArray(value.accepts)) value.accepts.forEach((p,i) => {
    const path='/accepts/'+i;
    if (!object(p)) { error(path,'Expected an object.'); return; }
    for (const key of ['scheme','network','amount','asset','payTo']) if (typeof p[key] !== 'string' || !p[key]) error(path+'/'+key,'Required non-empty string.');
    const evm = typeof p.network === 'string' && /^eip155:[1-9][0-9]*$/.test(p.network);
    if (p.scheme !== 'exact') unsupported(path+'/scheme','Only the exact scheme is evaluated.');
    if (!evm) unsupported(path+'/network','Only EVM eip155:<chain-id> is evaluated; no network is inferred.');
    if (!Number.isSafeInteger(p.maxTimeoutSeconds) || p.maxTimeoutSeconds <= 0) error(path+'/maxTimeoutSeconds','Expected a positive safe integer in seconds for this profile.');
    if (own(p,'extra') && !object(p.extra)) error(path+'/extra','Expected an object.');
    if (p.scheme === 'exact' && evm) {
      if (typeof p.amount !== 'string' || !/^[0-9]{1,78}$/.test(p.amount) || BigInt(p.amount) > (2n**256n-1n)) error(path+'/amount','Expected an unsigned uint256 integer string in atomic units.');
      else if (BigInt(p.amount) === 0n) issues.push(issue('note',path+'/amount','Zero amount: confirm that a paid request is intended.'));
      for (const k of ['asset','payTo']) if (typeof p[k] !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(p[k]) || /^0x0{40}$/.test(p[k])) error(path+'/'+k,'Expected a nonzero 20-byte EVM address. Ownership and checksum are not checked.');
    }
    options.push({option:i+1, network: typeof p.network==='string'?p.network:'missing', amountAtomic: typeof p.amount==='string'?p.amount:'missing', scheme:typeof p.scheme==='string'?p.scheme:'missing'});
  });
  issues.push(issue('note','/','Token decimals, supported chains, signatures, balances, recipient ownership and settlement are not verified.'));
  return {kind:'challenge', status:issues.some(x=>x.level==='error')?'fail':issues.some(x=>x.level==='unsupported')?'unsupported':'pass', issues, options, coverage:'x402 v2 / exact / EVM; offline shape checks only'};
}
function canonical(v) {
  if (Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
  if (object(v)) return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  return JSON.stringify(v);
}
function pointer(value, path) {
  if (path==='') return {found:true,value};
  if (!path.startsWith('/') || /~(?![01])/u.test(path)) throw Error('Use JSON Pointer paths, such as /invoice/total. Escape ~ as ~0 and / as ~1.');
  for (const part of path.slice(1).split('/').map(x=>x.replace(/~1/g,'/').replace(/~0/g,'~'))) {
    if (value===null || typeof value!=='object' || !own(value,part) || (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(part))) return {found:false};
    value=value[part];
  }
  return {found:true,value};
}
const types=['string','number','integer','object','array','boolean','null'];
const typeOf = v => v===null?'null':Array.isArray(v)?'array':typeof v;
export function checkDelivery(responseText, contractText) {
  const response=parse(responseText), contract=parse(contractText);
  if (!object(contract) || Object.keys(contract).some(k=>k!=='checks') || !Array.isArray(contract.checks) || !contract.checks.length || contract.checks.length>50) throw Error('Contract must contain only checks: an array of 1–50 rules.');
  const results=contract.checks.map((rule,i) => {
    if (!object(rule) || typeof rule.path!=='string' || Object.keys(rule).some(k=>!['path','type','equals','min','max'].includes(k))) throw Error('Rule '+(i+1)+': use only path, type, equals, min and max.');
    if (!own(rule,'type') && !own(rule,'equals') && !own(rule,'min') && !own(rule,'max')) throw Error('Rule '+(i+1)+': add a type, equals or numeric bound.');
    if (own(rule,'type') && !types.includes(rule.type)) throw Error('Rule '+(i+1)+': unsupported type.');
    for (const k of ['min','max']) if (own(rule,k) && !Number.isFinite(rule[k])) throw Error('Rule '+(i+1)+': numeric bounds must be finite numbers.');
    if (own(rule,'min') && own(rule,'max') && rule.min>rule.max) throw Error('Rule '+(i+1)+': min exceeds max.');
    const item=pointer(response,rule.path), reasons=[];
    if (!item.found) reasons.push('Required path is missing.');
    else {
      const v=item.value;
      if (rule.type && !(rule.type==='integer'?Number.isSafeInteger(v):typeOf(v)===rule.type)) reasons.push('Expected '+rule.type+'; received '+typeOf(v)+'.');
      if (own(rule,'equals') && canonical(v)!==canonical(rule.equals)) reasons.push('Value differs from the expected value.');
      if ((own(rule,'min')||own(rule,'max')) && typeof v!=='number') reasons.push('Numeric bounds require a number.');
      else { if (own(rule,'min') && v<rule.min) reasons.push('Value is below min.'); if (own(rule,'max') && v>rule.max) reasons.push('Value exceeds max.'); }
    }
    return {path:rule.path||'(root)',status:reasons.length?'fail':'pass',message:reasons.join(' ')||'Declared rule met.'};
  });
  return {kind:'delivery', status:results.every(x=>x.status==='pass')?'pass':'fail', results, coverage:'Declared rules only. A match does not establish factual accuracy, freshness or payment settlement.'};
}
export function compareChallenges(beforeText, afterText) {
  const beforeCheck=inspectChallenge(beforeText), afterCheck=inspectChallenge(afterText);
  const before=decodeChallenge(beforeText), after=decodeChallenge(afterText);
  if (beforeCheck.status!=='pass'||afterCheck.status!=='pass') throw Error('Both snapshots must pass the supported profile before comparison. Check each challenge first.');
  // Payment options are alternatives: canonical sorting ignores order, preserving every field.
  const norm = value=>({...value,accepts:[...value.accepts].sort((a,b)=>canonical(a).localeCompare(canonical(b)))});
  const changes=[];
  function walk(a,b,path) {
    if (canonical(a)===canonical(b)) return;
    if (object(a)&&object(b)) for (const k of new Set([...Object.keys(a),...Object.keys(b)])) walk(a[k],b[k],path+'/'+k.replace(/~/g,'~0').replace(/\//g,'~1'));
    else changes.push({path:path||'/', before:a===undefined?'(missing)':a, after:b===undefined?'(missing)':b});
  }
  walk(norm(before),norm(after),'');
  return {kind:'compare',status:changes.length?'changed':'unchanged',changes,coverage:'Snapshot differences only. Alternative payment options are order independent; no live requests were made.'};
}
export const sampleChallenge = {x402Version:2,resource:{url:'https://api.example.com/extract',description:'Fictional invoice extraction example',mimeType:'application/json'},accepts:[{scheme:'exact',network:'eip155:84532',amount:'10000',asset:'0x036CbD53842c5426634e7929541eC2318f3dCF7e',payTo:'0x1111111111111111111111111111111111111111',maxTimeoutSeconds:60,extra:{name:'USDC',version:'2'}}]};
export const sampleResponse = {invoice:{id:'INV-DEMO-001',currency:'USD',total:125.5},source:'fictional-fixture'};
export const sampleContract = {checks:[{path:'/invoice/id',type:'string'},{path:'/invoice/currency',equals:'USD'},{path:'/invoice/total',type:'number',min:0,max:150}]};

// Guided editor uses the same contract validation as browser/CLI checks.
export function appendRule(contractText, path, condition, rawValue) {
  const contract = parse(contractText);
  if (!object(contract) || Object.keys(contract).some(k=>k!=='checks') || !Array.isArray(contract.checks)) throw Error('Start with a contract containing only a checks array.');
  if (!['type','equals','min','max'].includes(condition)) throw Error('Choose a supported condition.');
  const value = condition==='type' ? rawValue : parse(rawValue);
  const next = {checks:[...contract.checks,{path,[condition]:value}]};
  const text = JSON.stringify(next,null,2);
  checkDelivery('null',text);
  return text;
}
const COST_SCALE = 100000000n;
function costUnits(value) {
  if (typeof value!=='string' || !/^(0|[1-9][0-9]{0,11})(\.[0-9]{1,8})?$/.test(value)) throw Error('Cost must be a nonnegative decimal string: up to 12 whole digits and 8 decimal places.');
  const [whole,fraction=''] = value.split('.');
  return BigInt(whole)*COST_SCALE+BigInt(fraction.padEnd(8,'0'));
}
function costText(units) {
  const fraction=(units%COST_SCALE).toString().padStart(8,'0').replace(/0+$/,'');
  return (units/COST_SCALE).toString()+(fraction?'.'+fraction:'');
}
export function checkBatch(batchText, contractText) {
  const records=parse(batchText);
  if (!Array.isArray(records) || records.length<1 || records.length>100) throw Error('Batch must be a JSON array of 1–100 attempts.');
  checkDelivery('null',contractText);
  const seen=new Set(),groups=new Map(),results=[];
  records.forEach((record,index)=>{
    const label='Attempt '+(index+1)+': ';
    if (!object(record) || Object.keys(record).some(k=>!['id','provider','task','cost','currency','response','error'].includes(k))) throw Error(label+'use only id, provider, task, cost, currency and either response or error.');
    for(const key of ['id','provider','task']) if(typeof record[key]!=='string'||!record[key].trim()||record[key].length>80) throw Error(label+key+' must be a nonempty string of at most 80 characters.');
    if (seen.has(record.id)) throw Error(label+'duplicate attempt id. Give each attempt a unique id, including retries.');
    seen.add(record.id);
    if(typeof record.currency!=='string'||!/^[A-Z][A-Z0-9]{1,11}$/.test(record.currency)) throw Error(label+'currency must be an uppercase unit label, such as USD or USDC.');
    if(own(record,'response')===own(record,'error')) throw Error(label+'provide exactly one of response or error.');
    if(own(record,'error')&&(typeof record.error!=='string'||!record.error.trim()||record.error.length>200)) throw Error(label+'error must be a nonempty string of at most 200 characters.');
    let cost;try{cost=costUnits(record.cost);}catch(e){throw Error(label+e.message);}
    const checked=own(record,'error')?{status:'fail',results:[{path:'(request)',status:'fail',message:'Recorded request error: '+record.error}]}:checkDelivery(JSON.stringify(record.response),contractText);
    const key=JSON.stringify([record.provider,record.currency]);
    if(!groups.has(key))groups.set(key,{provider:record.provider,currency:record.currency,attempts:0,accepted:0,cost:0n,tasks:new Set(),acceptedTasks:new Set()});
    const group=groups.get(key);group.attempts++;group.cost+=cost;group.tasks.add(record.task);
    if(checked.status==='pass'){group.accepted++;group.acceptedTasks.add(record.task);}
    results.push({id:record.id,provider:record.provider,task:record.task,cost:record.cost,currency:record.currency,status:checked.status,issues:checked.results.filter(r=>r.status==='fail')});
  });
  const summaries=[...groups.values()].map(g=>({provider:g.provider,currency:g.currency,attempts:g.attempts,accepted:g.accepted,failed:g.attempts-g.accepted,uniqueTasks:g.tasks.size,acceptedTasks:g.acceptedTasks.size,totalCost:costText(g.cost),costPerAccepted:g.accepted?costText((g.cost+BigInt(g.accepted)-1n)/BigInt(g.accepted)):null,taskSet:[...g.tasks].sort()}));
  return {kind:'batch',status:results.every(r=>r.status==='pass')?'pass':'fail',attempts:results.length,accepted:results.filter(r=>r.status==='pass').length,summaries,results,coverage:'User-supplied attempts and declared rules only. All entered costs, including failed attempts, are counted within each provider and currency. Cost per accepted output is rounded up to 8 decimals. Repeated accepted outputs are not unique tasks. No provider ranking or settlement verification.'};
}
export const sampleBatch = [
  {id:'a-001',provider:'Example A',task:'invoice-01',cost:'0.01',currency:'USD',response:sampleResponse},
  {id:'a-002',provider:'Example A',task:'invoice-02',cost:'0.01',currency:'USD',response:{invoice:{id:'INV-DEMO-002',currency:'EUR',total:80}}},
  {id:'a-003',provider:'Example A',task:'invoice-02',cost:'0.01',currency:'USD',error:'Fictional retry timeout'},
  {id:'b-001',provider:'Example B',task:'invoice-01',cost:'0.02',currency:'USD',response:sampleResponse},
  {id:'b-002',provider:'Example B',task:'invoice-02',cost:'0.02',currency:'USD',response:{invoice:{id:'INV-DEMO-002',currency:'USD',total:80}}}
];
