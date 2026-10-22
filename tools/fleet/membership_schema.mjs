// Public aggregate boundary. Strings are constants/enums, never service errors.
export const ORIGINS = Object.freeze({bpj:'https://baipiaoji.com', agi:'https://agiscorecard.com', eco:'https://getecoback.com', tds:'https://thedollscout.com'});
export const COUNTERS = ['paid_orders','paid_members','active_members','unexpired_pending'];
export const SOURCE = 'same-origin /api/member and /api/member-admin stats';
export const PRIVACY = 'aggregate counters only; no member, order, support, token or wallet data';
export const ERRORS = ['public:unavailable','admin:unavailable','admin:auth_unavailable'];
export function fail() { throw Error('Membership aggregate validation failed'); }
export function exact(value, keys) {
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) fail();
}
export function count(value) { return Number.isSafeInteger(value) && value >= 0; }
export function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) fail();
  return Date.parse(value);
}
export function totals(rows) {
  return Object.fromEntries(COUNTERS.map(key => {
    const sum = rows.every(row => row.admin.ok && count(row.admin[key])) ? rows.reduce((n,row) => n + row.admin[key], 0) : null;
    return [key, count(sum) ? sum : null];
  }));
}
export function unavailable(site) {
  return {site,origin:ORIGINS[site],public:{ok:false,ready:null,site,auto_renew:null,plan_price_units:null,plan_days:null},admin:{ok:false,...Object.fromEntries(COUNTERS.map(key => [key,null])),recurring_billing:null},errors:[]};
}
export function snapshot(rows, observed) {
  const values = totals(rows);
  return {schema_version:1,generated:observed,source:SOURCE,privacy:PRIVACY,ok:rows.every(row=>row.public.ok&&row.public.ready),counters_complete:Object.values(values).every(count),sites:rows,totals:values};
}
export function validateSnapshot(value, {now=Date.now(), maxAge=36*3600e3}={}) {
  exact(value,['schema_version','generated','source','privacy','ok','counters_complete','sites','totals']);
  if(value.schema_version!==1||value.source!==SOURCE||value.privacy!==PRIVACY||typeof value.ok!=='boolean'||typeof value.counters_complete!=='boolean')fail();
  const age=now-timestamp(value.generated); if(age<0||age>maxAge)fail();
  if(!Array.isArray(value.sites)||value.sites.length!==4)fail();
  for(const [i,site] of Object.keys(ORIGINS).entries()) {
    const row=value.sites[i]; exact(row,['site','origin','public','admin','errors']);
    if(row.site!==site||row.origin!==ORIGINS[site])fail();
    exact(row.public,['ok','ready','site','auto_renew','plan_price_units','plan_days']);
    exact(row.admin,['ok',...COUNTERS,'recurring_billing']);
    if(typeof row.public.ok!=='boolean'||typeof row.admin.ok!=='boolean'||row.public.site!==site)fail();
    for(const key of ['ready','auto_renew'])if(row.public.ok?typeof row.public[key]!=='boolean':row.public[key]!==null)fail();
    for(const key of ['plan_price_units','plan_days'])if(row.public.ok?!count(row.public[key]):row.public[key]!==null)fail();
    for(const key of COUNTERS)if(row.admin.ok?(row.admin[key]!==null&&!count(row.admin[key])):row.admin[key]!==null)fail();
    if(row.admin.ok?typeof row.admin.recurring_billing!=='boolean':row.admin.recurring_billing!==null)fail();
    if(!Array.isArray(row.errors)||row.errors.length>2||new Set(row.errors).size!==row.errors.length||row.errors.some(e=>!ERRORS.includes(e)))fail();
    if(row.public.ok===row.errors.includes('public:unavailable'))fail();
    const adminErrors=row.errors.filter(e=>e.startsWith('admin:'));if(row.admin.ok?adminErrors.length!==0:adminErrors.length!==1)fail();
  }
  exact(value.totals,COUNTERS); const expected=totals(value.sites);
  if(COUNTERS.some(key=>value.totals[key]!==expected[key]))fail();
  if(value.counters_complete!==Object.values(expected).every(count)||value.ok!==value.sites.every(row=>row.public.ok&&row.public.ready))fail();
  return value;
}
