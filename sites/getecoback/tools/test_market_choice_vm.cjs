// Isolated DOM contract: no browser, merchant, geo or telemetry requests.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {script} = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
for (const tz of ['Europe/Paris', 'America/Toronto', 'America/New_York', 'America/Mexico_City', 'America/Sao_Paulo', 'UTC', null]) {
  for (const readyState of ['loading', 'complete']) {
    const listeners = {};
    const node = (hidden = false) => ({hidden, value: 'de', events: {}, addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }});
    const ids = Object.fromEntries(['eb-models','eb-toppick','eb-usshelf','eb-ustop','eb-usunits','eb-market-choice','eb-market-controls'].map(id => [id, node(['eb-usshelf','eb-ustop','eb-usunits','eb-market-controls'].includes(id))]));
    const original = 'https://www.amazon.de/s?k=AEG+ChillFlex+Pro&tag=getecoback-21';
    const links = [{href: original, closest: () => null, setAttribute() {}}];
    let geoReads = 0, requests = 0;
    const ctx = {window: {}, location: {pathname: '/en/guide/portable-ac-vs-air-cooler.html'}, URL,
      Intl: {DateTimeFormat: () => {geoReads++; if (tz === null) throw Error('missing geo'); return {resolvedOptions: () => ({timeZone: tz})};}},
      fetch: () => {requests++; throw Error('market selection must not fetch geo or merchants');},
      document: {readyState, getElementById: id => ids[id] || null, querySelectorAll: () => links,
        addEventListener(type, fn) {(listeners[type] ||= []).push(fn);}}};
    vm.runInNewContext(script, ctx, {timeout: 1000});
    for (const fn of listeners.DOMContentLoaded || []) fn();
    const check = us => {
      assert.equal(ids['eb-ustop'].hidden, !us, tz);
      assert.equal(ids['eb-usshelf'].hidden, !us, tz);
      assert.equal(ids['eb-usunits'].hidden, !us, tz);
      assert.equal(ids['eb-toppick'].hidden, us, tz);
      assert.equal(ids['eb-models'].hidden, us, tz);
      assert.equal(links[0].href, original);
    };
    check(false);
    assert.equal(ids['eb-market-controls'].hidden, false);
    for (const value of ['us', 'de', 'us', 'de']) {
      ids['eb-market-choice'].value = value;
      for (const fn of ids['eb-market-choice'].events.change || []) fn();
      check(value === 'us');
    }
    links.push({href: original, closest: () => links[1], setAttribute() {}});
    for (const fn of listeners.click || []) fn({target: links[1]});
    assert.equal(links[1].href, original, 'dynamic/captured click must retain its named model');
    assert.equal(geoReads, 0, 'shopping selection does not read the timezone');
    assert.equal(requests, 0, 'shopping selection does not request location or merchants');
    for (const id of ['eb-ustop', 'eb-usshelf']) assert.equal((ids[id].events.click || []).length, 1, 'existing click telemetry bound once, not each choice');
  }
}
console.log('market choice VM OK: 7 timezone/missing-geo cases × 2 document states');
