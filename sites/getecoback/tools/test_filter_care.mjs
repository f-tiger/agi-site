import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {affiliateSearchDE,availability,validCare,readSaved,serializeSaved} from '../site/assets/filter-care-core.mjs';
import {businessEvent} from '../../../tools/fleet-analytics/business.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/filter-finder-de.json',import.meta.url)));
const now=new Date('2026-11-15T12:00:00Z');
const item={...data.items[0],status:'verified',checked_at:'2026-11-15'};
test('only approved DE identity can produce the German merchant search',()=>{
  const url=new URL(affiliateSearchDE(item,now));
  assert.equal(url.hostname,'www.amazon.de');assert.equal(url.searchParams.get('tag'),'getecoback-21');
  assert(url.searchParams.get('k').includes('Core 300S'));assert(url.searchParams.get('k').includes('Standardfilter'));
  assert(!url.href.includes('HEACAFL'));assert(!url.pathname.includes('/dp/'));
  for(const changed of [{market:'US'},{models:['Core 300S-P']},{models:['Core 300S Pro']},{source_url:'https://levoit.com/products/example'},{id:'unknown'},{brand:'Other'}])
    assert.equal(affiliateSearchDE({...item,...changed},now),null);
});
test('failed, changed, future, impossible and stale sources have no commerce',()=>{
  for(const status of ['unavailable','conflict','pending'])assert.equal(affiliateSearchDE({...item,status},now),null);
  for(const checked_at of ['2026-11-16','2026-02-30','2026-10-15',''])assert.equal(affiliateSearchDE({...item,checked_at},now),null);
  assert(availability({...item,checked_at:'2026-10-16'},now).active);
});
test('care dates and action must be actual calendar values, never future',()=>{
  assert(validCare({action:'checked',date:'2026-11-15'},'2026-11-15'));
  for(const care of [{action:'other',date:'2026-11-15'},{action:'cleaned',date:'2026-11-16'},{action:'replaced',date:'2026-02-30'},{action:'checked',date:'0099-01-01'}])assert(!validCare(care,'2026-11-15'));
});
test('local restore strips unknown models, markets, extra fields and invalid records',()=>{
  const document={version:1,market:'DE',entries:{[item.id]:{saved:true,care:{action:'checked',date:'2026-11-14',email:'never retain'}},unknown:{saved:true}}};
  const state=readSaved(JSON.stringify(document),'2026-11-15');
  assert.deepEqual(state,{[item.id]:{saved:true,care:{action:'checked',date:'2026-11-14'}}});
  assert.deepEqual(readSaved(serializeSaved(state),'2026-11-15'),state);
  assert.deepEqual(readSaved(JSON.stringify({...document,market:'US'})),{});
  for(const raw of ['{','null','[]','"x"'])assert.deepEqual(readSaved(raw),{});
});
test('care events accept only a fixed action on this route, with no input payload',()=>{
  for(const name of ['eco_filter_save','eco_filter_care_save','eco_filter_source']){
    assert.equal(businessEvent('getecoback.com','/ersatzfilter.html',{name}).tool_id,'filter-care-de');
    assert.equal(businessEvent('getecoback.com','/produkte.html',{name}),null);
    assert.equal(businessEvent('getecoback.com','/ersatzfilter.html',{name,date:'2026-11-15'}),null);
  }
  assert.equal(businessEvent('getecoback.com','/ersatzfilter.html',{name:'eco_filter_Levoit'}),null);
});
