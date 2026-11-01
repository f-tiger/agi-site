import test from 'node:test';
import assert from 'node:assert/strict';
import {activeRefresh} from '../public/active-refresh.mjs';
function fixture(refresh = async () => {}) {
  let time = 0, cancelled = false;
  const doc = new EventTarget(); doc.hidden = false;
  const control = activeRefresh(refresh, {document: doc, now: () => time,
    schedule: () => 1, cancel: () => { cancelled = true; }});
  return {doc, control, at: value => { time = value; }, active: () => doc.dispatchEvent(new Event('pointerdown')),
    cancelled: () => cancelled};
}
test('initial HTML does not provoke an extra request; idle and hidden tabs stop polling', async () => {
  let calls = 0; const f = fixture(async () => { calls++; });
  assert.equal(await f.control.tick(), false);
  f.at(300000); assert.equal(await f.control.tick(), false); // visible, abandoned tab
  f.active(); f.doc.hidden = true; assert.equal(await f.control.tick(), false);
  f.doc.hidden = false; assert.equal(await f.control.tick(), true); assert.equal(calls, 1);
  f.at(360000); f.active(); assert.equal(await f.control.tick(), false); // no 60s poll
  f.at(600000); f.active(); assert.equal(await f.control.tick(), true); assert.equal(calls, 2);
  f.control.stop(); f.at(900000); f.active(); assert.equal(await f.control.tick(), false);
  assert.equal(f.cancelled(), true);
});
test('visibility restoration refreshes overdue sources once, not once per focus change', async () => {
  let calls = 0; const f = fixture(async () => { calls++; });
  f.at(900000); f.doc.hidden = true; f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 0); f.doc.hidden = false; f.doc.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve(); assert.equal(calls, 1);
  f.doc.dispatchEvent(new Event('visibilitychange')); await Promise.resolve(); assert.equal(calls, 1);
});
test('manual refresh is available immediately but repeated clicks and in-flight calls are bounded', async () => {
  let calls = 0, finish; const f = fixture(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const first = f.control.manual(); assert.equal(calls, 1);
  f.at(10000); assert.equal(await f.control.manual(), false); // in flight
  finish(); await first; const second = f.control.manual(); assert.equal(calls, 2);
  finish(); await second; assert.equal(await f.control.manual(), false); // click spam
});
test('failed reads release the in-flight guard without triggering retry loops', async () => {
  let calls = 0; const f = fixture(async () => { calls++; throw Error('unavailable'); });
  await assert.rejects(f.control.manual(), /unavailable/);
  assert.equal(await f.control.manual(), false); f.at(5000);
  await assert.rejects(f.control.manual(), /unavailable/); assert.equal(calls, 2);
});
