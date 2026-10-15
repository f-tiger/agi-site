import test from 'node:test';
import assert from 'node:assert/strict';
import {engagementClock} from '../assets/public-engagement.mjs';

test('Only elapsed foreground time, once; background and scheduling/sleep gaps excluded', () => {
  const c=engagementClock(); c.sample(0,true); c.sample(5000,true); c.sample(8000,false);
  assert.equal(c.take(),8000); assert.equal(c.take(),0);
  c.sample(20000,false); c.sample(25000,true); c.sample(28000,false);
  assert.equal(c.take(),3000);
  c.sample(29000,true); c.sample(3600000,true); assert.equal(c.take(),0);
  c.sample(3602000,false); assert.equal(c.take(),2000);
});
test('Short intervals accumulate; opt-out/regrant reset has no replay', () => {
  const c=engagementClock(); c.sample(0,true); c.sample(600,false); assert.equal(c.take(),0);
  c.sample(900,true); c.sample(1500,false); assert.equal(c.take(),1200);
  c.sample(1800,true); c.sample(3800,false); c.reset(); assert.equal(c.take(),0);
  c.sample(10000,true); c.sample(12000,false); assert.equal(c.take(),2000);
});
