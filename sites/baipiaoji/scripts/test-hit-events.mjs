// Exercise the real handler with a D1 recording double. A 204 alone cannot
// distinguish a persisted event from the old silent-drop failure.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequestPost } from '../functions/api/hit.js';
import { growthCounts } from '../functions/api/reach.js';

const source = readFileSync(new URL('./build.mjs', import.meta.url), 'utf8') + readFileSync(new URL('../assets/stack-builder.js', import.meta.url), 'utf8');
const emitted = new Set([...source.matchAll(/(?:bpjEv|EV|ev)\('([^']+)'\s*,/g)].map(m => m[1]));
// Conditional event names cannot be discovered by the simple literal scanner.
for (const e of ['sub_ok', 'sub_dup', 'sub_err', 'gate', 'earn', 'ad', 'gs', 'gs_go']) emitted.add(e);
let rows = [];
const env = { HITS: { prepare(sql) {
  assert.match(sql, /INSERT INTO hits/);
  return { bind(...values) { return { async run() { rows.push(values); } }; } };
} } };
async function send(e, p=e === 'gs' ? '/gs/miss' : '/__ci/events') {
  const request = new Request('https://baipiaoji.com/api/hit', {
    method:'POST', body: JSON.stringify({p, l:'en', e})
  });
  assert.equal((await onRequestPost({ request, env })).status, 204);
}
for (const e of emitted) {
  rows = []; await send(e);
  assert.equal(rows.length, 1, `frontend event silently dropped: ${e}`);
  assert.equal(rows[0][5], e, `${e} must not become a page view`);
}
for (const e of ['typo', 'page_view', '__proto__']) {
  rows = []; await send(e); assert.equal(rows.length, 0, 'unknown events stay rejected');
}
rows = []; await send(''); assert.equal(rows.length, 1); assert.equal(rows[0][5], '');
rows = []; await send('gate', 'bad-path'); assert.equal(rows.length, 0);
rows = []; await send('gs', '/gs/miss/private%40example.invalid');
assert.equal(rows.length, 1); assert.equal(rows[0][1], '/gs/miss', 'cached clients must not persist raw queries');
rows = []; await send('gs', '/arbitrary-query'); assert.equal(rows.length, 0);
assert.deepEqual(growthCounts([
  {path:'/gate/next/grok/tiers',n:4}, {path:'/gate/soft-use/tokenizer',n:2},
  {path:'/gate/soft-use/private-email',n:1}, {path:'/gate/soft-use/grok/tiers',n:1},
  {path:'/gate/next/grok',n:1}, {path:'/gate/soft-ok/grok',n:-1},
  {path:'/gate/stack-export/stack-builder',n:3}, {path:'/gate/stack-export/grok',n:3},
]), [{path:'/gate/next/grok/tiers',n:4}, {path:'/gate/soft-use/tokenizer',n:2}, {path:'/gate/stack-export/stack-builder',n:3}]);
console.log(`${emitted.size} frontend event types persisted; unknown events rejected; page-view contract intact`);
