import test from 'node:test';
import assert from 'node:assert/strict';
import {memberRoute} from '../../../../tools/member-studio/server.mjs';
import {fixture, KEY, mockChain, setupSites, transfer, TX} from '../../../../tools/member-studio/test-fixtures.mjs';
import {memberContext} from '../../../../tools/revenue-studio/member-copy.mjs';

const product = 'tds-uk-laundry-review';
const origin = 'https://thedollscout.com';
const source = {version: 1, product, values: {sessionAKwh: 1.25, sessionBKwh: 0.8,
  tariffPencePerKwh: 27.5, sessionsPerWeek: 5, comparableSessions: true, reviewedAt: '2026-11-25'}};

test('TDS laundry workspace bills once, unlocks after an exact fixture receipt, and saves and restores repeat measurements', async () => {
  const reset = mockChain();
  const sites = await setupSites();
  const env = sites.tds.raw;
  const db = sites.tds.db.sql;
  const endpoint = origin + '/api/member';
  const submit = async (body, {which = 'tds', token = KEY, config = sites[which].raw} = {}) => {
    const siteOrigin = which === 'tds' ? origin : 'https://getecoback.com';
    const request = new Request(siteOrigin + '/api/member', {method: 'POST', headers: {
      'Content-Type': 'application/json', Origin: siteOrigin, Authorization: 'Bearer ' + token,
    }, body: JSON.stringify(body)});
    const response = await memberRoute(request, config, which);
    return {status: response.status, data: await response.json()};
  };
  try {
    for (const [lang, prefix] of [['en', ''], ['de', '/de'], ['zh', '/zh']]) {
      const params = new URLSearchParams({tool: product});
      assert.equal(memberContext(params, lang, 'tds').returnURL, origin + prefix + '/ai-tools/uk-laundry-session');
      assert.equal(memberContext(params, lang, 'eco').product, undefined);
    }
    const ready = await (await memberRoute(new Request(endpoint), env, 'tds')).json();
    assert.equal(ready.ready, true);
    assert.equal(ready.auto_renew, false);
    const id = '2'.repeat(32);
    const checkout = {action: 'checkout', nonce: '1'.repeat(32), source: product, accept_terms: true, key_saved: true};
    assert.equal((await submit({...checkout, accept_terms: false})).data.code, 'consent_required');
    assert.equal((await submit(checkout, {which: 'eco'})).data.code, 'bad_source');
    const quoted = await submit(checkout);
    assert.equal(quoted.status, 200);
    assert.equal(quoted.data.order.state, 'pending');
    assert.equal(quoted.data.order.days, 30);
    assert.equal(quoted.data.order.payment.amount, '9.030001');
    assert.equal(quoted.data.order.payment.chain, 'bsc');
    const same = await submit({...checkout, nonce: '3'.repeat(32)});
    assert.equal(same.data.order.id, quoted.data.order.id);
    assert.equal(db.prepare('SELECT count(*) AS n FROM wb_orders').get().n, 1);
    assert.equal(db.prepare('SELECT product FROM wb_order_sources').get().product, product);

    const save = {action: 'save', id, revision: 0, name: 'Laundry review', data: source};
    assert.equal((await submit(save)).data.code, 'membership_required');
    fixture.receipt = transfer(db.prepare('SELECT * FROM wb_orders').get());
    assert.equal((await submit({action: 'check', id: quoted.data.order.id, tx: TX})).data.order.state, 'paid');
    assert.equal((await submit({action: 'status'})).data.active, true);
    assert.equal((await submit(save)).data.revision, 1);
    const retest = {...source, values: {...source.values, sessionBKwh: 0.7, reviewedAt: '2026-11-26'}};
    assert.equal((await submit({...save, revision: 1, data: retest})).data.revision, 2);
    assert.equal((await submit({...save, revision: 1})).data.code, 'revision_conflict');
    assert.deepEqual((await submit({action: 'history', id})).data.versions.map(row => row.revision), [2, 1]);
    assert.deepEqual((await submit({action: 'read', id, revision: 1})).data.data, source);
    assert.deepEqual((await submit({action: 'read', id, revision: 2})).data.data, retest);
    assert.equal((await submit({action: 'read', id, revision: 2}, {which: 'eco'})).status, 401);

    db.exec('UPDATE wb_health SET checked_at=0');
    assert.equal((await (await memberRoute(new Request(endpoint), env, 'tds')).json()).ready, false);
    assert.equal((await submit({...checkout, nonce: '4'.repeat(32)})).data.code, 'not_ready');
    assert.equal((await submit({...save, revision: 2})).data.revision, 3);
    assert.equal((await submit({action: 'read', id, revision: 3})).status, 200);
  } finally {
    reset();
    fixture.receipt = null;
    for (const site of Object.values(sites)) site.db.sql.close();
  }
});
