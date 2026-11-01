import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sharedAssets,staticSecurity} from '../asset-routing.mjs';
test('only exact cross-host public files bypass the Worker; host-dependent pages stay protected', async () => {
  const config = JSON.parse(await readFile('wrangler.jsonc','utf8'));
  const rules = config.assets.run_worker_first;
  assert.equal(rules[0], '/*'); assert.ok(rules.length <= 100);
  assert.deepEqual(rules.slice(1), sharedAssets.map(path => '!/' + path));
  assert.ok(rules.slice(1).every(rule => !rule.includes('*')));
  for (const path of ['/','/market.html','/zh/','/mcp','/api/research','/api/event','/api/account/me',
    '/__fleet/ga4.html','/account','/reconcile/index.html','/proof/input.schema.json','/not-public.js']) {
    assert.ok(!rules.includes('!' + path), path);
  }
  for (const path of sharedAssets) assert.ok((await readFile('dist/' + path)).length, path);
  const headers = await readFile('dist/_headers','utf8');
  for (const [key,value] of Object.entries(staticSecurity)) assert.ok(headers.includes(key + ': ' + value));
  assert.match(headers,/X-Fleet-Asset-Delivery: static/);
  assert.ok(!headers.split('\n\n')[0].includes('Cache-Control'));
  assert.ok(!headers.split('\n\n')[0].includes('X-Fleet-Asset-Delivery'));
  const manifest = JSON.parse(await readFile('asset-manifest.generated.json','utf8'));
  for (const paths of Object.values(manifest)) assert.ok(!Object.hasOwn(paths,'/_headers'));
});
