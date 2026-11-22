import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TDS_HOME_SERVER, TDS_HOME_REGISTRY_NAME, TDS_HOME_TOOL_COUNT } from '../../collector-assets/tds-suite/service.mjs';

const origin = 'https://thedollscout.com';
const manifestPath = '/collector-assets/tds-suite/manifest.json';
const regional = process.argv[2] === '--regional-indexnow';
const submit = regional || process.argv[2] === '--indexnow';
assert.ok(process.argv.length === (submit ? 3 : 2), 'Expected no arguments or --indexnow.');
const hubs = ['/ai-tools', '/de/ai-tools', '/zh/ai-tools'];
const headers = {
  'User-Agent': 'tds-home-ci-selfcheck/1.0',
  'X-Probe': 'tds-home-suite-release',
};
const pathPattern = /^\/(?:(?:de|zh)\/)?ai-tools(?:\/(?:categories\/)?[a-z0-9-]+)?$/;

async function fetchChecked(url) {
  const response = await fetch(url, { headers, redirect: 'error', signal: AbortSignal.timeout(20_000) });
  assert.equal(response.status, 200, url);
  assert.equal(response.url, url);
  return response;
}

async function canonicalPage(url, noindex = false) {
  const response = await fetchChecked(url);
  const html = await response.text();
  assert.ok(html.includes(`rel="canonical" href="${url}"`), 'Canonical missing on ' + url);
  const noindexTag = /noindex/i.test(response.headers.get('x-robots-tag') ?? '') ||
    /<meta name="robots" content="[^"]*noindex/i.test(html);
  assert.equal(noindexTag, noindex, 'Unexpected indexing directive on ' + url);
}

const [descriptor, discovery, manifest, wellKnown] = await Promise.all([
  fetchChecked(origin + '/mcp/home-tools/server.json').then(response => response.json()),
  fetchChecked(origin + '/api/home-mcp').then(response => response.json()),
  fetchChecked(origin + manifestPath).then(response => response.json()),
  fetchChecked(origin + '/.well-known/mcp.json').then(response => response.json()),
]);
assert.equal(descriptor.name, TDS_HOME_REGISTRY_NAME);
assert.equal(descriptor.version, TDS_HOME_SERVER.version);
assert.deepEqual(descriptor.remotes, [{ type: 'streamable-http', url: origin + '/api/home-mcp' }]);
assert.equal(discovery.toolCount, TDS_HOME_TOOL_COUNT);
assert.deepEqual(discovery.server, TDS_HOME_SERVER);
assert.equal(manifest.count, TDS_HOME_TOOL_COUNT);
assert.equal(wellKnown.endpoint, origin + '/mcp');
const entry = wellKnown.additionalServers.find(item => item.registryName === descriptor.name);
assert.equal(entry.endpoint, descriptor.remotes[0].url);
assert.equal(entry.version, descriptor.version);
assert.equal(entry.toolCount, manifest.count);
assert.equal(entry.catalog, discovery.catalog);
const indexable = [...new Set(regional ? manifest.regionalIndexable : manifest.indexable)];
const regionalExisting = new Set(['/', '/de/shop/categories/smart-home', '/uk/indoor-laundry']);
if (regional) {
  assert.ok(indexable.length >= 9 && indexable.length <= 20);
  for (const p of regionalExisting) assert.ok(indexable.includes(origin + p));
}
assert.ok(indexable.length >= hubs.length && indexable.length <= 3100);
for (const raw of indexable) {
  const url = new URL(raw);
  assert.equal(url.origin, origin);
  assert.equal(url.href, raw);
  assert.ok((pathPattern.test(url.pathname) || (regional && regionalExisting.has(url.pathname))) && !url.search && !url.hash, 'Invalid suite page ' + raw);
}
for (const hub of hubs) assert.ok(indexable.includes(origin + hub));
await Promise.all(hubs.flatMap(hub => [
  canonicalPage(origin + hub),
  canonicalPage(origin + hub + '/purchase-a04', true),
  canonicalPage(origin + hub + '/dach-meter-fit'),
  canonicalPage(origin + hub + '/uk-laundry-session'),
]));
console.log(JSON.stringify({ verified: 'tds-home-pages', tools: manifest.count, locales: hubs.length, samplePages: hubs.length, indexable: indexable.length }));
if (submit) {
  // Only advertise the final verified canonical pages generated for this release.
  const sitemap = await fetchChecked(origin + '/sitemap.xml').then(response => response.text());
  const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]));
  assert.ok(indexable.every(url => sitemapUrls.has(url)), 'Generated routes must be in the live sitemap.');
  for (let i = 0; i < indexable.length; i += 12) {
    await Promise.all(indexable.slice(i, i + 12).map(url => canonicalPage(url)));
  }
  const key = (await readFile(new URL('../indexnow-key.txt', import.meta.url), 'utf8')).trim();
  assert.match(key, /^[a-f0-9]{32,}$/i);
  const keyLocation = origin + '/' + key + '.txt';
  assert.equal((await (await fetchChecked(keyLocation)).text()).trim(), key);
  for (let i = 0; i < indexable.length; i += 100) {
    const batch = indexable.slice(i, i + 100);
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(origin).hostname, key, keyLocation, urlList: batch }),
      signal: AbortSignal.timeout(20_000),
    });
    console.log(JSON.stringify({ channel: 'IndexNow', urls: batch.length, status: response.status, indexing: 'unknown' }));
    assert.ok([200, 202].includes(response.status), 'IndexNow rejected notification');
  }
  console.log(JSON.stringify({ indexnowAcceptedUrls: indexable.length }));
}
