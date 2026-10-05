// Fixed public action counts only; no questions, customer names, amounts or IDs.
export const AI_SOLO_ACTIONS = Object.freeze(['view','filter','case-open','source-open','example','plan-complete','plan-export','skill-export','save-local','mcp-preview','mcp-setup']);
export function parseAiSoloEvent(path) {
  const match = /^\/ai-solo\/([a-z-]+)\/workspace$/.exec(String(path || ''));
  return match && AI_SOLO_ACTIONS.includes(match[1]) ? {action:match[1]} : null;
}
export async function readAiSoloSignals(db, since) {
  const definitions = {
    unit:'Recorded actions, not unique users, retained customers, registrations or revenue.',
    privacy:'Fixed action and language totals only. No inputs, project contents or case identifiers.',
    interpretation:'Examples are separate from own-plan completion. Exports do not prove a business was started or earned money. Missing measurement is unknown, not zero demand.'
  };
  try {
    const result=await db.prepare("SELECT lang,path,count(*) n FROM hits WHERE d >= ? AND ev != '' AND ev = 'ai_solo' AND COALESCE(lang,'') != 'ci' GROUP BY lang,path LIMIT 101").bind(since).all();
    if(!Array.isArray(result.results)||result.results.length>100)return {ok:false,actions:null,reason:'incomplete_result',definitions};
    const actions=Object.fromEntries(AI_SOLO_ACTIONS.map(a=>[a,0]));
    for(const row of result.results){const parsed=parseAiSoloEvent(row.path),n=Number(row.n);if(parsed&&Number.isSafeInteger(n)&&n>0)actions[parsed.action]+=n;}
    return {ok:true,since,actions,definitions};
  } catch {return {ok:false,actions:null,reason:'query_unavailable',definitions};}
}
