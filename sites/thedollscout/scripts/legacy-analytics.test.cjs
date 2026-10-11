const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const script=fs.readFileSync(path.join(__dirname,'../js/main.js'),'utf8');
function visit(options={}) {
  const sent=[],handlers=new Map();
  let denied=Boolean(options.denied);
  const window={};window.top=window.self=window;
  if(options.embedded) window.top={};
  const document={
    referrer:'https://search.example/search?q=private+query#private-fragment',
    addEventListener(type,handler){handlers.set(type,[...(handlers.get(type)||[]),handler]);}
  };
  const location={hostname:'thedollscout.com',pathname:'/collection-tracker',search:'?search=private-figure#private-fragment',...options.location};
  const navigator={userAgent:'Mozilla/5.0',sendBeacon(url,body){sent.push({url,body:JSON.parse(body)});return true;},...options.navigator};
  vm.runInNewContext(script,{window,document,location,navigator,URLSearchParams,URL,
    localStorage:{getItem(){if(options.storageUnavailable)throw Error('blocked');return denied?'denied':null;}}
  });
  return {sent,deny(){denied=true;},click(href,sponsored=true){
    const target={closest(selector){return sponsored&&selector==="a[rel~='sponsored']"?{href}:null;}};
    for(const handler of handlers.get('click')||[])handler({target});
  }};
}

test('a real visit and affiliate click emit only public path and origin, never query or referrer path',()=>{
  const ui=visit();
  assert.deepEqual(ui.sent,[{url:'/api/ev',body:{p:'/collection-tracker',r:'https://search.example',e:''}}]);
  ui.click('https://www.amazon.com/dp/EXAMPLE?tag=ecoback0d-20&search=private-item#private');
  assert.deepEqual(ui.sent[1],{url:'/api/ev',body:{p:'/collection-tracker',r:'https://www.amazon.com',e:'affiliate_click'}});
  ui.click('https://example.com/plain-link',false);
  assert.equal(ui.sent.length,2);
  assert.ok(!JSON.stringify(ui.sent).includes('private'));
});

test('QA, preview, embedded, automated and privacy-excluded visits create no first-party rows',()=>{
  const cases=[
    ...['ci','__ci','__probe','qa','__qa'].map(key=>({location:{search:'?'+key+'=1'}})),
    {location:{search:'?utm_source=verify'}},{location:{pathname:'/__ci/collector-test'}},
    {location:{hostname:'preview.pages.dev'}},{location:{hostname:'localhost'}},{embedded:true},
    {navigator:{webdriver:true}},{navigator:{userAgent:'HeadlessChrome'}},
    {navigator:{doNotTrack:'1'}},{navigator:{globalPrivacyControl:true}},
    {denied:true},{storageUnavailable:true}
  ];
  for(const options of cases) {
    const ui=visit(options);ui.click('https://www.amazon.com/?tag=ecoback0d-20');
    assert.deepEqual(ui.sent,[],JSON.stringify(options));
  }
});

test('withdrawing analytics after arrival stops subsequent affiliate measurement',()=>{
  const ui=visit();assert.equal(ui.sent.length,1);
  ui.deny();ui.click('https://www.amazon.com/?tag=ecoback0d-20');
  assert.equal(ui.sent.length,1);
});
