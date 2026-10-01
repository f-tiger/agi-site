import {EVENT_ROWS} from './hits-schema.js';
import {QUOTE_ACTIONS,parseQuoteEvent} from '../../../tools/quote-page-lab/growth.mjs';
export const QUOTE_SIGNAL_SQL=`SELECT path, count(*) n FROM hits WHERE d >= ? AND ${EVENT_ROWS} AND ev = 'quote' AND lang != 'ci' AND path LIKE '/quote-builder/%' GROUP BY path`;
export async function readQuoteSignals(db,since){
  const definitions={unit:'Browser action events, once per action per document; not unique people or a joined conversion funnel.',source:'Allowlisted entry labels, including user-editable campaign parameters; not verified referrers or causal attribution.',own:'An edit or creator confirmation is not independently verified real-client work. Client opens and copied summaries do not prove delivery, retention or payment.',quality:'Known QA/DNT/GPC/automated-browser traffic is suppressed on the client; unlabeled automation and lost events remain possible. Missing data is null, not zero.'};
  try{
    const {results=[]}=await db.prepare(QUOTE_SIGNAL_SQL).bind(since).all();
    const actions=Object.fromEntries(QUOTE_ACTIONS.map(a=>[a,0])),builder_entries={},entry_sources={};
    for(const row of results){const label=parseQuoteEvent(row.path);if(!label)continue;const n=Number(row.n)||0;actions[label.action]+=n;if(label.action==='builder_open'){builder_entries[label.source]=(builder_entries[label.source]||0)+n;}if(label.action==='entry_open'){entry_sources[label.source]=(entry_sources[label.source]||0)+n;}}
    return {ok:true,since,includes_current_partial_utc_day:true,actions,builder_entries,entry_sources,entry_definition:'entry_open counts each public entry document, including direct demo entries, starting with edition 2026-10-01.4. Client configuration links are excluded. Historical entry counts are not reconstructed. Native share requests are not proof of an opened chooser or a sent message.',definitions};
  }catch{return {ok:false,since,actions:null,builder_entries:null,entry_sources:null,definitions};}
}
