import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchEntries,normalize} from '../site/assets/demand-discovery.mjs';
import {ecoPublicBusinessEvent} from '../site/assets/public-engagement.mjs';
const index=JSON.parse(readFileSync(new URL('../site/search-index.json',import.meta.url)));
test('Natural needs, umlauts, case and filler words resolve to reviewed tasks',()=>{
 for(const [q,l,path] of [['Wie kann ich kalte Füße','de','/guide/homeoffice-warm-bleiben.html'],['waesche trocknen','de','/waeschetrockner-oder-luftentfeuchter.html'],['dry my clothes','en','/en/guide/heated-airer-vs-dehumidifier.html'],['replacement filter','en','/en/filter-finder.html'],['vocht','nl','/nl/ventilatie-of-luchtontvochtiger.html'],['CBAM','zh-CN','/zh/agents/cbam-supplier-data.html']])assert(searchEntries(index,q,l).some(h=>h.entry.u===path),q);
 assert.equal(normalize('FÜẞE'),normalize('fuesse'));
 assert.deepEqual(searchEntries(index,'the my','en'),[]);
});
test('Results stay within the exact language/market and public local routes',()=>{
 for(const l of ['de','en','en-AU','it','fr','es','nl','zh-CN'])for(const h of searchEntries(index,'cost',l))assert.equal(h.entry.l,l);
 const bad=['//evil.test','/auth/account','/members.html','/api/x','/x?private=1','/x#private','/\\evil.test'];
 assert.deepEqual(searchEntries(bad.map(u=>({u,t:'test',l:'de'})),'test','de'),[]);
});
test('Navigation measurement admits fixed names only and rejects raw queries/private routes',()=>{
 for(const name of ['eco_discovery_open','eco_discovery_task','eco_discovery_result']){
  assert.deepEqual(ecoPublicBusinessEvent('/guide/heizdecke-stromverbrauch.html',{name}),{name,tool_id:'eco-discovery'});
  assert.equal(ecoPublicBusinessEvent('/',{name,query:'private@example.test'}),null);
  for(const path of ['/auth/account','/members.html','/en/members.html','/api/x','/?private=1'])assert.equal(ecoPublicBusinessEvent(path,{name}),null);
 }
});
