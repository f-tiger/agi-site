import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sharedAssets,assetHeaders} from '../asset-routing.mjs';
test('only exact shared names bypass host routing, never per-product applications or pages', async () => {
  const config = JSON.parse(await readFile('wrangler.jsonc','utf8'));
  const rules = config.assets.run_worker_first;
  assert.equal(rules[0], '/*'); assert.ok(rules.length <= 100);
  assert.deepEqual(rules.slice(1), sharedAssets.map(path => '!/' + path));
  assert.ok(rules.slice(1).every(rule => !rule.includes('*')));
  for (const path of ['/','/api/config','/api/pulse','/api/account/me','/account','/app.mjs','/project.mjs',
    '/modelmeter/index.html','/rfqdesk/core.mjs','/examples/supplier-quotes.csv','/other.js']) {
    assert.ok(!rules.includes('!' + path), path);
  }
  assert.match(assetHeaders(),/X-Content-Type-Options: nosniff/);
  assert.match(assetHeaders(),/X-Fleet-Asset-Delivery: static/);
  assert.ok(!assetHeaders().split('\n\n')[0].includes('Cache-Control'));
  assert.ok(!assetHeaders().split('\n\n')[0].includes('X-Fleet-Asset-Delivery'));
});
