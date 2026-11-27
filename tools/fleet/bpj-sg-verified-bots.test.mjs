import test from 'node:test';
import assert from 'node:assert/strict';
import {apiClient, reconcile} from './bpj-sg-verified-bots.mjs';

const expression = '(ip.src.country eq "SG" and cf.client.bot)';
const phase = 'http_request_firewall_custom';
const previous = {id: 'other', ref: 'other', expression: 'true', action: 'skip', enabled: true};
const own = {id: 'owned', ref: 'bpj_sg_verified_bots', expression, action: 'block', enabled: true,
  description: 'BPJ: block verified bots from Singapore'};
const base = '/zones/z/rulesets';
const entry = base + '/phases/' + phase + '/entrypoint';

function fixture(initial) {
  let rules = initial && [...initial];
  const writes = [];
  return {
    writes, rules: () => rules,
    request: async (path, method = 'GET', data) => {
      if (path === '/zones?name=baipiaoji.com') return [{id: 'z', name: 'baipiaoji.com', status: 'active'}];
      if (path === entry && method === 'GET') {
        if (!rules) throw Object.assign(Error(), {noEntrypoint: true});
        return {kind: 'zone', id: 's', phase, rules};
      }
      writes.push([method, path, data]);
      if (path === base && method === 'POST') {
        assert.equal(data.kind, 'zone'); assert.equal(data.phase, phase);
        assert.equal(data.rules.length, 1); assert.equal(data.rules[0].expression, expression);
        rules = [{id: 'owned', ...data.rules[0]}];
      } else if (path === base + '/s/rules/owned' && method === 'DELETE') {
        rules = rules.filter(rule => rule.id !== 'owned');
      } else {
        assert.equal(data.expression, expression);
        assert.equal(data.action, 'block'); assert.equal(data.enabled, true);
        assert.equal(data.ref, 'bpj_sg_verified_bots');
        assert.deepEqual(data.position, {before: 'other'});
        assert.equal(path, base + '/s/rules' + (method === 'PATCH' ? '/owned' : ''));
        rules = [{...own}, ...rules.filter(rule => rule.id !== 'owned')];
      }
    },
  };
}

test('inserts, reads back, is idempotent, and rolls back only the managed rule', async () => {
  const f = fixture([previous]);
  assert.equal(await reconcile('status', f.request), 'absent');
  assert.equal(await reconcile('apply', f.request), 'active-first');
  assert.equal(await reconcile('apply', f.request), 'active-first');
  assert.equal(await reconcile('rollback', f.request), 'absent');
  assert.equal(await reconcile('rollback', f.request), 'absent');
  assert.deepEqual(f.rules(), [previous]);
  assert.deepEqual(f.writes.map(w => w[0]), ['POST', 'DELETE']);
});

test('handles missing entrypoint and restores ordering for the same disabled rule', async () => {
  assert.equal(await reconcile('apply', fixture().request), 'active-first');
  const f = fixture([previous, {...own, enabled: false}]);
  assert.equal(await reconcile('apply', f.request), 'active-first');
  assert.equal(f.writes[0][0], 'PATCH');
});

test('a changed managed rule is never modified or removed', async () => {
  for (const operation of ['apply','rollback']) {
    const f = fixture([{...own, expression: 'true'}]);
    await assert.rejects(reconcile(operation, f.request), /changed externally/);
    assert.equal(f.writes.length, 0);
  }
});

test('401, 403, generic 404 or API failure cannot be interpreted as a missing ruleset', async () => {
  for (const status of [401,403,404,500]) {
    const request = apiClient('dummy', async () => Response.json({success:false,errors:[{code:999,message:'failed'}]},{status}));
    await assert.rejects(request(entry), err => err.permission === [401,403].includes(status) && !err.noEntrypoint);
  }
  const absent = apiClient('dummy', async () => Response.json({success:false,errors:[{code:10003,
    message:'could not find entrypoint ruleset for the http_request_firewall_custom phase'}]},{status:404}));
  await assert.rejects(absent(entry), err => err.noEntrypoint);
});

test('an ambiguous 404 must be resolved independently; an incomplete list fails closed', async () => {
  const f = fixture([previous]);
  let listed = false;
  const request = async (path, ...args) => {
    if (path === entry) throw Object.assign(Error(), {status:404});
    if (path === base + '?per_page=50') {
      listed = true;
      return [{id:'s',phase,kind:'zone'}];
    }
    if (path === base + '/s') return f.request(entry);
    return f.request(path, ...args);
  };
  assert.equal(await reconcile('apply', request), 'active-first');
  assert.equal(listed, true);
  const truncated = (path, ...args) => path === base + '?per_page=50' ? Array(50).fill({}) : request(path, ...args);
  await assert.rejects(reconcile('apply', truncated), /truncated/);
});
