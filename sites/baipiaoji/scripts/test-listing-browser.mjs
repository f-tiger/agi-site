// Local dist only: every HTTP request is intercepted; all inquiry records are synthetic.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const out=process.env.LISTING_QA_DIR||'/tmp/bpj-listing-qa';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
fs.mkdirSync(out,{recursive:true});
const origin='https://baipiaoji.com',errors=[],requests=[],inquiryCalls=[],records=new Map();
const contentTypes={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const sensitive=['QA-PRODUCT-PRIVATE','QA-SOURCE-PRIVATE','QA-DRAFT-PRIVATE','QA-image-private','qa-listing@example.test'];
const fields=['sku','name','brand','material','dimensions','weight','color','features','source'];
const products=[
  {sku:'0007',name:'QA-PRODUCT-PRIVATE <img src="https://leak.invalid/pixel" onerror="window.__listingInjected=1">',brand:'Example',material:'Bamboo',dimensions:'24 x 16 x 2 cm',weight:'180 g',color:'Natural',features:'Open top; flat base',source:'QA-SOURCE-PRIVATE supplier worksheet'},
  {sku:'0008',name:'Drawer divider',brand:'Example',material:'Plastic',dimensions:'30 x 8 cm',weight:'90 g',color:'White',features:'One straight divider',source:'QA-SOURCE-PRIVATE second worksheet'},
];
const csv=[fields,...products.map(product=>fields.map(key=>product[key]))].map(row=>row.map(value=>'"'+value.replaceAll('"','""')+'"').join(',')).join('\r\n');
const draft={products:[
  {sku:'0007',title:'QA-DRAFT-PRIVATE bamboo desk tray',bullets:['Open top and flat base.','24 x 16 x 2 cm; 180 g.'],description:'Natural bamboo desk tray.',missing:[]},
  {sku:'0008',title:'White drawer divider',bullets:['One straight plastic divider.','30 x 8 cm; 90 g.'],description:'White plastic drawer divider.',missing:[]},
]};

// Independently validate ZIPs with Python's standard library, not the browser's ZIP writer.
function unpack(filename){
  const result=JSON.parse(execFileSync('python3',['-c',
    'import sys,zipfile,json,base64\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert z.testzip() is None\n assert len(z.namelist()) == len(set(z.namelist()))\n print(json.dumps({n:base64.b64encode(z.read(n)).decode() for n in z.namelist()}))',filename],{encoding:'utf8'}));
  return Object.fromEntries(Object.entries(result).map(([name,bytes])=>[name,Buffer.from(bytes,'base64')]));
}
const json=(files,name)=>JSON.parse(files[name].toString('utf8'));
async function download(page,selector,name){
  const pending=page.waitForEvent('download',{timeout:15000});
  await page.locator(selector).click();
  const item=await pending,filename=path.join(out,name);
  assert.equal(await item.failure(),null,'Browser download succeeds');
  await item.saveAs(filename);
  return {filename,name:item.suggestedFilename()};
}
async function notDisabled(page,selector){await page.waitForFunction(selector=>{const element=document.querySelector(selector);return element&&!element.disabled;},selector);}
async function responsive(page,lang,stage){
  for(const [label,width,height]of [['desktop',1440,1050],['mobile',390,844]]){
    await page.setViewportSize({width,height});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),lang+' '+stage+' '+label+' has no horizontal overflow');
    await page.screenshot({path:path.join(out,lang+'-'+stage+'-'+label+'.png'),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1050});
}
function noContentLeaks(rows,privateValues=[]){
  for(const row of rows){
    if(new URL(row.url).pathname==='/api/listing-inquiry'&&row.method==='POST')continue;
    const text=row.url+'\n'+(row.body||'');
    for(const value of [...sensitive,...privateValues])assert(!text.includes(value)&&!text.includes(encodeURIComponent(value)),'No input contents in URL, analytics or other requests');
    assert(!text.includes('leak.invalid'),'Hostile source text did not create a network request');
  }
}
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote']});
  async function fixture({normal=false,dropFirst=false}={}){
    const context=await browser.newContext({viewport:{width:1440,height:1050},serviceWorkers:'block'});
    context.setDefaultTimeout(15000);
    let lost=false;
    if(normal)await context.addInitScript(()=>Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>false,configurable:true}));
    context.on('page',page=>{page.on('pageerror',error=>errors.push(error.message));page.on('dialog',async dialog=>{errors.push('Unexpected dialog: '+dialog.type());await dialog.dismiss();});});
    await context.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      requests.push({url:request.url(),method:request.method(),body:request.postData()||''});
      if(url.origin!==origin)return route.abort();
      if(url.pathname==='/api/listing-inquiry'){
        if(request.method()==='GET')return route.fulfill({json:{ok:true,accepting:true,paymentEnabled:false}});
        assert.equal(request.method(),'POST');
        const body=request.postDataJSON();inquiryCalls.push(body);
        if(url.searchParams.has('__qa')||body.qa)return route.fulfill({json:{ok:true,saved:false,code:'qa'}});
        if(body.action==='withdraw'){
          const stored=records.get(body.requestId);
          if(stored)assert.equal(body.receipt,stored.receipt,'Withdrawal needs matching receipt');
          records.delete(body.requestId);
          return route.fulfill({json:{ok:true,code:'withdrawn'}});
        }
        assert.deepEqual(Object.keys(body).sort(),['blocker','consent','email','qa','receipt','requestId','shopUrl','skuCount','website'].sort(),'Only the explicit inquiry fields leave the page');
        assert.equal(body.consent,true);
        const previous=records.get(body.requestId);
        if(previous)assert.deepEqual(body,previous,'A retry must preserve the same request and receipt');
        records.set(body.requestId,body);
        if(dropFirst&&!lost){lost=true;return route.abort('failed');}
        return route.fulfill({json:{ok:true,saved:true,code:'saved'}});
      }
      if(url.pathname==='/api/hit')return route.fulfill({status:204});
      if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ok:false,ready:false}});
      let routePath=decodeURIComponent(url.pathname);
      if(routePath.endsWith('/'))routePath+='index.html';else if(!path.extname(routePath))routePath+='.html';
      const filename=path.resolve(root,'.'+routePath);
      if(!filename.startsWith(root)||!fs.existsSync(filename)||!fs.statSync(filename).isFile())return route.fulfill({status:404,body:'No local fixture'});
      return route.fulfill({body:fs.readFileSync(filename),contentType:contentTypes[path.extname(filename)]||'application/octet-stream'});
    });
    return context;
  }
  async function open(context,prefix,query=''){
    const page=await context.newPage();
    await page.goto(origin+prefix+'/studio/listing-pack'+query);
    await notDisabled(page,'#lp-submit');
    await page.evaluate(()=>{
      window.__listingEvents=[];window.__listingBusiness=[];
      const original=window.bpjEv;
      window.bpjEv=(...args)=>{window.__listingEvents.push(args);original?.(...args);};
      window.addEventListener('fleet:business',event=>window.__listingBusiness.push(event.detail));
    });
    return page;
  }

  for(const [prefix,lang]of [['','zh'],['/en','en']]){
    const start=requests.length,callStart=inquiryCalls.length;
    const context=await fixture({normal:true,dropFirst:true}),page=await open(context,prefix);
    assert.equal(await page.locator('#lp-export').isDisabled(),true,'Empty work cannot export');
    await page.locator('#lp-example').click();
    await notDisabled(page,'#lp-reviewed');
    assert.equal(await page.locator('#lp-preview .lp-preview').count(),2);
    assert.equal(await page.locator('#lp-export').isDisabled(),true,'Example still requires human review');
    await responsive(page,lang,'example');
    await page.locator('#lp-reviewed').check();
    await notDisabled(page,'#lp-export');
    const example=await download(page,'#lp-export',lang+'-example.zip'),sample=unpack(example.filename);
    assert.match(example.name,/-example\.zip$/);
    for(const name of ['sources.csv','sources.json','drafts.csv','drafts.json','review.json','README.md','image-inventory.csv','batch-context.json','FICTIONAL-EXAMPLE.txt'])assert(sample[name],name+' is present');
    assert.deepEqual(json(sample,'sources.json').products.map(product=>product.sku),['001','002']);
    assert.deepEqual(json(sample,'drafts.json').products.map(product=>product.sku),['001','002']);
    assert.equal(json(sample,'review.json').user_attested_review,true);
    assert.equal(json(sample,'batch-context.json').fictionalExample,true);
    assert.equal(json(sample,'batch-context.json').inputMode,'demo');
    assert.match(sample['FICTIONAL-EXAMPLE.txt'].toString(),/FICTIONAL EXAMPLE/);
    assert.match(sample['README.md'].toString(),/not a platform-ready import/);

    await page.locator('#lp-catalog-file').setInputFiles({name:'sources.csv',mimeType:'text/csv',buffer:sample['sources.csv']});
    await page.waitForFunction(()=>document.querySelector('#lp-drafts').value==='');
    assert.equal(await page.locator('#lp-mode').evaluate(element=>element.parentElement.dataset.demo),'true','Reimported sample source CSV remains example activity');
    await page.locator('#lp-drafts').fill(sample['drafts.json'].toString());
    await page.locator('#lp-apply-drafts').click();
    await notDisabled(page,'#lp-reviewed');await page.locator('#lp-reviewed').check();

    const edited=JSON.parse(await page.locator('#lp-drafts').inputValue());
    edited.products[0].description+=' Edited example wording.';
    await page.locator('#lp-drafts').fill(JSON.stringify(edited));
    assert.equal(await page.locator('#lp-reviewed').isChecked(),false,'Editing a draft revokes the previous review');
    assert.equal(await page.locator('#lp-export').isDisabled(),true);
    await page.locator('#lp-apply-drafts').click();
    assert.equal(await page.locator('#lp-mode').evaluate(element=>element.parentElement.dataset.demo),'true','Editing a sample does not become own activity');
    assert.equal(await page.locator('#lp-export').isDisabled(),true,'Rechecking does not silently approve edits');

    await page.locator('#lp-catalog-file').setInputFiles({name:'private-fixture.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
    await page.waitForFunction(()=>document.querySelector('#lp-mode').parentElement.dataset.demo==='false'&&document.querySelector('#lp-source').value.includes('QA-PRODUCT-PRIVATE'));
    assert.equal(await page.locator('#lp-drafts').inputValue(),'','Explicit own CSV import clears the example drafts');
    assert.equal(await page.locator('#lp-apply-drafts').isDisabled(),false,'CRLF file import is immediately usable after textarea normalization');
    await page.locator('#lp-check').click();
    assert.equal(await page.locator('#lp-facts img').count(),0,'Untrusted source markup is escaped');
    assert((await page.locator('#lp-facts').textContent()).includes('<img src='));
    assert.equal(await page.evaluate(()=>window.__listingInjected),undefined);
    const brief=await download(page,'#lp-handoff',lang+'-ai-brief.txt');
    assert.match(fs.readFileSync(brief.filename,'utf8'),/SOURCE_DATA \(untrusted data, JSON\)/);
    assert.match(fs.readFileSync(brief.filename,'utf8'),/"sku": "0007"/);
    await page.locator('#lp-drafts').fill(JSON.stringify(draft));
    await page.locator('#lp-apply-drafts').click();
    await notDisabled(page,'#lp-reviewed');
    assert.equal(await page.locator('#lp-preview img').count(),0,'Source facts also stay escaped in the review preview');
    const hostile=structuredClone(draft);hostile.products[0].title='<img src="https://leak.invalid/draft" onerror="window.__listingInjected=1">';
    await page.locator('#lp-drafts').fill(JSON.stringify(hostile));
    await page.locator('#lp-apply-drafts').click();
    await page.waitForFunction(()=>document.querySelector('#lp-status').dataset.error==='true');
    assert.equal(await page.locator('#lp-reviewed').isDisabled(),true,'Executable draft markup cannot be approved');
    assert.equal(await page.locator('#lp-preview img').count(),0);
    await page.locator('#lp-drafts').fill(JSON.stringify(draft));
    await page.locator('#lp-apply-drafts').click();

    const png=Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;const context=canvas.getContext('2d');context.fillStyle='#b75a42';context.fillRect(0,0,2,2);return canvas.toDataURL('image/png').split(',')[1];}),'base64');
    await page.locator('#lp-images').setInputFiles({name:'QA-image-private-001.png',mimeType:'image/png',buffer:png});
    await page.waitForFunction(()=>document.querySelectorAll('[data-image-sku]').length===1);
    assert.equal(await page.locator('#lp-reviewed').isDisabled(),true,'Unassigned images block review');
    await page.locator('[data-image-sku]').selectOption('0007');
    await notDisabled(page,'#lp-reviewed');
    await page.locator('#lp-reviewed').check();
    await notDisabled(page,'#lp-export');
    const own=await download(page,'#lp-export',lang+'-own.zip'),pack=unpack(own.filename);
    assert.equal(own.name,'bpj-listing-pack.zip');
    assert.equal(pack['FICTIONAL-EXAMPLE.txt'],undefined);
    assert.equal(json(pack,'batch-context.json').inputMode,'own');
    assert.equal(json(pack,'batch-context.json').fictionalExample,false);
    assert.equal(json(pack,'batch-context.json').platformImport,false);
    assert.deepEqual(json(pack,'sources.json').products,products,'Original facts and leading-zero SKUs survive the ZIP');
    assert.deepEqual(json(pack,'drafts.json'),draft);
    assert.equal(json(pack,'review.json').user_attested_review,true);
    assert.deepEqual(pack['images/001.png'],png,'Image bytes are preserved');
    assert.match(pack['image-inventory.csv'].toString(),/"0007","images\/001\.png","QA-image-private-001\.png","2","2"/);
    await responsive(page,lang,'own');
    noContentLeaks(requests.slice(start));

    await page.locator('#lp-email').fill('qa-listing@example.test');
    await page.locator('#lp-shop').fill('https://shop.example.test/');
    await page.locator('#lp-consent').check();
    noContentLeaks(requests.slice(start));
    await page.locator('#lp-submit').click();
    await page.waitForFunction(()=>!document.querySelector('#lp-receipt-box').hidden&&/unconfirmed|待确认/.test(document.querySelector('#lp-receipt-title').textContent)&&/Submission remains unconfirmed|提交结果尚未确认/i.test(document.querySelector('#lp-inquiry-status').textContent));
    const receipt=JSON.parse(await page.locator('#lp-receipt').inputValue());
    assert.deepEqual(Object.keys(receipt).sort(),['receipt','requestId']);
    assert.equal(records.size,1,'Mock accepted the lost-response request exactly once');
    const receiptDownload=await download(page,'#lp-receipt-download',lang+'-request-receipt.json');
    assert.deepEqual(JSON.parse(fs.readFileSync(receiptDownload.filename,'utf8')),receipt,'Unconfirmed receipt can be downloaded');
    await notDisabled(page,'#lp-submit');
    await page.locator('#lp-submit').click();
    await page.waitForFunction(()=>/Request saved|申请已保存/.test(document.querySelector('#lp-inquiry-status').textContent));
    assert.deepEqual(inquiryCalls[callStart],inquiryCalls[callStart+1],'Retry sends identical request ID, receipt and payload');
    assert.equal(records.size,1);
    assert.deepEqual(JSON.parse(await page.locator('#lp-receipt').inputValue()),receipt);
    await notDisabled(page,'#lp-submit');
    await page.locator('#lp-submit').click();
    await notDisabled(page,'#lp-submit');
    assert.equal((await page.evaluate(()=>window.__listingEvents)).filter(event=>event[1]==='/listing/inquiry/own').length,1,'Same saved inquiry is measured once');
    await page.locator('#lp-withdraw').click();
    await page.waitForFunction(()=>document.querySelector('#lp-receipt-box').hidden&&/Withdrawal processed|撤回请求已处理/.test(document.querySelector('#lp-inquiry-status').textContent));
    assert.equal(records.size,0);
    await page.locator('.lp-withdraw-restore summary').click();
    await page.locator('#lp-saved-receipt').fill(JSON.stringify(receipt));
    await page.locator('#lp-withdraw-saved').click();
    await page.waitForFunction(()=>document.querySelector('#lp-saved-receipt').value==='');
    assert.equal(records.size,0,'Saved-receipt withdrawal is idempotent');

    const measured=await page.evaluate(()=>({first:window.__listingEvents,business:window.__listingBusiness}));
    for(const event of measured.first){assert.equal(event[0],'listing');assert.match(event[1],/^\/listing\/(import|check|handoff|draft|review|export|inquiry)\/(demo|own)$/);}
    for(const detail of measured.business){assert.deepEqual(Object.keys(detail),['name']);assert.match(detail.name,/^listing_(import|check|handoff|draft|review|export|inquiry)_(demo|own)$/);}
    for(const action of ['import','check','handoff','draft','review','export','inquiry'])assert(measured.first.some(event=>event[1]==='/listing/'+action+'/own'),'Own '+action+' emits its fixed action');
    for(const action of ['import','draft','review','export'])assert(measured.first.some(event=>event[1]==='/listing/'+action+'/demo'),'Example '+action+' stays distinct');
    noContentLeaks(requests.slice(start));
    const hitRows=requests.slice(start).filter(row=>new URL(row.url).pathname==='/api/hit').map(row=>JSON.parse(row.body));
    assert(hitRows.some(row=>row.e==='listing'&&row.p==='/listing/export/own'),'First-party transport sees the real export action');
    assert(!JSON.stringify(measured).includes('QA-'),'Events contain no product or contact inputs');
    noContentLeaks(requests.slice(start),[receipt.receipt,receipt.requestId]);
    console.log('PASS '+lang+' desktop/mobile, independent ZIP contents, review invalidation, own import, SKU images, escaping, no input leaks, lost-response receipt, retry, withdrawal and fixed events');
    await context.close();
  }

  for(const [label,normal,query]of [['qa-query',true,'?__ci=1'],['webdriver',false,'']]){
    const start=requests.length,context=await fixture({normal}),page=await open(context,'',query);
    await page.locator('#lp-example').click();await notDisabled(page,'#lp-reviewed');await page.locator('#lp-reviewed').check();
    await download(page,'#lp-export',label+'-example.zip');
    await page.locator('#lp-email').fill('qa-listing@example.test');await page.locator('#lp-consent').check();await page.locator('#lp-submit').click();
    await page.waitForFunction(()=>/Request checked|请求已检查/.test(document.querySelector('#lp-inquiry-status').textContent));
    assert.deepEqual(await page.evaluate(()=>window.__listingEvents),[],'QA first-party actions excluded');
    assert.deepEqual(await page.evaluate(()=>window.__listingBusiness),[],'QA GA4 business actions excluded');
    assert.equal(records.size,0,'QA never saves an inquiry');
    assert.equal(await page.locator('#lp-receipt-box').isHidden(),true,'A QA request is not presented as a saved application');
    const savedReceipt={requestId:'10000000-0000-4000-8000-000000000001',receipt:'a'.repeat(64)};
    records.set(savedReceipt.requestId,savedReceipt);
    await page.locator('.lp-withdraw-restore summary').click();
    await page.locator('#lp-saved-receipt').fill(JSON.stringify(savedReceipt));
    await page.locator('#lp-withdraw-saved').click();
    await page.waitForFunction(()=>/No real application was withdrawn|没有撤回真实申请/.test(document.querySelector('#lp-inquiry-status').textContent));
    assert.deepEqual(JSON.parse(await page.locator('#lp-saved-receipt').inputValue()),savedReceipt,'QA withdrawal preserves the user receipt');
    assert.deepEqual(records.get(savedReceipt.requestId),savedReceipt,'QA withdrawal does not modify a saved record');
    records.delete(savedReceipt.requestId);
    assert(!requests.slice(start).filter(row=>new URL(row.url).pathname==='/api/hit').some(row=>JSON.parse(row.body).e==='listing'));
    noContentLeaks(requests.slice(start));await context.close();
    console.log('PASS '+label+' export works with no demand events or saved inquiry');
  }
  assert.deepEqual(errors,[],'No browser exceptions or executable input');
  assert.equal(records.size,0);
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({passed:true,languages:['zh','en'],viewports:['1440x1050','390x844'],network:'Every request intercepted; no production traffic',zipValidation:'Python zipfile',inquiries:'Synthetic in-memory records; all withdrawn; QA excluded',browserErrors:errors},null,2));
  console.log('Artifacts: '+out+'; no production request, payment or model call.');
}finally{if(browser)await browser.close();}
