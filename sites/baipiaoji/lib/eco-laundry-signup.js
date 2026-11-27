import {TOKEN, digest} from '../../../tools/fleet-account/config.mjs';

const endpoint = 'https://getecoback.com/api/laundry-signup-intent';
const scope = 'getecoback:laundry-signup:v1:';

function privateOrTest(request) {
  return ['DNT','Sec-GPC','X-Probe'].some(name=>request.headers.get(name)==='1') ||
    /getecoback-ci|bpj-ci-selftest|playwright|headless|bot|crawler/i.test(request.headers.get('User-Agent') || '') ||
    ['qa','__qa','ci','__ci','__probe'].some(key=>new URL(request.url).searchParams.has(key));
}

async function verify(intent,fetcher,t) {
  if (!Array.isArray(intent) || intent.length!==2 || !intent.every(value=>typeof value==='string' && TOKEN.test(value))) return null;
  const proof = await digest(scope+intent[0]+'.'+intent[1]);
  const remote = await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'text/plain',Accept:'application/json'},
    body:proof,redirect:'manual',signal:AbortSignal.timeout(1700)});
  if (remote.status!==200 || !remote.headers.get('Content-Type')?.startsWith('application/json') || !remote.body) return null;
  const reader = remote.body.getReader();
  const decoder = new TextDecoder();
  let text = '', size = 0;
  for (;;) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size>128) { await reader.cancel(); return null; }
    text += decoder.decode(value,{stream:true});
  }
  const data = JSON.parse(text+decoder.decode());
  return data?.ok===true && Number.isSafeInteger(data.expires) && data.expires>t && data.expires<=t+900
    ? {proof,expires:data.expires} : null;
}

export async function prepareEcoLaundrySignup(db,intent,request,t,qa,fetcher=fetch) {
  if (qa || !intent || privateOrTest(request)) return null;
  try {
    const claim = await verify(intent,fetcher,t);
    if (!claim) return null;
    await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS eco_laundry_signup_daily(day TEXT PRIMARY KEY,n INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS eco_laundry_signup_claim(proof TEXT PRIMARY KEY,expires INTEGER NOT NULL,day TEXT NOT NULL)'),
      db.prepare('CREATE INDEX IF NOT EXISTS eco_laundry_signup_claim_expiry ON eco_laundry_signup_claim(expires)'),
      db.prepare(`CREATE TRIGGER IF NOT EXISTS eco_laundry_signup_count AFTER INSERT ON eco_laundry_signup_claim BEGIN
        INSERT INTO eco_laundry_signup_daily(day,n) VALUES(NEW.day,1)
        ON CONFLICT(day) DO UPDATE SET n=eco_laundry_signup_daily.n+1;
      END`),
      db.prepare('DELETE FROM eco_laundry_signup_claim WHERE expires<=?').bind(t),
    ]);
    return db.prepare(`INSERT INTO eco_laundry_signup_claim(proof,expires,day)
      SELECT ?,?,date(?,'unixepoch') WHERE ?>unixepoch()
      ON CONFLICT(proof) DO NOTHING`).bind(claim.proof,claim.expires,t,claim.expires);
  } catch {
    return null;
  }
}

export async function readEcoLaundrySignup(db,start,end) {
  try {
    const {results} = await db.prepare('SELECT day,n FROM eco_laundry_signup_daily WHERE day>=? AND day<? ORDER BY day')
      .bind(start,end).all();
    if (!Array.isArray(results) || results.length===0) return null;
    if (results.some(row=>!/^\d{4}-\d{2}-\d{2}$/.test(row.day) || !Number.isSafeInteger(row.n) || row.n<1)) return null;
    return {source:'eco_laundry_mcp',first_recorded_day:results[0].day,
      committed_accounts:results.reduce((sum,row)=>sum+row.n,0),daily:results.map(({day,n})=>({day,committed_accounts:n}))};
  } catch {
    return null;
  }
}
