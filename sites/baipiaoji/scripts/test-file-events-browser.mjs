// Synthetic local fixtures only. The second image can fail during processing.
import {chromium} from '../../../tools/revenue-studio/node_modules/playwright/index.mjs';
import {fileWorkspace} from '../assets/studio/file-view.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin='https://baipiaoji.com';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
try {
 const context=await browser.newContext();
 await context.addInitScript(()=>{
  Object.defineProperty(navigator,'webdriver',{get:()=>false});
  window.actionCounts=[];window.bpjEv=(...args)=>window.actionCounts.push(args);
 });
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort();
  if(url.pathname==='/en/studio/product-images')return route.fulfill({contentType:'text/html',body:'<html lang="en"><body>'+fileWorkspace('image','en')+'<script type="module" src="/studio-assets/file-app.mjs"></script></body></html>'});
  if(!url.pathname.startsWith('/studio-assets/'))return route.abort();
  const file=new URL('../assets/studio/'+url.pathname.slice('/studio-assets/'.length),import.meta.url);
  let body=fs.readFileSync(file,'utf8');
  if(url.pathname.endsWith('/file-engine.mjs')) {
   body=body.replace('export async function processImage(file,s){','async function originalProcessImage(file,s){');
   body+='\nexport async function processImage(file,s){if(window.failSecond&&file.name.includes("2"))throw Error("synthetic failure");return originalProcessImage(file,s);}\n';
  }
  return route.fulfill({contentType:'text/javascript',body});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/en/studio/product-images');
 await page.locator('#ft-sample').click();await page.locator('#ft-files li[data-id]').nth(1).waitFor();
 await page.locator('#ft-run').click();await page.locator('.file-output-grid article').nth(1).waitFor();
 assert.deepEqual(await page.evaluate(()=>window.actionCounts.filter(a=>a[1].includes('/complete/'))),[['calc','/studio/product-images/complete/demo']]);
 await page.evaluate(()=>{window.actionCounts=[];window.failSecond=true;});
 await page.locator('#ft-run').click();await page.locator('#ft-output .file-error').waitFor();
 assert.deepEqual(await page.evaluate(()=>window.actionCounts),[['calc','/studio/product-images/start/demo'],['calc','/studio/product-images/partial/demo']]);
 assert.equal(await page.locator('.file-output-grid article').count(),1);
 assert.deepEqual(errors,[]);
 await context.close();
 console.log('PASS BPJ full/partial outcomes: failed batch emits partial, never complete; fixed demo actions contain no file content.');
} finally { await browser.close(); }
