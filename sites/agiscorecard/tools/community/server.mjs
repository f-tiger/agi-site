import {ORIGIN,root,seed,seeds,categories,topicPath} from './content.mjs';
import {hash,now,ensure,limit,identity,thread,listing,replies,event,metrics,sourceOf,cleanup} from './store.mjs';
import {hub,topic,account,rules,moderate,shell,postForm,choose,esc} from './render.mjs';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
const json=(data,status=200)=>Response.json(data,{status,headers:{...headers,'X-Robots-Tag':'noindex'}});
const html=(body,status=200)=>new Response(body,{status,headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
const validID=id=>typeof id==='string'&&/^[a-z0-9-]{3,50}$/.test(id);
const pageOf=s=>Math.max(1,Math.min(10000,Number.parseInt(s,10)||1));
const text=(s,min,max)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u202a-\u202e\u2066-\u2069]/u.test(s);
async function bodyOf(request){if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Error('json_required');if(Number(request.headers.get('Content-Length')||0)>16000)throw Error('too_large');const reader=request.body?.getReader();if(!reader)throw Error('bad_input');let bytes=0,parts=[];while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>16000){await reader.cancel();throw Error('too_large');}parts.push(value);}const all=new Uint8Array(bytes);let offset=0;for(const p of parts){all.set(p,offset);offset+=p.length;}let b;try{b=JSON.parse(new TextDecoder().decode(all));}catch{throw Error('bad_input');}if(!b||typeof b!=='object'||Array.isArray(b))throw Error('bad_input');return b;}
function sourceURL(s){if(s===undefined||s==='')return '';if(typeof s!=='string'||s.length>500)throw Error('bad_source');let u;try{u=new URL(s);}catch{throw Error('bad_source');}if(u.protocol!=='https:'||u.username||u.password)throw Error('bad_source');return u.href;}
async function adminAuth(request,env){const key=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!env.MEMBER_WATCH_SECRET||key.length>256)throw Error('unauthorized');const a=await hash(key),b=await hash(await hash(env.MEMBER_WATCH_SECRET+':community-moderator:v1'));let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);if(d)throw Error('unauthorized');}
async function admin(request,env,b){await adminAuth(request,env);const db=env.EVENTS;
 if(b.action==='stats'){await cleanup(db);return json({ok:true,...await metrics(db)});}
 if(b.action==='queue')return json({ok:true,posts:(await db.prepare("SELECT p.*,u.handle FROM discuss_posts p JOIN discuss_profiles u ON u.member_id=p.member_id WHERE p.status='pending' ORDER BY p.created LIMIT 50").all()).results,reports:(await db.prepare("SELECT r.post,r.reason,r.created,p.body,p.title FROM discuss_reports r JOIN discuss_posts p ON p.id=r.post WHERE r.resolved=0 ORDER BY r.created LIMIT 50").all()).results});
 if(b.action==='moderate'){
  if(!validID(b.id)||!['public','rejected','deleted'].includes(b.status))throw Error('bad_input');
  const p=await db.prepare('SELECT * FROM discuss_posts WHERE id=?').bind(b.id).first();if(!p||p.status==='deleted')throw Error('not_found');
  if(b.status==='public'&&p.parent&&!await thread(db,p.parent,p.lang))throw Error('not_found');
  await db.batch([db.prepare('UPDATE discuss_clock SET revision=revision+1 WHERE id=1'),db.prepare("UPDATE discuss_posts SET revision=(SELECT revision FROM discuss_clock WHERE id=1),status=?,published=CASE WHEN ?='public' THEN ? ELSE published END,updated=?,body=CASE WHEN ?='deleted' THEN '' ELSE body END,source=CASE WHEN ?='deleted' THEN '' ELSE source END,disclosure=CASE WHEN ?='deleted' THEN '' ELSE disclosure END WHERE id=? AND status<>'deleted'").bind(b.status,b.status,now(),now(),b.status,b.status,b.status,b.id),db.prepare('UPDATE discuss_reports SET resolved=1 WHERE post=?').bind(b.id),db.prepare('INSERT INTO discuss_audit(id,post,decision,created) VALUES(?,?,?,?)').bind(crypto.randomUUID(),b.id,b.status,now())]);return json({ok:true});
 }
 if(b.action==='dismiss_report'){if(!validID(b.id))throw Error('bad_input');await db.prepare('UPDATE discuss_reports SET resolved=1 WHERE post=?').bind(b.id).run();return json({ok:true});}
 throw Error('bad_action');
}
async function write(request,env,b,lang){const db=env.EVENTS,secret=env.MEMBER_WATCH_SECRET;if(!secret)throw Error('unavailable');const ip=await hash(secret+':discuss:'+new Date().toISOString().slice(0,10)+':'+(request.headers.get('CF-Connecting-IP')||'unknown'));
 await limit(db,'ip:'+ip,90);
 // Bounded maintenance on the existing request path; no new cron or external messages.
 await cleanup(db);
 if(b.action==='visit'){
  if(!/^[a-f0-9]{32}$/.test(b.sid||''))throw Error('bad_input');
  await db.prepare("INSERT OR IGNORE INTO discuss_visits(day,sid,lang,source) VALUES(date('now'),?,?,?)").bind(await hash(secret+':visit:'+b.sid),lang,sourceOf(b.source)).run();return json({ok:true});
 }
 if(b.action==='share_intent'){await event(db,'share_intent',lang,b.source);return json({ok:true});}
 if(b.action==='register'){
  const key=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(key))throw Error('unauthorized');
  if(b.website||b.agree!==true||b.key_saved!==true)throw Error('consent_required');
  if(!text(b.handle,3,30)||!/^[\p{L}\p{N} _-]+$/u.test(b.handle)||/admin|moderator|official|agi|编辑|官方|管理员/i.test(b.handle))throw Error('bad_handle');
  const tokenHash=await hash(key),old=await db.prepare('SELECT * FROM wb_members WHERE token_hash=?').bind(tokenHash).first();if(old?.suspended)throw Error('suspended');
  if(old&&(await db.prepare('SELECT member_id FROM discuss_profiles WHERE member_id=?').bind(old.id).first()))return json({ok:true});
  await limit(db,'register:'+ip,5,86400);await limit(db,'registrations-global',100,86400);
  const id=old?.id||crypto.randomUUID();try{await db.batch([db.prepare('INSERT OR IGNORE INTO wb_members(id,token_hash,created) VALUES(?,?,?)').bind(id,tokenHash,now()),db.prepare('INSERT INTO discuss_profiles(member_id,handle,lang,source,created) VALUES((SELECT id FROM wb_members WHERE token_hash=?),?,?,?,?)').bind(tokenHash,b.handle.trim(),lang,sourceOf(b.source),now())]);}catch(e){if(/UNIQUE/.test(e.message))throw Error('handle_taken');throw e;}
  return json({ok:true});
 }
 const {m,p}=await identity(db,request);await limit(db,'member:'+m.id,60);
 if(b.action==='status'){
  if(!p)return json({ok:true,profile:null});
  await db.prepare("INSERT OR IGNORE INTO discuss_activity(member_id,day) VALUES(?,date('now'))").bind(m.id).run();
  const follows=(await db.prepare("SELECT f.thread,f.seen,p.title,p.status,p.lang,(SELECT COUNT(*) FROM discuss_posts r WHERE r.parent=f.thread AND r.status='public' AND r.revision>f.seen) unread FROM discuss_follows f LEFT JOIN discuss_posts p ON p.id=f.thread WHERE f.member_id=?").bind(m.id).all()).results.map(f=>{const s=seed(f.thread,lang);return {...f,title:s?.title||f.title||'',available:!!s||f.status==='public'};});
  const posts=(await db.prepare('SELECT id,parent,title,body,source,status,created,lang FROM discuss_posts WHERE member_id=? ORDER BY created DESC LIMIT 101 OFFSET ?').bind(m.id,(pageOf(b.page)-1)*100).all()).results;
  return json({ok:true,profile:{handle:p.handle},follows,posts:posts.slice(0,100),more:posts.length>100});
 }
 if(!p)throw Error('profile_required');
 if(b.action==='submit'){
  if(b.website||b.agree!==true)throw Error('consent_required');
  if(!text(b.body,30,4000)||!text(b.disclosure||'',0,200)||/[a-f0-9]{64}/i.test(b.body+' '+(b.source||'')+' '+(b.disclosure||'')))throw Error('bad_content');
  if(!/^[a-f0-9]{32}$/.test(b.nonce||''))throw Error('bad_input');
  const parent=b.parent?await thread(db,b.parent,lang):null;if(b.parent&&!parent)throw Error('not_found');
  const category=parent?.category||b.category,title=parent?'':b.title;
  if(!Object.hasOwn(categories,category)||(!parent&&!text(title,10,140)))throw Error('bad_content');
  const id='p-'+(await hash(m.id+':'+b.nonce)).slice(0,32),old=await db.prepare('SELECT id FROM discuss_posts WHERE id=?').bind(id).first();if(old)return json({ok:true,id,status:'pending'});
  await limit(db,'post:'+m.id,5,86400);await limit(db,'post-global',300,86400);
  await db.prepare('INSERT INTO discuss_posts(id,parent,member_id,lang,category,title,body,source,disclosure,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,parent?.id||null,m.id,lang,category,title?.trim()||'',b.body.trim(),sourceURL(b.source),(b.disclosure||'').trim(),now(),now()).run();return json({ok:true,id,status:'pending'});
 }
 if(['follow','unfollow','seen'].includes(b.action)){
  if(!validID(b.id))throw Error('bad_input');
  if(b.action==='unfollow'){await db.prepare('DELETE FROM discuss_follows WHERE member_id=? AND thread=?').bind(m.id,b.id).run();return json({ok:true});}
  if(!await thread(db,b.id,lang))throw Error('not_found');
  if(b.action==='seen'){if(!Number.isSafeInteger(b.revision)||b.revision<0)throw Error('bad_input');await db.prepare('UPDATE discuss_follows SET seen=MAX(seen,MIN(?,(SELECT revision FROM discuss_clock WHERE id=1))) WHERE member_id=? AND thread=?').bind(b.revision,m.id,b.id).run();return json({ok:true});}
  const count=await db.prepare('SELECT COUNT(*) n FROM discuss_follows WHERE member_id=?').bind(m.id).first();if(count.n>=50)throw Error('follow_limit');
  await db.prepare('INSERT OR IGNORE INTO discuss_follows(member_id,thread,seen) VALUES(?,?,(SELECT revision FROM discuss_clock WHERE id=1))').bind(m.id,b.id).run();return json({ok:true});
 }
 if(b.action==='report'){
  if(!validID(b.id)||!['spam','abuse','privacy','misleading'].includes(b.reason))throw Error('bad_input');
  const post=await db.prepare("SELECT id FROM discuss_posts WHERE id=? AND status='public'").bind(b.id).first();if(!post)throw Error('not_found');await limit(db,'report:'+m.id,10,86400);await db.prepare('INSERT OR IGNORE INTO discuss_reports(member_id,post,reason,created) VALUES(?,?,?,?)').bind(m.id,b.id,b.reason,now()).run();return json({ok:true});
 }
 if(b.action==='delete'){
  const result=await db.prepare("UPDATE discuss_posts SET status='deleted',title='',body='',source='',disclosure='',updated=? WHERE id=? AND member_id=?").bind(now(),String(b.id||''),m.id).run();if(!result.meta?.changes)throw Error('not_found');await db.prepare('UPDATE discuss_reports SET resolved=1 WHERE post=?').bind(b.id).run();return json({ok:true});
 }
 if(b.action==='close_profile'){
  if(b.confirm!==true)throw Error('consent_required');
  await db.batch([db.prepare('DELETE FROM discuss_reports WHERE member_id=? OR post IN (SELECT id FROM discuss_posts WHERE member_id=?)').bind(m.id,m.id),db.prepare('DELETE FROM discuss_posts WHERE member_id=?').bind(m.id),db.prepare('DELETE FROM discuss_follows WHERE member_id=?').bind(m.id),db.prepare('DELETE FROM discuss_activity WHERE member_id=?').bind(m.id),db.prepare('DELETE FROM discuss_profiles WHERE member_id=?').bind(m.id)]);return json({ok:true});
 }
 throw Error('bad_action');
}
export async function communityRoute(request,env){
 const u=new URL(request.url),api=u.pathname==='/api/discuss'||u.pathname==='/api/discuss/admin',match=u.pathname.match(/^\/(zh\/)?discuss(?:\/([a-z0-9-]+))?\/?$/),sitemap=u.pathname==='/discuss-sitemap.xml';
 if(!api&&!match&&!sitemap)return null;
 if(!['agiscorecard.com','www.agiscorecard.com'].includes(u.hostname))return json({ok:false,code:'wrong_site'},403);
 const lang=match?.[1]?'zh':u.searchParams.get('lang')==='zh'?'zh':'en',t=choose(lang);
 try{
  await ensure(env.EVENTS);const db=env.EVENTS;
  if(api){
   if(request.method==='GET'&&u.pathname==='/api/discuss'){return json({ok:true,version:1,site:'agi',lang,topics:(await listing(db,lang)).slice(0,Math.max(1,Math.min(20,Number.parseInt(u.searchParams.get('limit'),10)||20))),editorial:seeds.map(s=>{const p=seed(s.id,lang);return {id:p.id,title:p.title,category:p.category};})});}
   if(request.method!=='POST')return json({ok:false,code:'method'},405);
   if(request.headers.get('Origin')!==u.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return json({ok:false,code:'origin'},403);
   const b=await bodyOf(request);return u.pathname.endsWith('/admin')?await admin(request,env,b):await write(request,env,b,lang);
  }
  if(!['GET','HEAD'].includes(request.method))return json({ok:false,code:'method'},405);
  if(sitemap){const rows=(await db.prepare("SELECT id,lang FROM discuss_posts WHERE status='public' AND parent IS NULL ORDER BY published DESC LIMIT 5000").all()).results;const urls=['/discuss','/zh/discuss',...seeds.flatMap(s=>[topicPath('en',s.id),topicPath('zh',s.id)]),...rows.map(p=>topicPath(p.lang,p.id))];return new Response(request.method==='HEAD'?null:'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(p=>'<url><loc>'+ORIGIN+p+'</loc></url>').join('')+'</urlset>',{headers:{...headers,'Content-Type':'application/xml'}});}
  const id=match[2],page=pageOf(u.searchParams.get('page'));let response;
  if(!id)response=html(hub(lang,await listing(db,lang,Object.hasOwn(categories,u.searchParams.get('category'))?u.searchParams.get('category'):'',(page-1)*20),Object.hasOwn(categories,u.searchParams.get('category'))?u.searchParams.get('category'):'',page));
  else if(id==='account')response=html(account(lang));
  else if(id==='rules')response=html(rules(lang));
  else if(id==='moderate')response=html(moderate(lang));
  else if(id==='new')response=html(shell(lang,{title:t('Start a discussion','发起讨论'),description:t('Bring evidence or a first-hand experience.','带来证据或第一手经历。'),path:root(lang)+'/new',noindex:true,body:postForm(lang)}));
  else{const p=await thread(db,id,lang);if(!p)return html(shell(lang,{title:t('Discussion not available','讨论暂不可用'),description:'',path:root(lang),noindex:true,body:`<h1>${t('Discussion not available','讨论暂不可用')}</h1><p>${t('It may be pending review or removed. Check your account for your own submissions.','该讨论可能正在审核或已被删除。自己的投稿可在账号页查看。')}</p><a href="${root(lang)}">${t('Back to discussions','返回讨论区')}</a>`}),404);const total=(await db.prepare("SELECT COUNT(*) n FROM discuss_posts WHERE parent=? AND status='public'").bind(id).first()).n;response=html(topic(lang,p,await replies(db,id,(page-1)*30),page,total));}
  return request.method==='HEAD'?new Response(null,response):response;
 }catch(e){const status={unauthorized:401,suspended:403,origin:403,profile_required:403,not_found:404,rate_limited:429,too_large:413,json_required:415,bad_input:400,bad_source:400,bad_handle:400,bad_content:400,consent_required:400,bad_action:400,handle_taken:409,follow_limit:409}[e.message]||503;const code=status===503?'unavailable':e.message;return api?json({ok:false,code},status):html(shell(lang,{title:t('Discussions are temporarily unavailable','讨论区暂时不可用'),description:'',noindex:true,body:`<h1>${t('Please try again shortly','请稍后再试')}</h1><p>${t('Your saved drafts remain in this tab.','已保存的草稿仍保留在当前标签页。')}</p><a href="${lang==='zh'?'/cn':'/'}">${t('Return home','返回首页')}</a>`}),503);}
}
