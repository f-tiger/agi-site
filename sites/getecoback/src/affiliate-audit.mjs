import {CELLAR_PAGE, VACUUM_OFFER_MODELS, VACUUM_OFFER_PAGE, WINDOW_TIKTOK_GUIDE_PAGE} from './affiliate-meta.mjs';
import {WINDOW_ENTRY_PAGE} from './fenstersauger-entry.mjs';
import {PORTASPLIT_ENTRY_PAGE, PORTASPLIT_PRODUCT_URL} from './portasplit-entry.mjs';
import {N90_ENTRY_PAGE, N90_PRODUCT_URL} from './n90-entry.mjs';
import {WINDOW_CONDENSATION_PAGE} from '../site/assets/fenster-taucheck.mjs';
import {LAUNDRY_SEASON_PAGE,LAUNDRY_SEASON_EVENTS} from './laundry-events.mjs';

// Bounded, aggregate-only history for distinguishing demand/mix changes from
// telemetry loss. No identifiers, raw paths, referrers or outbound URLs leave
// this module. Existing /api/trend caches the result for one hour.
export const AUDIT_SQL = `SELECT day, name, page, ref,
  CASE WHEN name='affiliate_click' AND json_valid(meta)
    THEN json_extract(meta,'$.link_url') ELSE NULL END AS link,
  CASE WHEN name='affiliate_click' AND json_valid(meta)
    THEN json_extract(meta,'$.source') ELSE NULL END AS source,
  CASE WHEN page='${VACUUM_OFFER_PAGE}' AND name='affiliate_click' AND ua_class='human' AND json_valid(meta)
    THEN CASE WHEN json_extract(meta,'$.link_url')='https://www.amazon.de/s?tag=getecoback-21'
      AND json_extract(meta,'$.vacuum_model') IN ('${VACUUM_OFFER_MODELS.join("','")}')
      THEN json_extract(meta,'$.vacuum_model') END END AS vacuum_model,
  CASE WHEN page='${CELLAR_PAGE}' AND ua_class='human' AND json_valid(meta)
    THEN json_extract(meta,'$.mcp_drain_entry') = 1 ELSE 0 END AS drain_entry,
  CASE WHEN page='${CELLAR_PAGE}' AND ua_class='human' AND json_valid(meta)
    THEN COALESCE(json_type(meta,'$.mcp_cellar_entry') = 'integer'
      AND json_extract(meta,'$.mcp_cellar_entry') = 1
      AND (name='page_view' OR json_extract(meta,'$.link_url') = 'https://www.amazon.de/s?tag=getecoback-21'),
      0) ELSE 0 END AS cellar_entry,
  CASE WHEN page='${WINDOW_ENTRY_PAGE}' AND ua_class='human' AND json_valid(meta)
    THEN COALESCE(json_type(meta,'$.mcp_window_entry') = 'integer'
      AND json_extract(meta,'$.mcp_window_entry') = 1,0) ELSE 0 END AS window_entry,
  CASE WHEN ua_class='human' AND json_valid(meta)
    THEN COALESCE(json_type(meta,'$.window_tiktok_entry') = 'integer'
      AND json_extract(meta,'$.window_tiktok_entry') = 1
      AND ((page='${WINDOW_TIKTOK_GUIDE_PAGE}' AND name='page_view')
        OR (page='${WINDOW_ENTRY_PAGE}' AND (name='eco_window_width_check'
          OR (name='affiliate_click' AND json_extract(meta,'$.link_url')='https://www.amazon.de/s?tag=getecoback-21')))),0)
    ELSE 0 END AS window_tiktok_entry,
  CASE WHEN page='${PORTASPLIT_ENTRY_PAGE}' AND ua_class='human' AND json_valid(meta)
    THEN COALESCE(json_type(meta,'$.mcp_portasplit_entry') = 'integer'
      AND json_extract(meta,'$.mcp_portasplit_entry') = 1,0) ELSE 0 END AS portasplit_entry,
  CASE WHEN page='${N90_ENTRY_PAGE}' AND ua_class='human' AND json_valid(meta)
    THEN COALESCE(json_type(meta,'$.mcp_n90_entry') = 'integer'
      AND json_extract(meta,'$.mcp_n90_entry') = 1
      AND (name='page_view' OR (name='affiliate_click' AND json_extract(meta,'$.link_url')='${N90_PRODUCT_URL}')),0)
    ELSE 0 END AS n90_entry,
  COUNT(CASE WHEN page='${WINDOW_CONDENSATION_PAGE}' AND name='page_view' AND ua_class='human'
    THEN 1 END) AS window_human_views,
  COUNT(*) AS n, date('now') AS end_exclusive
FROM ev
WHERE (name IN ('page_view','affiliate_click')
    OR (name='eco_window_width_check' AND page='${WINDOW_ENTRY_PAGE}' AND ua_class='human')
    OR (name IN ('${LAUNDRY_SEASON_EVENTS.join("','")}') AND page='${LAUNDRY_SEASON_PAGE}' AND ua_class='human'))
  AND day >= date('now','-56 days') AND day < date('now')
  AND (ua_class IS NULL OR ua_class='human') AND page NOT LIKE '/__ci%'
GROUP BY day, name, page, ref, link, source, drain_entry, cellar_entry, window_entry, window_tiktok_entry, portasplit_entry, n90_entry, vacuum_model`;

const GAPS = [
  {day:'2026-09-24',approx_start_utc:'13:00'},
  {day:'2026-09-25',approx_start_utc:'08:00'},
  {day:'2026-09-26',approx_start_utc:'10:00'},
];
const gapDays = new Set(GAPS.map(x=>x.day));
const redditReferralHosts = new Set([
  'reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com',
  'm.reddit.com', 'out.reddit.com', 'np.reddit.com',
]);
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
// Keep pageGroup/cohorts frozen for the existing experiment. V2 corrects only
// reviewed task pages; brand names alone do not establish a product category.
export const COHORTS_V2_VERSION = 'task-path-v2-2026-11-06';
const humidityTaskPaths = new Set([
  '/guide/meacodry-arete-one-test.html',
  '/en/guide/meaco-meacodry-arete-one-10l-running-cost.html',
  '/waeschetrockner-oder-luftentfeuchter.html',
  '/nl/ventilatie-of-luchtontvochtiger.html',
]);
export function pageGroupV2(path='') {
  if (humidityTaskPaths.has(path)
      || /^\/guide\/trotec-ttk-(?:26|27|30|32|52|53|54|66|72|75|90|95|96|127)-e-betriebskosten\.html$/.test(path)) return 'humidity';
  return pageGroup(path);
}
const count = ()=>({page_views:0,affiliate_clicks:0});
// Additive, exact intent paths for the DACH buying pilot. Do not reclassify the
// frozen experiment cohorts or export arbitrary page names from event rows.
const buyingPathKeys = new Map([
  ['/guide/smarte-heizkoerperthermostate-lohnen-sich.html','smart_thermostat'],
  ['/guide/saugwischer-kaufberatung.html','saugwischer'],
  ['/guide/saugroboter-kaufberatung.html','robot'],
  ['/guide/luftbefeuchter-ratgeber.html','humidifier'],
]);
const section = ()=>({...count(),cohorts:{},cohorts_v2:{},n90_guides:{model:{...count(),exact_product_clicks:0},family:{...count(),exact_product_clicks:0}},cellar_catalog:{...count(),catalog_product_clicks:0,catalog_search_clicks:0},buying_paths:{smart_thermostat:count(),saugwischer:count(),robot:count(),humidifier:count()},channels:{},destinations:{product:0,search:0,prime_trial:0,other:0},surfaces:{},models:{ex105:0,n90:0,portasplit_original:0,other:0}});
const dayAt = (end,offset)=>new Date(Date.parse(end+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
// Launch day is partial. Mixed windows expose only the dates actually counted.
const firstFullDrainDay = '2026-11-20';
const firstFullWindowTikTokDay = '2026-11-23';
const firstFullVacuumDay = '2026-11-26';
const range = (start,end)=>({...section(),start,end_exclusive:end,
  // An empty marker cohort alone cannot establish when coverage started.
  mcp_cellar_entry:null,
  mcp_n90_entry:null,
  mcp_window_entry:null,
  mcp_portasplit_entry:null,
  window_tiktok:null,
  window_reddit_referrals:null,
  laundry_season:null,
  vacuum_catalog: end <= firstFullVacuumDay ? null : {
    start: start < firstFullVacuumDay ? firstFullVacuumDay : start, end_exclusive:end,
    catalogue_page_views:0, model_search_clicks:0,
    models:Object.fromEntries(VACUUM_OFFER_MODELS.map(model => [model,0])),
  },
  mcp_drain_entry: end <= firstFullDrainDay ? null : {
    start: start < firstFullDrainDay ? firstFullDrainDay : start, end_exclusive:end, ...count(),
  },
});
function destination(link) {
  if (link === PORTASPLIT_PRODUCT_URL) return ['product','portasplit_original'];
  try {
    const u=new URL(link);
    if(u.protocol!=='https:' || !/^(?:www\.)?amazon\.(?:de|com)$/.test(u.hostname)) return ['other','other'];
    const term=(u.pathname+' '+u.searchParams.get('k')).toLowerCase();
    const model=/ex105/.test(term)?'ex105':/n90|b07nc5cp6f/.test(term)?'n90':'other';
    const dest=/^\/(?:dp|gp\/product)\//.test(u.pathname)?'product':u.pathname==='/s'||u.pathname.startsWith('/s/')?'search':u.pathname==='/primegratistesten'?'prime_trial':'other';
    return [dest,model];
  } catch {return ['other','other'];}
}
// A subset of clicks from these two German guides to the normalized approved
// Amazon.de destination. Never join these aggregate events to people or orders.
const n90Guides = new Map([
  [N90_ENTRY_PAGE, 'model'],
  ['/guide/delonghi-pinguino-vergleich.html', 'family'],
]);
const n90Product = /^https:\/\/(?:www\.)?amazon\.de\/(?:dp|gp\/product)\/B07NC5CP6F\?tag=getecoback-21$/;
const trackedModelPaths = new Map([
  [CELLAR_PAGE, {column:'cellar_entry', aggregate:'mcp_cellar_entry'}],
  [N90_ENTRY_PAGE, {column:'n90_entry', aggregate:'mcp_n90_entry', clickField:'exact_product_clicks'}],
  [WINDOW_ENTRY_PAGE, {column:'window_entry', aggregate:'mcp_window_entry'}],
  [PORTASPLIT_ENTRY_PAGE, {column:'portasplit_entry', aggregate:'mcp_portasplit_entry'}],
]);
function addWindowTikTok(section, row) {
  if (row.window_tiktok_entry !== 1 || row.n === 0 || row.day < firstFullWindowTikTokDay) return;
  let key;
  if (row.page === WINDOW_TIKTOK_GUIDE_PAGE && row.name === 'page_view') key = 'tagged_landing_views';
  else if (row.page === WINDOW_ENTRY_PAGE && row.name === 'eco_window_width_check') key = 'width_checks';
  else if (row.page === WINDOW_ENTRY_PAGE && row.name === 'affiliate_click' &&
           row.link === 'https://www.amazon.de/s?tag=getecoback-21') key = 'model_search_clicks';
  if (!key) return;
  const evidence = section.window_tiktok ??= {
    start:section.start < firstFullWindowTikTokDay ? firstFullWindowTikTokDay : section.start,
    end_exclusive:section.end_exclusive,
    first_recorded_day:row.day,
    tagged_landing_views:null,
    width_checks:null,
    model_search_clicks:null,
  };
  if (row.day < evidence.first_recorded_day) evidence.first_recorded_day = row.day;
  evidence[key] = (evidence[key] ?? 0) + row.n;
}

function addWindowReddit(section, row) {
  if (row.name !== 'page_view' || row.page !== WINDOW_CONDENSATION_PAGE || !row.window_human_views) return;
  const arrivals = section.window_reddit_referrals ??= {
    human_classified_page_views:0,
    page_views_with_referrer:0,
    reddit_page_views:null,
  };
  arrivals.human_classified_page_views += row.window_human_views;
  if (!row.ref) return;
  arrivals.page_views_with_referrer += row.window_human_views;
  arrivals.reddit_page_views = (arrivals.reddit_page_views ?? 0) +
    (redditReferralHosts.has(row.ref) ? row.window_human_views : 0);
}

function addLaundrySeason(section, row) {
  if (row.n === 0) return;
  const field = row.name === 'eco_laundry_season_check' ? 'measured_comparisons' : 'model_guide_clicks';
  const actions = section.laundry_season ??= {
    first_recorded_day:row.day, measured_comparisons:null, model_guide_clicks:null,
  };
  if (row.day < actions.first_recorded_day) actions.first_recorded_day = row.day;
  actions[field] = (actions[field] ?? 0) + row.n;
}

function addVacuumCatalogue(section, row) {
  const catalogue = section.vacuum_catalog;
  if (!catalogue || row.day < catalogue.start || row.page !== VACUUM_OFFER_PAGE) return;
  if (row.name === 'page_view') catalogue.catalogue_page_views += row.n;
  else if (row.name === 'affiliate_click' && row.link === 'https://www.amazon.de/s?tag=getecoback-21' &&
      Object.hasOwn(catalogue.models, row.vacuum_model)) {
    catalogue.model_search_clicks += row.n;
    catalogue.models[row.vacuum_model] += row.n;
  }
}

function add(s,r,channel) {
  addVacuumCatalogue(s,r);
  const field=r.name==='page_view'?'page_views':'affiliate_clicks';
  s[field]+=r.n;
  const guide = n90Guides.get(r.page);
  if (guide) {
    const route = s.n90_guides[guide];
    route[field] += r.n;
    if (field === 'affiliate_clicks' && n90Product.test(r.link)) route.exact_product_clicks += r.n;
  }
  const cellar = r.page === CELLAR_PAGE;
  if (cellar && s.mcp_drain_entry && r.day >= firstFullDrainDay && r.drain_entry === 1) {
    s.mcp_drain_entry[field] += r.n;
  }
  const modelPath = trackedModelPaths.get(r.page);
  if (modelPath && r[modelPath.column] === 1) {
    const clickField = modelPath.clickField ?? 'model_search_clicks';
    const entry = s[modelPath.aggregate] ??= {first_recorded_day:r.day,page_views:0,[clickField]:0};
    if (r.day < entry.first_recorded_day) entry.first_recorded_day = r.day;
    if (field === 'affiliate_clicks' && r.page === PORTASPLIT_ENTRY_PAGE && r.link === PORTASPLIT_PRODUCT_URL) {
      entry.exact_product_clicks = (entry.exact_product_clicks ?? 0) + r.n;
    } else {
      entry[field === 'page_views' ? field : clickField] += r.n;
    }
  }
  if (cellar) s.cellar_catalog[field] += r.n;
  const group=pageGroup(r.page);
  (s.cohorts[group]??=count())[field]+=r.n;
  const groupV2=pageGroupV2(r.page);
  (s.cohorts_v2[groupV2]??=count())[field]+=r.n;
  const buyingPath = buyingPathKeys.get(r.page);
  if(buyingPath) s.buying_paths[buyingPath][field]+=r.n;
  (s.channels[channel]??=count())[field]+=r.n;
  if(field==='affiliate_clicks') {
    const [dest,model]=destination(r.link);
    if (cellar && r.source === 'models' && (dest === 'product' || dest === 'search')) {
      s.cellar_catalog['catalog_' + dest + '_clicks'] += r.n;
    }
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
    const laundrySeason = LAUNDRY_SEASON_EVENTS.includes(r.name);
    if(!Number.isSafeInteger(r.n)||r.n<0||!byDay.has(r.day)||(!laundrySeason&&!['page_view','affiliate_click','eco_window_width_check'].includes(r.name))) throw Error('affiliate_audit_invalid');
    const eligible = r.window_human_views ?? 0;
    if (!Number.isSafeInteger(eligible) || eligible < 0 || eligible > r.n) throw Error('affiliate_audit_invalid');
    const wi=Math.floor((Date.parse(r.day)-Date.parse(start))/86400000/7);
    const recent=r.day>=recentThree.start;
    const previous=r.day>=previousThree.start&&r.day<previousThree.end_exclusive;
    if (laundrySeason) {
      addLaundrySeason(weeks[wi],r);
      if (recent) addLaundrySeason(recentThree,r);
      if (previous) addLaundrySeason(previousThree,r);
      continue;
    }
    addWindowTikTok(weeks[wi],r);
    if (recent) addWindowTikTok(recentThree,r);
    if (previous) addWindowTikTok(previousThree,r);
    addWindowReddit(weeks[wi],r);
    if (recent) addWindowReddit(recentThree,r);
    if (previous) addWindowReddit(previousThree,r);
    if (r.name==='eco_window_width_check') continue;
    byDay.get(r.day)[r.name==='page_view'?'page_views':'affiliate_clicks']+=r.n;
    const channel=classifyRef(r.ref);
    if(!['search','ai','fleet','social','self','direct','other'].includes(channel)) throw Error('affiliate_audit_channel');
    add(weeks[wi],r,channel);
    if(recent) add(recentThree,r,channel);
    if(previous) add(previousThree,r,channel);
  }
  return {
    metric:'recorded_events_not_users_or_orders',timezone:'UTC',start,end_exclusive:end,
    cohorts_v2_version:COHORTS_V2_VERSION,
    window_tiktok_note:'Complete UTC days start 2026-11-23. The fixed tags and same-site handoff mark three independent event counts. Unobserved stages are null. A shared or typed link can carry the fixed tags.',
    window_reddit_note:'Human-classified view events on the German indoor window guide only. Reddit is an exact immediate referrer host. A missing referrer may hide a visit. No usable referrer evidence is null. This report does not attribute tool completions, affiliate clicks or orders.',
    laundry_season_note:'German laundry season tool actions on complete UTC days. Tracking may begin partway through the first recorded UTC day. Measured comparisons and model guide clicks are independent events. Unobserved stages are null. These counts do not attribute merchant clicks or orders.',
    vacuum_catalog_note:'Complete UTC days start 2026-11-26. Views cover the entire product catalogue. Clicks count the three exact German model searches. These are independent events and do not identify comparison use, unique shoppers, attribution to acquisitions, orders, or commission.',
    known_collection_gaps:GAPS.filter(x=>x.day>=start&&x.day<end),
    note:'Missing events are not reconstructed. Gaps are known incidents, not an exhaustive uptime audit. Clicks / page views is an event ratio, not buyer conversion. Cohorts are fixed path rules, not randomized controls. Channel belongs to each event referrer, not session acquisition.',
    daily,weeks,last_three_complete_days:recentThree,same_weekdays_previous_week:previousThree,
    query_rows_read:Number.isSafeInteger(result.meta?.rows_read)?result.meta.rows_read:null,
    amazon_orders:null
  };
}
