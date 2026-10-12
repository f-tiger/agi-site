import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPublishedAsset} from './verify-asset.mjs';

const options = {host:'reconcile.agiscorecard.com', name:'collector.mjs', version:'cb1ffcbde0c2', expected:'new public module\n'};
const response = (text, cacheControl='public, max-age=0, must-revalidate, no-transform') => ({text, headers:new Headers({'cache-control':cacheControl})});

test('An old HTTP 200 asset may converge, using the exact same host and fixed version URL', async () => {
 const calls=[],waits=[];
 const result=await verifyPublishedAsset({...options,
  read:async (...args)=>{calls.push(args);return response(calls.length<3?'old public module\n':options.expected);},
  wait:async ms=>waits.push(ms),
 });
 assert.equal(result.text,options.expected);
 assert.deepEqual(calls,Array(3).fill([options.host,'/analytics-assets/collector.mjs?v=cb1ffcbde0c2']));
 assert.deepEqual(waits,[5000,5000]);
});

test('A permanently stale asset fails after seven reads and still requires exact content', async () => {
 let reads=0;const waits=[];
 await assert.rejects(verifyPublishedAsset({...options,
  read:async ()=>{reads++;return response(options.expected.trimEnd());},
  wait:async ms=>waits.push(ms),
 }),error=>error.code==='ERR_ASSERTION'&&error.message.includes(options.host+'/collector.mjs'));
 assert.equal(reads,7);assert.deepEqual(waits,Array(6).fill(5000));
});

test('Matching frame bytes cannot pass without the no-transform directive', async () => {
 for(const cacheControl of ['public, max-age=0','public, no-transform-incorrect']) {
  let reads=0;
  await assert.rejects(verifyPublishedAsset({...options,name:'frame.html',
   read:async ()=>{reads++;return response(options.expected,cacheControl);},wait:async()=>{},
  }),/Analytics frame must exclude injected third-party beacons/);
  assert.equal(reads,7);
 }
 let reads=0;
 await verifyPublishedAsset({...options,name:'frame.html',read:async()=>{reads++;return response(options.expected);},wait:async()=>assert.fail('Correct assets must not wait')});
 assert.equal(reads,1);
});

test('An exhausted HTTP read failure stays an error rather than restarting a second retry loop', async () => {
 let reads=0;
 await assert.rejects(verifyPublishedAsset({...options,
  read:async()=>{reads++;throw new Error('collector.mjs returned HTTP 503');},
  wait:async()=>assert.fail('read() owns transport retries'),
 }),/HTTP 503/);
 assert.equal(reads,1);
});
