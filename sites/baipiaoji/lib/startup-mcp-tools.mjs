import {retrieveCases,generatePlan,prepareInferenceCorpus} from './ai-solo-core.mjs';
export const STARTUP_VERSION='1.0.0';
const str=(maxLength=160)=>({type:'string',maxLength}),choice=values=>({type:'string',enum:values});
const language=choice(['zh','en']),limit={type:'integer',minimum:1,maximum:20};
const tool=(name,description,properties={},required=[])=>({name,description,inputSchema:{type:'object',properties,required,additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:name==='startup_preview',openWorldHint:false}});
export const STARTUP_TOOLS=[
 tool('startup_preview','Free preview of dated business evidence and launch signals. Explains membership access, limits and caveats; no key needed.',{language}),
 tool('search_startup_cases','MEMBER: find source-backed AI startup cases, with dated revenue/adoption/failure evidence. Default excludes company references. Relevance is not success probability.',{query:str(500),outcome:choice(['success','failure','all']),scope:choice(['non-company','solo','small-team','company','unknown','all']),category:str(60),language,limit}),
 tool('compare_startup_cases','MEMBER: compare 2–4 reviewed cases for the same customer job. Retains metric periods, team evidence and limits; never converts revenue to profit.',{ids:{type:'array',items:str(80),minItems:2,maxItems:4,uniqueItems:true},language},['ids']),
 tool('get_startup_radar','MEMBER: query daily Show HN discussion samples and Product Hunt launches, with dates and optional retained history. Launches and keywords are unreviewed; no revenue or solo verdict.',{source:choice(['all','hn','ph']),focus:choice(['consumer','consumer-ai','ai','all']),history:{type:'boolean'},language,limit}),
 tool('build_startup_plan','MEMBER: build a source-linked 14-day validation plan, opposing success/failure evidence, unit economics and website-upgrade suggestions. Local retrieval and neural representation, no external LLM. Do not send customer secrets.',{question:str(500),skill:str(240),customer:str(240),stage:str(120),budget:{type:'number',minimum:0,maximum:1e9},hours:{type:'number',minimum:0,maximum:168},price:{type:'number',minimum:0,maximum:1e9},variableCost:{type:'number',minimum:0,maximum:1e9},fixedCost:{type:'number',minimum:0,maximum:1e12},language},['question'])
];
export function validateStartupArgs(name,args){
 const definition=STARTUP_TOOLS.find(t=>t.name===name);if(!definition)throw Error('unknown_tool');
 if(!args||typeof args!=='object'||Array.isArray(args))throw Error('invalid_arguments');
 const schema=definition.inputSchema;
 for(const k of schema.required)if(!Object.hasOwn(args,k))throw Error('invalid_arguments');
 for(const [key,value]of Object.entries(args)){
  const rule=schema.properties[key];if(!rule)throw Error('invalid_arguments');
  if(rule.type==='array'){
   if(!Array.isArray(value)||value.length<rule.minItems||value.length>rule.maxItems||new Set(value).size!==value.length||value.some(v=>typeof v!=='string'||!v.trim()||v.length>rule.items.maxLength))throw Error('invalid_arguments');
  }else if(rule.type==='integer'){if(!Number.isSafeInteger(value)||value<rule.minimum||value>rule.maximum)throw Error('invalid_arguments');}
  else if(typeof value!==rule.type||rule.enum&&!rule.enum.includes(value)||rule.maxLength&&value.length>rule.maxLength||rule.type==='number'&&(!Number.isFinite(value)||value<rule.minimum||value>rule.maximum))throw Error('invalid_arguments');
 }
 if(name==='build_startup_plan'&&!args.question.trim())throw Error('invalid_arguments');
 return {...args,language:args.language||'en'};
}
const reviewed=c=>!['pending-review','unverified','rejected'].includes(c.evidenceStatus||c.status);
const localized=(c,key,lang)=>c[lang==='zh'?key:key+'En']??c[key]??null;
const view=(c,lang)=>({id:c.id,name:localized(c,'name',lang),summary:localized(c,'summary',lang),outcome:c.outcome,scope:c.scope,classification:c.classification,teamEvidence:localized(c,'teamEvidence',lang),businessModel:localized(c,'businessModel',lang),acquisition:localized(c,'acquisition',lang),metrics:c.metrics,sources:c.sources,risks:localized(c,'risks',lang),verifiedAt:c.verifiedAt||c.checkedAt||null,url:'https://baipiaoji.com/'+(lang==='en'?'en/':'')+'ai-solo/case/'+c.id+'/'});
export function prepareStartupTool(name,args,data){
 const lang=args.language,eligible=data.cases.filter(c=>reviewed(c)&&data.model.caseIds.includes(c.id)),caveats=['Revenue or adoption does not establish profit. Source periods are historical, not live financial verification.','Public-source selection and survivorship bias limit conclusions. Company performance is not solo feasibility.'];
 const base={caseVersion:data.model.contentHash,language:lang,caveats};
 if(name==='startup_preview')return ()=>({...base,membership:{price:'9 USDT / 30 days plus payment matching decimal and network fees',autoRenew:false,dailyCalls:100,perMinute:10,sharedAcrossKeys:true,checkout:'https://baipiaoji.com/members',docs:'https://baipiaoji.com/ai-solo/mcp/'},caseCount:data.cases.length,reviewedCount:eligible.length,examples:eligible.filter(c=>c.scope!=='company').slice(0,3).map(c=>view(c,lang)),radar:data.hot.sources.map(s=>({id:s.id,status:s.status,observedAt:s.observedAt,items:s.items.filter(x=>x.consumerSignal).slice(0,2)})),note:'Free website and public JSON remain available. Paid access is the hosted tool service, not exclusive ownership of public facts.'});
 if(name==='search_startup_cases'){
  const category=args.category;if(category&&!eligible.some(c=>c.classification?.job===category))throw Error('unknown_category');
  return ()=>{const inference=data.inference||data;let rows=args.query?.trim()?retrieveCases(inference.cases,inference.model,args.query,{limit:200}).map(h=>({...data.cases.find(c=>c.id===h.case.id),relevance:h.score})):eligible;
   rows=rows.filter(c=>(!args.outcome||args.outcome==='all'||c.outcome===args.outcome)&&(!category||c.classification?.job===category)&&((args.scope||'non-company')==='all'||(args.scope||'non-company')==='non-company'&&c.scope!=='company'||c.scope===args.scope));
   return {...base,total:rows.length,cases:rows.slice(0,args.limit||10).map(c=>({...view(c,lang),...(c.relevance!==undefined?{relevance:c.relevance}:{})})),categories:[...new Set(eligible.map(c=>c.classification?.job))]};};
 }
 if(name==='compare_startup_cases'){
  const rows=args.ids.map(id=>eligible.find(c=>c.id===id));if(rows.some(c=>!c))throw Error('unknown_or_pending_case');
  if(new Set(rows.map(c=>c.classification?.job)).size!==1)throw Error('different_customer_jobs');
  return ()=>({...base,customerJob:rows[0].classification.job,cases:rows.map(c=>view(c,lang)),comparisonQuestions:['Are customers and delivered outcomes comparable?','Do metrics use the same unit and period?','Which team, distribution and cost advantages are missing from your project?'],conclusion:'Compare evidence and execution conditions; this is not a causal success prediction.'});
 }
 if(name==='get_startup_radar')return ()=>{
  const selected=data.hot.sources.filter(s=>!args.source||args.source==='all'||s.id===args.source),focus=args.focus||'consumer',match=i=>focus==='all'||focus==='consumer'&&i.consumerSignal||focus==='ai'&&i.aiSignal||focus==='consumer-ai'&&i.consumerSignal&&i.aiSignal;
  return {language:lang,cadence:'daily, may be delayed',windowDays:7,historyDays:14,commercialEvidence:false,sources:selected.map(s=>({...s,stale:!s.observedAt||Date.now()-Date.parse(s.observedAt)>48*3600000,totalMatches:s.items.filter(match).length,items:s.items.filter(match).slice(0,args.limit||10)})),...(args.history?{history:data.hot.history.filter(h=>selected.some(s=>s.id===h.source))}:{}),caveats:['HN rank is within the returned vote sample. Product Hunt Atom has no votes or ranks. Do not combine platform scores.','Keywords, staffing and commercial outcomes are unreviewed. Missing observations or rank drops do not establish failure.']};
 };
 if(name==='build_startup_plan')return ()=>{const inference=data.inference||data,plan=generatePlan(inference.cases,inference.model,args);plan.limitations=plan.limitations.map(s=>s.startsWith('个人输入仅在本地')?'MCP 输入传到 BPJ 服务器执行，不持久化、不加入训练、不发送到外部模型；请勿发送客户秘密。':s.startsWith('Personal inputs are processed locally')?'MCP inputs reach BPJ for server execution without persistence, training or external model calls. Do not send customer secrets.':s);plan.caveats=plan.limitations;return plan;};
 throw Error('unknown_tool');
}
let cached=null;
export async function loadStartupData(env){
 if(cached?.assets===env.ASSETS&&Date.now()-cached.at<60000)return cached.data;
 const read=async p=>{const r=await env.ASSETS.fetch(new Request('https://baipiaoji.com/'+p));if(!r.ok)throw Error('assets_unavailable');return r.json();};
 const [cases,model,hot]=await Promise.all(['ai-solo-cases.json','ai-solo-model.json','ai-solo-hot.json'].map(read));
 if(!Array.isArray(cases)||!model.trained||!Array.isArray(model.caseIds)||!Array.isArray(hot.sources)||!Array.isArray(hot.history))throw Error('assets_unavailable');
 const data={cases,model,hot,inference:prepareInferenceCorpus(cases,model)};cached={assets:env.ASSETS,at:Date.now(),data};return data;
}
