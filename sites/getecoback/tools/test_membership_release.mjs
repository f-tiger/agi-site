import test from 'node:test';
import assert from 'node:assert/strict';
import {state,compare} from './check_membership_release.mjs';
test('an already closed membership does not block an unrelated content release',()=>{
  assert.equal(compare(state({ok:true,site:'eco',ready:false}),state({ok:true,site:'eco',ready:false})),'previously-unavailable');
});
test('a release cannot newly disable membership',()=>{
  assert.throws(()=>compare({site:'eco',ready:true},{site:'eco',ready:false}),/became unavailable/);
  assert.equal(compare({site:'eco',ready:false},{site:'eco',ready:true}),'ready');
});
test('malformed or failed APIs remain release failures and non-health fields are discarded',()=>{
  for(const data of [{ok:false,site:'eco',ready:false},{ok:true,site:'bpj',ready:true},{ok:true,site:'eco'}]) assert.throws(()=>state(data));
  assert.deepEqual(state({ok:true,site:'eco',ready:true,irrelevant:'not-persisted'}),{site:'eco',ready:true});
});
