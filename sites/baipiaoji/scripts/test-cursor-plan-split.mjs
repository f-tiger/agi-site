import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tools = JSON.parse(readFileSync(new URL('../data/tools.json', import.meta.url), 'utf8'));
const en = JSON.parse(readFileSync(new URL('../data/i18n/en.json', import.meta.url), 'utf8'));
const zh = tools.find((tool) => tool.slug === 'cursor')?.limits;
const english = en.tools?.cursor?.limits;

assert.ok(zh && english, 'Cursor limits must exist in both locales');
assert.equal(zh.checked, '2026-11-01');
assert.equal(english.checked, '2026-11-01');

for (const [label, limits] of [['zh', zh], ['en', english]]) {
  const combined = [limits.quota, limits.wall, ...Object.values(limits.paid || {})].join(' ');
  assert.match(combined, /X Subscription/, `${label}: current subscription must be named`);
  assert.match(combined, /legacy|旧订阅|旧 Cursor/, `${label}: legacy subscription must remain explicit`);
  assert.match(combined, /\$8/, `${label}: current Plus price missing`);
  assert.match(combined, /\$30/, `${label}: current Premium price missing`);
  assert.match(combined, /\$20/, `${label}: legacy Pro price missing`);
  assert.match(combined, /weekly|每周|按周/, `${label}: weekly X reset missing`);
  assert.match(combined, /monthly|每月|按月|账单月/, `${label}: monthly legacy reset missing`);
  assert.match(combined, /top-up|Top-up|预付/, `${label}: X prepaid overage path missing`);
  assert.match(combined, /on-demand/, `${label}: legacy overage path missing`);
  assert.match(combined, /optional and permanent|可选且不可逆|可选且永久/, `${label}: switch consequence missing`);
  assert.ok(!/Pro \$20\/mo; Pro\+ \$60\/mo; Ultra \$200\/mo; Teams/.test(limits.paid.tiers.split('legacy')[0]), `${label}: legacy prices must not lead the current plan list`);
}

for (const [locale, prefix, terms] of [
  ['zh', '', ['The X Subscription', '旧订阅', '$8/月', '$20/月', '按周']],
  ['en', 'en/', ['The X Subscription', 'legacy', '$8/mo', '$20/mo', 'weekly']],
]) {
  const tool = readFileSync(new URL(`../dist/${prefix}tools/cursor.html`, import.meta.url), 'utf8');
  const upgrade = readFileSync(new URL(`../dist/${prefix}upgrade/cursor.html`, import.meta.url), 'utf8');
  for (const term of terms) {
    assert.ok(tool.includes(term) || upgrade.includes(term), `${locale}: rendered Cursor pages missing ${term}`);
  }
  assert.ok(tool.includes('2026-11-01'), `${locale}: rendered tool review date missing`);
  assert.ok(upgrade.includes('2026-11-01'), `${locale}: rendered upgrade review date missing`);
  assert.ok(tool.includes('id="sources"'), `${locale}: sources anchor missing`);
}

console.log('PASS: Cursor current/legacy plan split is complete in data and bilingual pages');
