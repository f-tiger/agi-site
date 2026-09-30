import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname,join} from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet,onRequestPost} from '../functions/api/codex-efficiency.js';
import {ensureEfficiency,startDevice} from '../lib/codex-efficiency.js';
import {digest,seconds} from '../lib/ad-commerce.js';
import {hash,issueSession,cookie} from '../lib/free-account.js';
import {watchWeb3} from '../lib/ad-web3.js';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
function database(){const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');return {sql,prepare(query){let args=[];return {query,get args(){return args},bind(...a){args=a;return this},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return {meta:{changes:sql.prepare(query).run(...args).changes}}}}},async batch(items){sql.exec('BEGIN');try{const out=items.map(s=>({meta:{changes:sql.prepare(s.query).run(...s.args).changes}}));sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};}
let db,env,session,authenticated=true,fail=false,origin;
const root=resolve('sites/baipiaoji/dist'),screens=process.env.CE_SCREENSHOTS||'/tmp/bpj-efficiency-browser';mkdirSync(screens,{recursive:true});
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);const result=b.method==='eth_chainId'?'0x38':b.method==='eth_call'?'0x12':b.method==='eth_getLogs'?[]:b.method==='eth_getBlockByNumber'?{number:'0x3e8',timestamp:'0x'+seconds().toString(16)}:null;return Response.json({result});};
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,origin);if(u.pathname==='/api/codex-efficiency'){
 if(fail&&req.method==='POST'){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,code:'temporarily_unavailable'}));return;}
 let raw='';for await(const c of req)raw+=c;const request=new Request('https://baipiaoji.com'+u.pathname,{method:req.method,headers:{'Content-Type':'application/json',Origin:'https://baipiaoji.com','CF-Connecting-IP':'192.0.2.5',...(authenticated?{Cookie:cookie(session).split(';')[0]}:{})},...(req.method==='POST'?{body:raw}:{})});
 const r=await(req.method==='GET'?onRequestGet({env}):onRequestPost({request,env}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
 let path=u.pathname;if(path.endsWith('/'))path+='index.html';else if(!extname(path))path+='.html';const f=resolve(root,'.'+path);if(!f.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript'})[extname(f)]||'text/plain');res.end(readFileSync(f,'utf8').replaceAll('https://baipiaoji.com',origin));}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;let browser;
try{browser=await chromium.launch({headless:true,...(process.env.CE_BROWSER_CONFIG?JSON.parse(readFileSync(process.env.CE_BROWSER_CONFIG,'utf8')):{})});for(const lang of ['zh','en']){
 db=database();env={HITS:db,CODEX_EFFICIENCY_ENABLED:'true',ADS_WEB3_ENABLED:'true',ADS_WALLET_CHAIN:'bsc',ADS_WALLET:'0x'+'1'.repeat(40),ADS_WEB3_PRICE_USD:'49.00',ADS_WEB3_RPC_URL:'https://rpc.example.test',ADS_WATCH_SECRET:'s'.repeat(64),ADS_DAYS:'30'};await ensureEfficiency(env);db.sql.prepare('INSERT INTO free_accounts(id,username,password_hash,recovery_hash,created,updated) VALUES(?,?,?,?,?,?)').run('browser-test','browser-test','fixture','fixture',seconds(),seconds());session=await issueSession(env,{id:'browser-test',session_version:1});await watchWeb3(env);db.sql.prepare('INSERT INTO ce_health(id,checked_at) VALUES(1,?)').run(seconds());
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));authenticated=false;await page.goto(origin+(lang==='en'?'/en':'')+'/studio/codex-efficiency?__ci=1');await page.waitForFunction(()=>document.querySelector('#ce-status').textContent.length>0);assert.equal(await page.locator('#ce-account').isVisible(),false);
 authenticated=true;await page.locator('#ce-refresh').click();await page.locator('#ce-account').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#ce-checkout').disabled);
 const start=await startDevice(env,await digest('e'.repeat(64)),'test-ip');await page.locator('#ce-connect input').fill(start.code);await page.locator('#ce-connect button').click();await page.waitForFunction(()=>document.querySelector('#ce-devices').textContent.length>0);assert.equal(db.sql.prepare('SELECT account_id FROM ce_devices').get().account_id,'browser-test');
 await page.locator('#ce-devices button').click();await page.waitForFunction(()=>document.querySelector('#ce-devices button')===null);assert.equal(db.sql.prepare('SELECT revoked FROM ce_devices').get().revoked,1);
 await page.locator('#ce-buy input').check();fail=true;await page.locator('#ce-checkout').click();await page.waitForFunction(()=>/unavailable|暂时/.test(document.querySelector('#ce-status').textContent));assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM ce_orders').get().n,0);fail=false;await page.locator('#ce-checkout').click();await page.locator('.ce-order').waitFor();assert.equal(db.sql.prepare('SELECT amount_units FROM ce_orders').get().amount_units,19000001);assert.ok((await page.locator('.ce-order').textContent()).includes('19.000001'));
 await page.locator('#ce-checkout').click();await page.waitForTimeout(100);assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM ce_orders').get().n,1);
 const help=page.getByRole('button',{name:lang==='en'?'Request help with this order':'请求处理此订单',exact:true});await help.click();await page.waitForFunction(()=>/requested|已记录/.test(document.querySelector('#ce-status').textContent));assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM ce_support').get().n,1);
 const download=page.waitForEvent('download');await page.locator('#ce-history').click();assert.equal((await download).suggestedFilename(),'bpj-efficiency-history.json');
 await page.evaluate(()=>scrollTo(0,0));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:join(screens,lang+'-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:join(screens,lang+'-desktop.png'),fullPage:true});assert.deepEqual(errors,[]);await context.close();}
 console.log('PASS EN/ZH desktop+mobile: real endpoint/SQLite with fixture identity and mocked RPC, sign-in wall, device approval/revocation, failed checkout/retry, exact order, help, history, no overflow or page errors. No real funds. Screenshots: '+screens);
}finally{await browser?.close();await new Promise(r=>server.close(r));globalThis.fetch=originalFetch;}
