import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {database} from '../../../tools/member-studio/test-fixtures.mjs';
import {onRequest as accountRoute} from '../functions/api/account.js';
import {onRequest as keysRoute} from '../functions/api/trade-mcp-keys.js';
import {ACCOUNT_COOKIE,ensureAccounts,issueSession,now} from '../lib/free-account.js';
import {tradeMcpKeysPath,tradeMcpPath} from './trade-mcp-pages.mjs';

const {chromium} = createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const dist = fileURLToPath(new URL('../dist/',import.meta.url));
const origin = 'https://baipiaoji.com';
const keysApi = '/api/trade-mcp-keys';
const db = database();
const env = {HITS:db};
let browser;
try {
  await ensureAccounts(env);
  browser = await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
  for (const locale of ['', '/en']) {
    const accountId = locale ? 'trade-keys-browser-en' : 'trade-keys-browser-zh';
    await db.prepare(`INSERT INTO free_accounts(id,username,password_hash,recovery_hash,created,updated)
      VALUES(?,?,?,?,?,?)`).bind(accountId,accountId,'fixture-hash','fixture-recovery',now(),now()).run();
    const cookieValue = await issueSession(env,{id:accountId,session_version:1});
    const context = await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
    const page = await context.newPage();
    const traffic = [];
    const errors = [];
    let failNextList = false;
    page.on('dialog',dialog=>dialog.accept());
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/*',async route=>{
      const req = route.request(), url = new URL(req.url());
      traffic.push({url,body:req.postData() || ''});
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/api/account' || url.pathname === keysApi) {
        if (url.pathname === keysApi && req.method() === 'GET' && failNextList) {
          failNextList = false;
          return route.fulfill({status:503,json:{ok:false,code:'temporarily_unavailable'}});
        }
        const request = new Request(url,{method:req.method(),headers:await req.allHeaders(),...(req.method()==='POST'?{body:req.postData()}:{})});
        const response = await (url.pathname === keysApi ? keysRoute : accountRoute)({env,request});
        return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
      }
      if (url.pathname.startsWith('/api/')) return route.fulfill({status:204});
      let file = url.pathname;
      if (file.endsWith('/')) file += 'index.html';
      else if (!/\.[a-z]+$/i.test(file)) file += '.html';
      if (!existsSync(dist+file)) return route.fulfill({status:404});
      const mime = {html:'text/html',mjs:'application/javascript',js:'application/javascript',css:'text/css',json:'application/json'};
      return route.fulfill({contentType:mime[file.split('.').pop()]||'application/octet-stream',body:readFileSync(dist+file)});
    });

    const publicPage = origin+locale+tradeMcpPath;
    await page.goto(publicPage+'?__ci=1');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const privateTrafficStart = traffic.length;
    await page.locator('[data-trade-mcp-key-entry]').click();
    const keyPage = origin+locale+tradeMcpKeysPath;
    await page.waitForURL(keyPage);
    const signIn = page.locator('#trade-mcp-sign-in');
    await signIn.waitFor();
    assert.equal(new URL(await signIn.getAttribute('href')).searchParams.get('next'),locale+tradeMcpKeysPath);
    const manager = page.locator('#trade-mcp-manager');
    assert(await manager.isHidden());
    await context.addCookies([{name:ACCOUNT_COOKIE,value:cookieValue,url:origin,secure:true,httpOnly:true,sameSite:'Lax'}]);
    await page.reload();
    await manager.waitFor();
    const label = page.locator('#trade-mcp-label');
    const keyList = page.locator('#trade-mcp-key-list');
    const secretPanel = page.locator('#trade-mcp-secret-panel');
    const secretField = page.locator('#trade-mcp-secret');
    assert(await secretPanel.isHidden());
    await label.fill('Fixture laptop');
    failNextList = true;
    await page.locator('#trade-mcp-create-button').click();
    await secretPanel.waitFor();
    const oldKey = await secretField.inputValue();
    assert(/^bpj_trade_[A-Za-z0-9_-]{43}$/.test(oldKey));
    assert.equal(await secretField.getAttribute('type'),'password');
    const retry = page.locator('#trade-mcp-retry');
    await retry.waitFor();
    assert.equal(await secretField.inputValue(),oldKey,'Transient list refresh must preserve the one-time key');
    await retry.click();
    await keyList.locator('li').waitFor();
    const pending = page.waitForEvent('download');
    await page.locator('#trade-mcp-download').click();
    const download = await pending;
    assert.equal(download.suggestedFilename(),'bpj-trade-mcp.private.json');
    const config = JSON.parse(readFileSync(await download.path(),'utf8'));
    assert.deepEqual(config.mcpServers['bpj-trade-tools'],{url:origin+'/api/trade-mcp',headers:{Authorization:'Bearer '+oldKey}});
    assert(!await page.evaluate(key=>[...Object.values(localStorage),...Object.values(sessionStorage)].some(value=>String(value).includes(key)),oldKey));
    assert.equal(await keyList.locator('li strong').textContent(),'Fixture laptop');
    await keyList.locator('li button').first().click();
    await page.waitForFunction(key=>{
      const field=document.querySelector('#trade-mcp-secret');
      return field.value && field.value!==key;
    },oldKey);
    const newKey = await secretField.inputValue();
    assert.notEqual(oldKey,newKey);
    await keyList.locator('li button').last().click();
    await page.waitForFunction(()=>!document.querySelector('#trade-mcp-key-list').children.length);
    assert(await secretPanel.isHidden());
    assert.equal(await secretField.inputValue(),'');

    await label.fill('Tab cleanliness');
    await page.locator('#trade-mcp-create-button').click();
    await secretPanel.waitFor();
    await context.clearCookies();
    await page.reload();
    await signIn.waitFor();
    assert(await secretPanel.isHidden());
    assert.equal(await secretField.inputValue(),'');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    assert(!traffic.slice(privateTrafficStart).some(({url})=>/analytics|googletagmanager/i.test(url.href)));
    assert(!traffic.some(({url,body})=>url.href.includes(oldKey)||url.href.includes(newKey)||body.includes(oldKey)||body.includes(newKey)));
    await context.close();
  }
  console.log('PASS trade MCP browser: bilingual guest and key management, one-time config, metadata failure recovery, rotate/revoke, sign-out clearing, private requests and mobile layout.');
} finally {
  if (browser) await browser.close();
  db.sql.close();
}
