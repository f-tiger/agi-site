import assert from 'node:assert/strict';
import {countClaimText} from '../lib/count-claim-text.mjs';
const tool={id:'codeburn',repo:'example/codeburn',origin:'automatic',publisherDescription:'Tracks 37 tools and agents'};
const catalog={tools:[tool]};
const payload=data=>'<script type="application/json" id="github-tool-data">'+JSON.stringify(data)+'</script>';
for (const path of ['dist/github-tools/index.html','dist/en/github-tools/index.html']) {
  const html='<p>37 tools</p>'+payload({tools:[{...tool,description:{en:'37 tools'}}]})+'<script type="application/ld+json">{"name":"37 tools"}</script>';
  const output=countClaimText(html,path,catalog);
  assert.equal(output.includes('Tracks 37 tools'),false);
  assert.equal((output.match(/37 tools/g)||[]).length,3,'visible, BPJ payload copy and JSON-LD claims remain checked');
  assert.throws(()=>countClaimText(payload({tools:[{...tool,publisherDescription:'Tracks 38 tools'}]}),path,catalog),/does not match/);
  assert.throws(()=>countClaimText(payload({tools:[{...tool,id:'unknown'}]}),path,catalog),/does not match/);
  assert.throws(()=>countClaimText(payload({tools:[tool]}),path,{tools:[{...tool,origin:'editorial'}]}),/does not match/);
  assert.throws(()=>countClaimText('<script type="application/json" id="github-tool-data">broken</script>',path,catalog));
}
const html=payload({tools:[tool]});
assert.equal(countClaimText(html,'dist/index.html',catalog),html);
assert.equal(countClaimText('<p>37 tools</p>','dist/github-tools/index.html',catalog),'<p>37 tools</p>');
console.log('PASS source-scoped publisher descriptions; owned, visible, structured and hostile claims remain gated.');
