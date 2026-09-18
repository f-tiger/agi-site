import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalUrls } from './canonical-urls.mjs';

assert.equal(canonicalUrls('https://baipiaoji.com/en/tools/grok.html?q=1#x'), 'https://baipiaoji.com/en/tools/grok?q=1#x');
assert.equal(canonicalUrls('https://baipiaoji.com/en/index.html'), 'https://baipiaoji.com/en/');
for (const url of ['https://vendor.example/terms.html', 'https://baipiaoji.com.evil.example/a.html',
  'https://baipiaoji.com/data.html.gz', 'https://baipiaoji.com/api/hit']) assert.equal(canonicalUrls(url), url);
let checked = 0;
function walk(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, ent.name);
    if (ent.isDirectory()) { walk(file); continue; }
    if (!ent.name.endsWith('.html')) continue;
    const html = readFileSync(file, 'utf8');
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
    if (!canonical) continue; // Small standalone embeds need not declare one.
    const expected = canonicalUrls('https://baipiaoji.com/' + file.slice('dist/'.length));
    assert.equal(canonical[1], expected, 'canonical must be the URL Pages serves: ' + file);
    for (const match of html.matchAll(/\s(?:href|src)="(https:\/\/baipiaoji\.com[^"<>]*)"/g)) {
      assert.equal(match[1], canonicalUrls(match[1]), 'internal link must not send readers through a redirect: ' + file);
    }
    checked++;
  }
}
walk('dist');
const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
assert(!/<loc>[^<]*\.html<\/loc>/.test(sitemap));
assert(checked > 1000);
console.log(`Canonical routing verified for ${checked} pages, sitemap and third-party URL boundaries.`);
