import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {requestURL,pinnedLookup} from './catalog-network.mjs';

// Entirely offline: DNS and HTTPS are replaced; shortened timers exercise the
// actual DNS/request deadlines and retry loop without contacting publishers.
const v4={address:'8.8.8.8',family:4},v6={address:'2001:4860:4802:38::15',family:6};
const networkError=code=>Object.assign(new Error(code),{code});
let count=0;
async function check(name,fn){await fn();count++;console.log('PASS '+name);}
async function fixture(steps,fn,{addresses=[v6,v4],resolve}={}){
  const originalGet=https.get,originalTimer=globalThis.setTimeout;
  const calls=[],timers=[];
  globalThis.setTimeout=(fn,ms,...args)=>{timers.push(ms);return originalTimer(fn,Math.min(ms,5),...args);};
  https.get=(url,options,onResponse)=>{
    const step=steps[Math.min(calls.length,steps.length-1)],req=new EventEmitter();
    let closed=false;
    const close=()=>{if(!closed){closed=true;req.emit('close');}};
    req.destroy=error=>{req.destroyed=true;queueMicrotask(()=>{if(error)req.emit('error',error);close();});return req;};
    calls.push({url:String(url),options});
    let returned=false;
    options.lookup(url.hostname,{all:true},(error,answers)=>{
      assert.equal(returned,true,'lookup must defer until HTTPS has installed socket error listeners');
      if(error){req.destroy(error);return;}
      assert.equal(options.autoSelectFamily,true,'Node must be allowed to try both validated families');
      assert.equal(options.autoSelectFamilyAttemptTimeout,250);
      assert.deepEqual(answers,[...addresses].sort((a,b)=>a.family-b.family));
      if(step.error){req.destroy(step.error);return;}
      if(step.stall)return;
      const res=new EventEmitter();res.statusCode=step.status??200;res.headers=step.headers??{};
      res.destroy=()=>queueMicrotask(close);
      onResponse(res);
      if(res.listenerCount('data'))queueMicrotask(()=>{
        if(step.responseError){res.emit('error',step.responseError);close();return;}
        res.emit('data',Buffer.from(step.body??'{"ok":true}'));
        if(!req.destroyed)res.emit('end');close();
      });
    });
    returned=true;
    return req;
  };
  try{return await fn({calls,timers,resolve:resolve??(async()=>addresses)});}
  finally{https.get=originalGet;globalThis.setTimeout=originalTimer;}
}

await check('pinned DNS is asynchronous, IPv4-first, family-aware and never re-resolves',async()=>{
  const lookup=pinnedLookup([v6,v4]);
  for(const [options,want] of [[{all:true},[v4,v6]],[{family:6,all:true},[v6]],[{family:4},v4],[6,v6]]){
    let returned=false;
    const result=new Promise((resolve,reject)=>lookup('publisher.example',options,(error,address,family)=>{
      assert.equal(returned,true);if(error)reject(error);else resolve(options.all?address:{address,family});
    }));returned=true;assert.deepEqual(await result,want);
  }
  await assert.rejects(new Promise((resolve,reject)=>pinnedLookup([v6])('publisher.example',{family:4},error=>error?reject(error):resolve())),{code:'ENOTFOUND'});
});
await check('both address families remain available and IPv6-only DNS still works',async()=>{
  for(const addresses of [[v6,v4],[v6],[v4]])await fixture([{status:200}],async({resolve,calls})=>{
    assert.equal((await requestURL('https://publisher.example/',{resolve})).status,200);assert.equal(calls.length,1);
  },{addresses});
});
await check('IPv6 ENETUNREACH then healthy request recovers within the existing retry budget',async()=>{
  await fixture([{error:networkError('ENETUNREACH')},{status:200}],async({resolve,calls})=>{
    assert.equal((await requestURL('https://publisher.example/',{resolve,json:true})).data.ok,true);assert.equal(calls.length,2);
  });
});
await check('all-family AggregateError rejects after exactly three attempts, never false success',async()=>{
  const error=new AggregateError([networkError('ENETUNREACH'),networkError('ETIMEDOUT')]);
  await fixture([{error}],async({resolve,calls})=>{
    await assert.rejects(requestURL('https://publisher.example/',{resolve}),e=>e===error);assert.equal(calls.length,3);
  });
});
await check('request timeout destroys each stalled request and remains a failure',async()=>{
  await fixture([{stall:true}],async({resolve,calls,timers})=>{
    await assert.rejects(requestURL('https://publisher.example/',{resolve}),/request-timeout/);
    assert.equal(calls.length,3);assert.equal(timers.filter(ms=>ms===12000).length,3);
  });
});
await check('DNS timeout is bounded and never opens HTTPS',async()=>{
  await fixture([],async({resolve,calls,timers})=>{
    await assert.rejects(requestURL('https://publisher.example/',{resolve}),/dns-timeout/);
    assert.equal(calls.length,0);assert.equal(timers.filter(ms=>ms===5000).length,3);
  },{resolve:()=>new Promise(()=>{})});
});
await check('403 and 429 stop immediately without retry, family fallback or success data',async()=>{
  for(const status of [401,403,429])await fixture([{status}],async({resolve,calls,timers})=>{
    const result=await requestURL('https://publisher.example/',{resolve,json:true});
    assert.equal(result.status,status);assert.equal(result.data,undefined);assert.equal(calls.length,1);
    assert.equal(timers.some(ms=>ms===500),false);
  });
});
await check('transient 503 retries but never converts an exhausted response into success',async()=>{
  await fixture([{status:503}],async({resolve,calls})=>{assert.equal((await requestURL('https://publisher.example/',{resolve})).status,503);assert.equal(calls.length,3);});
});
await check('TLS certificate failures and mixed aggregate errors are never retried',async()=>{
  const certificate=networkError('CERT_HAS_EXPIRED');
  for(const error of [certificate,new AggregateError([networkError('ENETUNREACH'),certificate])])await fixture([{error}],async({resolve,calls})=>{
    await assert.rejects(requestURL('https://publisher.example/',{resolve}),e=>e===error);assert.equal(calls.length,1);
  });
});
await check('private DNS in a mixed answer fails closed before any connection',async()=>{
  await fixture([],async({resolve,calls})=>{await assert.rejects(requestURL('https://publisher.example/',{resolve}),/unsafe-dns/);assert.equal(calls.length,0);},{addresses:[v4,{address:'127.0.0.1',family:4}]});
});
await check('redirects are revalidated and unsafe targets are not retried',async()=>{
  await fixture([{status:302,headers:{location:'https://127.0.0.1/'}}],async({resolve,calls})=>{
    await assert.rejects(requestURL('https://publisher.example/',{resolve}),/unsafe-url/);assert.equal(calls.length,1);
  });
});
await check('GitHub credentials never follow a redirect to a publisher host',async()=>{
  await fixture([{status:302,headers:{location:'https://publisher.example/'}},{status:200}],async({resolve,calls})=>{
    assert.equal((await requestURL('https://api.github.com/repos/acme/tool',{resolve,token:'fixture-only'})).status,200);
    assert.equal(calls.length,2);assert.equal(calls[0].options.headers.authorization,'Bearer fixture-only');assert.equal(calls[1].options.headers.authorization,undefined);
  });
});
await check('malformed JSON and oversized bodies fail once without retry',async()=>{
  for(const [body,error] of [['not-json',SyntaxError],[JSON.stringify({text:'x'.repeat(2_000_001)}),/body-limit/]])await fixture([{body}],async({resolve,calls})=>{
    await assert.rejects(requestURL('https://publisher.example/',{resolve,json:true}),error);assert.equal(calls.length,1);
  });
});
await check('a response stream failure remains rejected and respects the retry budget',async()=>{
  await fixture([{responseError:networkError('ECONNRESET')}],async({resolve,calls})=>{
    await assert.rejects(requestURL('https://publisher.example/',{resolve,json:true}),{code:'ECONNRESET'});assert.equal(calls.length,3);
  });
});
console.log('PASS '+count+' catalogue transport checks (mock DNS/HTTPS only).');
