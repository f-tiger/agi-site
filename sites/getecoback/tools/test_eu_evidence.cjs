const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const site = path.join(__dirname, '../site');
const source = fs.readFileSync(path.join(site, 'js/eu-evidence.js'), 'utf8');
const slugs = ['cbam-supplier-data', 'eudr-geolocation-evidence'];
function element() {
  return {textContent:'', value:'unknown', hidden:false, children:[], handlers:{}, selectedOptions:[{text:'Not confirmed'}],
    addEventListener(k,f){this.handlers[k]=f;}, replaceChildren(){this.children=[];}, appendChild(c){this.children.push(c);},
    click(){this.clicked=true;}, remove(){}, focus(){this.focused=true;}};
}
for (const lang of ['en', 'zh']) for (const slug of slugs) {
  test(`${lang}/${slug}: working checklist, local export and matching discovery metadata`, async () => {
    const html = fs.readFileSync(path.join(site, lang, 'agents', slug+'.html'), 'utf8');
    const t = JSON.parse(html.match(/<script id="checker-data" type="application\/json">(.*?)<\/script>/s)[1]);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
    const canonical = `https://getecoback.com/${lang}/agents/${slug}.html`;
    assert.equal(graph[0].url, canonical);
    assert.ok(html.includes(`href="${canonical}"`));
    assert.ok(!html.includes('thomasedisonfault.chatgpt.site'));
    assert.equal((html.match(/<h1>/g)||[]).length,1);
    const visible = html.replace(/<script\b.*?<\/script>/gs,'').replace(/<style\b.*?<\/style>/gs,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
    assert.deepEqual(graph.find(x=>x['@type']==='FAQPage').mainEntity.map(x=>[x.name,x.acceptedAnswer.text]), t.faqs);
    for(const [q,a] of t.faqs){assert.ok(visible.includes(q));assert.ok(visible.includes(a));}
    for(const l of ['en','zh']) assert.ok(html.includes(`/${l}/agents/${slug}.html`));
    for(const [,url] of html.matchAll(/(?:href|src)="(\/[^"#?]+)(?:[?#][^"]*)?"/g)) {
      const file = path.join(site, url.endsWith('/') ? url+'index.html' : url);
      assert.ok(fs.existsSync(file),`Broken local link: ${url}`);
    }
    const nodes={};
    for(const id of ['checker-data','evidence-check','summary','gaps','result','limit','download','share','share-status','deadline','product-scope','size','commodity',...t.items.map(x=>x[0])])nodes[id]=element();
    nodes['checker-data'].textContent=JSON.stringify(t);
    let exported;
    const beacons=[];
    const document={getElementById:id=>nodes[id],createElement:element,body:element(),querySelector:()=>({href:canonical}),referrer:''};
    const context={document,Blob,location:{pathname:`/${lang}/agents/${slug}.html`},URL:{createObjectURL(blob){exported=blob;return 'blob:test';},revokeObjectURL(){}},navigator:{clipboard:{async writeText(v){assert.equal(v,canonical);}},sendBeacon(url,blob){assert.equal(url,'/api/ev');beacons.push(blob);return true;}},setTimeout:f=>f(),fetch:()=>{throw Error('Checklist must not submit answers');}};
    vm.runInNewContext(source,context);
    const submit=()=>nodes['evidence-check'].handlers.submit({preventDefault(){}});
    assert.equal(nodes.download.hidden,true);
    submit();assert.equal(nodes.gaps.children.length,t.items.length);
    for(const [id] of t.items) nodes[id].value='yes';
    submit();assert.equal(nodes.summary.textContent,t.done);assert.equal(nodes.gaps.children.length,0);
    const [id,,action]=t.items[2];nodes[id].value='no';nodes['evidence-check'].handlers.change();
    assert.equal(nodes.download.hidden,true);assert.equal(nodes.gaps.children.length,0);
    submit();assert.equal(nodes.gaps.children.length,1);assert.ok(nodes.result.focused);
    nodes.download.handlers.click();const exportedText=await exported.text();
    assert.ok(exportedText.includes(action));assert.ok(exportedText.includes(canonical));assert.ok(exportedText.includes(t.limit));
    if(t.topic==='eudr'){
      const change=()=>nodes['evidence-check'].handlers.change();
      nodes.size.value='large';change();assert.equal(nodes.deadline.textContent,t.deadlineUnknown);
      nodes['product-scope'].value='existing';change();assert.equal(nodes.deadline.textContent,t.deadline2026);
      nodes.size.value='small';change();assert.equal(nodes.deadline.textContent,t.deadline2027);
      nodes.size.value='small-eutr';change();assert.equal(nodes.deadline.textContent,t.deadline2026);
      nodes['product-scope'].value='added';change();assert.equal(nodes.deadline.textContent,t.deadlineAdded);
      submit();nodes.download.handlers.click();assert.ok((await exported.text()).includes(t.deadlineAdded));
      nodes['product-scope'].value='unknown';change();assert.equal(nodes.deadline.textContent,t.deadlineUnknown);
    }
    await nodes.share.handlers.click();assert.equal(nodes['share-status'].textContent,t.copied);
    context.navigator.clipboard.writeText=async()=>{throw Error('unavailable');};
    await nodes.share.handlers.click();assert.equal(nodes['share-status'].textContent,t.copyError);
    for(const [id] of t.items)nodes[id].value='unknown';
    nodes['evidence-check'].handlers.reset();assert.equal(nodes.summary.textContent,t.empty);assert.equal(nodes.download.hidden,true);
    // Usage counting (2026-09-25): the page may report that it was viewed, run
    // and downloaded, and nothing else. No answer, no count of open items, no
    // question or advice text may ever leave the page.
    const sent=await Promise.all(beacons.map(b=>b.text()));
    const names=sent.map(x=>JSON.parse(x).n);
    for(const need of ['page_view','evidence_check','evidence_download'])assert.ok(names.includes(need),`beacon ${need} never fired`);
    for(const raw of sent){
      const e=JSON.parse(raw);
      assert.ok(['page_view','evidence_check','evidence_download'].includes(e.n),`unexpected event ${e.n}`);
      assert.deepEqual(Object.keys(e).sort(),['m','n','p','r']);
      assert.deepEqual(e.m,{tool:t.topic,lang:t.lang});
      for(const [,question,next] of t.items){assert.ok(!raw.includes(question));assert.ok(!raw.includes(next));}
      for(const v of [t.yes,t.no,t.unknown,t.done])assert.ok(!raw.includes(v),'an answer label left the page');
    }
  });
}
if(process.argv.includes('--discovery'))test('Both languages are linked by hub, search, sitemap and AI index',()=>{
  for(const lang of ['en','zh'])for(const slug of slugs){
    const url=`/${lang}/agents/${slug}.html`;
    for(const file of ['tools.html','search-index.json','sitemap.xml','llms.txt'])assert.ok(fs.readFileSync(path.join(site,file),'utf8').includes(url),`${file} misses ${url}`);
  }
  const entries=JSON.parse(fs.readFileSync(path.join(site,'search-index.json'),'utf8'));
  assert.equal(entries.find(x=>x.u==='/zh/agents/cbam-supplier-data.html').l,'zh-CN');
});
