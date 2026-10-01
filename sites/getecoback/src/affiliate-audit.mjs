// Bounded, aggregate-only history for distinguishing demand/mix changes from
// telemetry loss. No identifiers, raw paths, referrers or outbound URLs leave
// this module. Existing /api/trend caches the result for one hour.
export const AUDIT_SQL = `SELECT day, name, page, ref,
  CASE WHEN name='affiliate_click' AND json_valid(meta)
    THEN json_extract(meta,'$.link_url') ELSE NULL END AS link,
  CASE WHEN name='affiliate_click' AND json_valid(meta)
    THEN json_extract(meta,'$.source') ELSE NULL END AS source,
  COUNT(*) AS n, date('now') AS end_exclusive
FROM ev
WHERE name IN ('page_view','affiliate_click')
  AND day >= date('now','-56 days') AND day < date('now')
  AND (ua_class IS NULL OR ua_class='human') AND page NOT LIKE '/__ci%'
GROUP BY day, name, page, ref, link, source`;

const GAPS = [
  {day:'2026-09-24',approx_start_utc:'13:00'},
  {day:'2026-09-25',approx_start_utc:'08:00'},
  {day:'2026-09-26',approx_start_utc:'10:00'},
];
const gapDays = new Set(GAPS.map(x=>x.day));
export function pageGroup(path='') {
  if (/^\/guide\/(?:balkon(?:kraftwerk|speicher)-|growatt-noah-2000-probleme|stromausfall-heizen|klimaanlage-balkonkraftwerk)/.test(path)) return 'retired_storage';
  if (/\/(?:index\.html)?$/.test(path)) return 'home';
  if (!/\/guide\//.test(path)) return 'tools_and_other';
  if (/(?:rechner|calculator|strompreis-radar|stromvergleich-check|was-bedeutet-btu|wie-viel-btu)/.test(path)) return 'guide_calculators';
  if (/(?:klimaanlage-\d+-qm|portable-ac-\d+-sqm|condizionatore-portatile-\d+-mq)/.test(path)) return 'cooling_room_size';
  if (/(?:entfeucht|dehumid|deumid|schimmel|mould|mold|feuchtigkeit|luftbefeucht|humidifier|waesche|waeschestaender|drying-clothes|fenster-beschlagen|richtig-lueften-im-winter)/.test(path)
      && !/(?:klimaanlage|portable-ac)/.test(path)) return 'humidity';
  if (/(?:heiz|heating|heater|thermovorhang|warm)/.test(path)) return 'heating';
  if (/(?:klima|kuehl|portable-ac|air-condition|pinguino|portasplit|abluft|fensterabdichtung|condizionator|climatizzator|ventilator|comfee|klarstein)/.test(path)) return 'cooling_other';
  return 'other_guides';
}
const count = ()=>({page_views:0,affiliate_clicks:0});
const section = ()=>({...count(),cohorts:{},channels:{},destinations:{product:0,search:0,prime_trial:0,other:0},surfaces:{},models:{ex105:0,n90:0,other:0}});
const dayAt = (end,offset)=>new Date(Date.parse(end+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
const range = (start,end)=>({...section(),start,end_exclusive:end});
function destination(link) {
  try {
    const u=new URL(link);
    if(u.protocol!=='https:' || !/^(?:www\.)?amazon\.(?:de|com)$/.test(u.hostname)) return ['other','other'];
    const term=(u.pathname+' '+u.searchParams.get('k')).toLowerCase();
    const model=/ex105/.test(term)?'ex105':/n90|b07nc5cp6f/.test(term)?'n90':'other';
    const dest=/^\/(?:dp|gp\/product)\//.test(u.pathname)?'product':u.pathname==='/s'||u.pathname.startsWith('/s/')?'search':u.pathname==='/primegratistesten'?'prime_trial':'other';
    return [dest,model];
  } catch {return ['other','other'];}
}
function add(s,r,channel) {
  const field=r.name==='page_view'?'page_views':'affiliate_clicks';
  s[field]+=r.n;
  const group=pageGroup(r.page);
  (s.cohorts[group]??=count())[field]+=r.n;
  (s.channels[channel]??=count())[field]+=r.n;
  if(field==='affiliate_clicks') {
    const [dest,model]=destination(r.link);
    s.destinations[dest]+=r.n;s.models[model]+=r.n;
    const surface=['body','toppick','models','sticky','home-herbst','us-market','inline','ac-finder','grid'].includes(r.source)?r.source:'other_or_unknown';
    s.surfaces[surface]=(s.surfaces[surface]||0)+r.n;
  }
}
export async function affiliateAudit(db,classifyRef,now=new Date()) {
  const result=await db.prepare(AUDIT_SQL).all();
  if(!Array.isArray(result.results)) throw Error('affiliate_audit_missing');
  const rows=result.results;
  const end=rows[0]?.end_exclusive||now.toISOString().slice(0,10),start=dayAt(end,-56);
  const daily=Array.from({length:56},(_,i)=>({day:dayAt(start,i),...count(),known_collection_gap:gapDays.has(dayAt(start,i))}));
  const byDay=new Map(daily.map(x=>[x.day,x]));
  const weeks=Array.from({length:8},(_,i)=>range(dayAt(start,i*7),dayAt(start,(i+1)*7)));
  const recentThree=range(dayAt(end,-3),end),previousThree=range(dayAt(end,-10),dayAt(end,-7));
  for(const r of rows) {
    if(!Number.isSafeInteger(r.n)||r.n<0||!byDay.has(r.day)||!['page_view','affiliate_click'].includes(r.name)) throw Error('affiliate_audit_invalid');
    byDay.get(r.day)[r.name==='page_view'?'page_views':'affiliate_clicks']+=r.n;
    const channel=classifyRef(r.ref);
    if(!['search','ai','fleet','social','self','direct','other'].includes(channel)) throw Error('affiliate_audit_channel');
    const wi=Math.floor((Date.parse(r.day)-Date.parse(start))/86400000/7);
    add(weeks[wi],r,channel);
    if(r.day>=recentThree.start) add(recentThree,r,channel);
    if(r.day>=previousThree.start&&r.day<previousThree.end_exclusive) add(previousThree,r,channel);
  }
  return {
    metric:'recorded_events_not_users_or_orders',timezone:'UTC',start,end_exclusive:end,
    known_collection_gaps:GAPS.filter(x=>x.day>=start&&x.day<end),
    note:'Missing events are not reconstructed. Gaps are known incidents, not an exhaustive uptime audit. Clicks / page views is an event ratio, not buyer conversion. Cohorts are fixed path rules, not randomized controls. Channel belongs to each event referrer, not session acquisition.',
    daily,weeks,last_three_complete_days:recentThree,same_weekdays_previous_week:previousThree,
    query_rows_read:Number.isSafeInteger(result.meta?.rows_read)?result.meta.rows_read:null,
    amazon_orders:null
  };
}
