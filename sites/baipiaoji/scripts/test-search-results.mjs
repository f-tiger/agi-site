import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchResults} from '../lib/search-results.mjs';
for(const locale of ['', 'en/']){
 const index=JSON.parse(readFileSync(new URL('../dist/'+locale+'search-index.json',import.meta.url)));
 for(const query of ['PDF','Codex','Kimi','Grok']){
  const hits=searchResults(index,query);assert(hits.length);assert.equal(new Set(hits.map(x=>x.u)).size,hits.length);
  if(query!=='PDF')assert(hits[0].u.endsWith('/tools/'+query.toLowerCase()),query+' exact tool first');
 }
 assert.equal(searchResults(index,'not-a-real-tool-43867').length,0);
}
const rows=Array.from({length:40},(_,i)=>({n:'Mention '+i,q:'codex',u:'/plans/'+i}));
rows.push({n:'OpenAI Codex',q:'codex',u:'/tools/codex.html'});
assert.equal(searchResults(rows,'codex')[0].n,'OpenAI Codex');
assert.equal(searchResults([{n:'PDF',q:'pdf',u:'/studio/pdf-tools.html'},{n:'PDF tool',q:'pdf',u:'/studio/pdf-tools/?from=nav#x'}],'pdf').length,1);
console.log('PASS search: bilingual real index, canonical deduplication, exact tool after >30 body matches, empty results.');
