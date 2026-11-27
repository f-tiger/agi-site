import {accountRoute} from '../../../tools/fleet-account/edge.mjs';
import {HUB, TOKEN, digest, json} from '../../../tools/fleet-account/config.mjs';
import {LAUNDRY_ENTRY_DOCUMENT, LAUNDRY_ENTRY_PAGE} from './laundry-mcp-entry.mjs';

const host = 'https://getecoback.com';
const bookmark = '/auth/wasch-checkliste';
export const LAUNDRY_SIGNUP_START = bookmark+'/start';
const verifierPath = '/api/laundry-signup-intent';
const taggedBookmark = host+bookmark+'?mcp_entry=waesche-kosten';
const flowStart = host+'/auth/google?'+new URLSearchParams({next:LAUNDRY_ENTRY_PAGE,lang:'de'});
const proofScope = 'getecoback:laundry-signup:v1:';
const now = () => Math.floor(Date.now()/1000);
const quiet = request => ['DNT','Sec-GPC','X-Probe'].some(name=>request.headers.get(name)==='1') ||
  /getecoback-ci|bpj-ci-selftest|playwright|headless|bot|crawler/i.test(request.headers.get('User-Agent') || '') ||
  /prefetch|prerender/i.test((request.headers.get('Sec-Purpose') || '')+' '+(request.headers.get('Purpose') || ''));

export function attributedLaundryBookmark(request) {
  return request.method==='GET' && request.url===taggedBookmark && !quiet(request) &&
    request.headers.get('Referer')===LAUNDRY_ENTRY_DOCUMENT &&
    request.headers.get('Sec-Fetch-Site')==='same-origin';
}

async function readDigest(request) {
  if (request.headers.get('Content-Type')!=='text/plain' || !request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = '', size = 0;
  for (;;) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size>43) { await reader.cancel(); return null; }
    text += decoder.decode(value,{stream:true});
  }
  return TOKEN.test(text+decoder.decode()) ? text : null;
}

async function verify(request,db) {
  if (request.method!=='POST') return json({ok:false},405);
  if (request.headers.has('Origin') || request.headers.has('Cookie') ||
      request.headers.has('Sec-Fetch-Site')) return json({ok:false},403);
  try {
    const key = await readDigest(request);
    if (!key || !db) return json({ok:false},404);
    const row = await db.prepare('SELECT expires FROM laundry_signup_intent WHERE proof=? AND expires>?')
      .bind(key,now()).first();
    return row ? json({ok:true,expires:row.expires}) : json({ok:false},404);
  } catch {
    return json({ok:false},404);
  }
}

export async function laundrySignupIntentRoute(request,env) {
  const url = new URL(request.url);
  if (![LAUNDRY_SIGNUP_START,verifierPath].includes(url.pathname)) return null;
  if (url.origin!==host || url.search) return json({ok:false},404);
  if (url.pathname===verifierPath) return verify(request,env.EVENTS);
  if (request.method!=='POST') return json({ok:false},405);
  if (request.headers.get('Origin')!==host || request.headers.get('Sec-Fetch-Site')==='cross-site')
    return json({ok:false},403);
  const redirect = await accountRoute(new Request(flowStart));
  const db = env.EVENTS;
  if (!db || redirect?.status!==303 || quiet(request) ||
      request.headers.get('Referer')!==taggedBookmark || request.headers.get('Sec-Fetch-Site')!=='same-origin')
    return redirect;
  try {
    const destination = new URL(redirect.headers.get('Location'));
    const state = destination.searchParams.get('state'), challenge = destination.searchParams.get('challenge');
    if (destination.origin!==HUB || destination.pathname!=='/en/account' ||
        destination.searchParams.get('fleet')!=='getecoback.com' || !TOKEN.test(state) || !TOKEN.test(challenge))
      return redirect;
    const proof = await digest(proofScope+state+'.'+challenge);
    const t = now();
    await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS laundry_signup_intent (proof TEXT PRIMARY KEY, expires INTEGER NOT NULL)'),
      db.prepare('CREATE INDEX IF NOT EXISTS laundry_signup_intent_expiry ON laundry_signup_intent(expires)'),
      db.prepare('DELETE FROM laundry_signup_intent WHERE expires<=?').bind(t),
      db.prepare('INSERT INTO laundry_signup_intent(proof,expires) VALUES(?,?)').bind(proof,t+900),
    ]);
    destination.searchParams.set('eco_signup','waesche-kosten');
    const headers = new Headers(redirect.headers);
    headers.set('Location',destination.href);
    return new Response(null,{status:303,headers});
  } catch {
    return redirect;
  }
}
