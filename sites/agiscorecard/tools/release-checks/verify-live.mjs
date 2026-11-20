import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const origin = 'https://agiscorecard.com';
const assetDir = new URL('../../futures-assets/release-checks/', import.meta.url);
const assets = ['app.mjs','style.css','suite.mjs','releases.json','advisories.json','models.json','runs.json'];

async function read(path) {
  const response = await fetch(origin + path + '?__ci=1', {
    redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: {'User-Agent': 'agi-site-deploy-selfcheck/1.0'},
  });
  assert.equal(response.status, 200, path);
  return response;
}

async function check() {
  await Promise.all(assets.map(async name => {
    const response = await read('/futures-assets/release-checks/' + name);
    const type = response.headers.get('content-type') || '';
    if (name.endsWith('.mjs')) assert.match(type, /javascript/, name);
    if (name.endsWith('.json')) assert.match(type, /application\/json/, name);
    if (name.endsWith('.css')) assert.match(type, /text\/css/, name);
    const expected = await readFile(new URL(name, assetDir));
    assert.ok(Buffer.from(await response.arrayBuffer()).equals(expected), name + ' deployed bytes');
  }));
  for (const path of ['/ai-tools', '/zh/ai-tools']) {
    const html = await (await read(path)).text();
    for (const fragment of ['id="release-checks"', '/futures-assets/release-checks/app.mjs',
      'data-ga4-id="G-FZXLMBB5QB"', 'href="' + origin + path + '"']) {
      assert.ok(html.includes(fragment), path + ' ' + fragment);
    }
  }
}

for (let attempt = 1; ; attempt++) {
  try {
    await check();
    console.log('Both release-check sections and seven matching assets verified.');
    break;
  } catch (error) {
    if (attempt === 3) throw error;
    await new Promise(resolve => setTimeout(resolve, 6000));
  }
}
