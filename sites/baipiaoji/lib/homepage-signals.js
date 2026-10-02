import {EVENT_ROWS} from './hits-schema.js';

export const HOME_TRACKING_START = '2026-09-22';
export const HOME_BLOCKS = ['hero','site-header','site-footer','featured-tools','task-lanes','directory','dirs','money','agents','agent-watch','limit-check','plans','studio','video','agent','nav','footer','header','other'];
// Only public, fixed destination labels leave the read API. Unknown URLs, query
// strings, fragments, search terms and external hostnames are never returned.
export const HOME_DESTINATIONS = {
  '/directory':'tool-directory','/':'homepage','/studio':'toolbox','/account':'free-account','/members':'membership',
  '/studio/pdf-tools':'pdf-tools','/studio/product-images':'product-images',
  '/studio/video-variants':'video-variants','/studio/quote-builder':'quote-builder',
  '/studio/quote-compare':'quote-compare','/studio/proposal-deck':'proposal-deck',
  '/studio/ai':'ai-tools','/studio/codex-efficiency':'codex-efficiency',
  '/work-plan':'work-plan','/video':'video-hub','/agents':'agents',
  '/discover':'feature-map','/mcp':'mcp','/developers':'developers',
  '/workbench':'workbench','/workbench/creatorops':'creatorops',
  '/workbench/launchdesk':'launchdesk','/workbench/quotawatch-pro':'quotawatch',
  '/plans':'work-plans','/money':'business-workflows','/earn':'workflow-packs',
  '/coding-quota-board':'coding-quota','/tokenizer':'tokenizer',
  '/llm-api-calculator':'api-calculator','/subscription-audit':'subscription-audit',
  '/stack-builder':'stack-builder','/upgrade':'paid-tiers','/vs':'comparisons',
};
export function parseHomepageClick(path) {
  const match = String(path || '').match(/^\/home\/([a-z0-9-]{1,40})(\/[^?#\s]*)$/);
  if (!match) return null;
  let target = match[2].replace(/^\/en(?=\/|$)/,'').replace(/\.html$/,'').replace(/\/+$/,'') || '/';
  const block = HOME_BLOCKS.includes(match[1]) ? match[1] : 'legacy-other';
  const destination = HOME_DESTINATIONS[target] || (target.startsWith('/ext/') ? 'external-link' :
    target.startsWith('/tools/') ? 'tool-profile' : target.startsWith('/c/') ? 'tool-category' :
    target.startsWith('/agents/') ? 'agent-directory' : 'other-destination');
  return {block,destination};
}

export const HOMEPAGE_SQL = `SELECT d, lang, path, count(*) n FROM hits
 WHERE d >= ? AND d <= ? AND ${EVENT_ROWS} AND ev = 'home'
 AND COALESCE(lang,'') != 'ci' AND path LIKE '/home/%'
 GROUP BY d, lang, path ORDER BY d, lang, path LIMIT 5001`;

export async function readHomepageSignals(db, since, today) {
  const start = since < HOME_TRACKING_START ? HOME_TRACKING_START : since;
  const window = {requested_start:since,start,until:today,date_basis:'UTC',includes_current_partial_day:true};
  const definitions = {
    unit:'Recorded homepage link-click actions, not unique people, sessions, completed tasks or conversions. Repeat clicks count again.',
    scope:'Only home events with /home/ paths. /discovery/ recommendations and shares are excluded. Language is the source page language, not the destination language.',
    history:'Tracking began 2026-09-22. Refined hero/site-header/site-footer labels begin with this release; legacy other/nav/footer records are not reassigned. Directory anchors receive tool-directory from 2026-10-02; older homepage labels remain unchanged. Missing or previously lost events cannot be reconstructed.',
    quality:'Known QA excluded; unlabelled automation, self-visits, blocked or lost beacons remain possible. Zero means no recorded action, not no human demand. No page-view denominator or CTR is supplied.',
    privacy:'Fixed public block/destination labels and day/language counts only; no user IDs, country, referrer, raw URLs, input values or search terms.',
  };
  const missing = reason => ({ok:false,window,clicks:null,by_language:null,by_block:null,by_destination:null,daily:null,entries:null,daily_entries:null,reason,definitions});
  try {
    const result = await db.prepare(HOMEPAGE_SQL).bind(start,today).all();
    if (!Array.isArray(result.results)) return missing('invalid_result');
    if (result.results.length > 5000) return missing('row_limit');
    const language={zh:0,en:0,other:0}, blocks={}, destinations={}, entries=new Map(), dailyEntries=new Map(), daily=new Map();
    for(let d=Date.parse(start+'T00:00:00Z');d<=Date.parse(today+'T00:00:00Z');d+=86400000){
      const date=new Date(d).toISOString().slice(0,10);daily.set(date,{date,complete:date<today,clicks:0,zh:0,en:0,other:0});
    }
    let clicks=0, unclassified=0;
    const bump=(map,key,row,n)=>{const value=map.get(key);if(value)value.n+=n;else map.set(key,{...row,n});};
    for(const row of result.results){
      const parsed=parseHomepageClick(row.path),n=Number(row.n),day=daily.get(row.d);
      if(!Number.isSafeInteger(n)||n<1||!day)continue;
      if(!parsed){unclassified+=n;continue;}
      const lang=['zh','en'].includes(row.lang)?row.lang:'other';
      clicks+=n;language[lang]+=n;day.clicks+=n;day[lang]+=n;
      blocks[parsed.block]=(blocks[parsed.block]||0)+n;destinations[parsed.destination]=(destinations[parsed.destination]||0)+n;
      const key=JSON.stringify([lang,parsed.block,parsed.destination]);
      bump(entries,key,{language:lang,...parsed},n);
      bump(dailyEntries,row.d+key,{date:row.d,complete:row.d<today,language:lang,...parsed},n);
    }
    const sorted=obj=>Object.entries(obj).map(([id,n])=>({id,n})).sort((a,b)=>b.n-a.n||a.id.localeCompare(b.id));
    return {ok:true,window,clicks,unclassified_records:unclassified,by_language:language,by_block:sorted(blocks),by_destination:sorted(destinations),
      daily:[...daily.values()],entries:[...entries.values()].sort((a,b)=>b.n-a.n),daily_entries:[...dailyEntries.values()],definitions};
  } catch { return missing('query_failed'); }
}
