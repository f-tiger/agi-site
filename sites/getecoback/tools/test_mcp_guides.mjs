import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import worker from '../src/worker.js';

const site = new URL('../site/', import.meta.url);
const cwd = fileURLToPath(new URL('..', import.meta.url));
const corpus = JSON.parse(readFileSync(new URL('mcp-guides.json', site), 'utf8'));
const laundry = '/waeschetrockner-oder-luftentfeuchter.html';
const labelSource = 'https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/beim-kauf-eines-waeschetrockners-an-den-stromverbrauch-denken-37984';
const textOf = result => result.content.map(item => item.text || '').join('\n');

function assetEnv(overrides = new Map()) {
  const requests = [];
  const env = {ASSETS: {fetch: async request => {
    requests.push(request);
    const url = new URL(request.url);
    assert.equal(url.origin, 'https://getecoback.com');
    assert.equal(url.search, '');
    assert.equal(request.redirect, 'manual');
    const custom = overrides.get(url.pathname);
    if (custom) return custom();
    try {
      const body = readFileSync(new URL(url.pathname.slice(1), site), 'utf8');
      return new Response(body, {headers: {'content-type': url.pathname.endsWith('.json') ? 'application/json' : 'text/markdown; charset=utf-8'}});
    } catch { return new Response('missing', {status: 404}); }
  }}};
  return {env, requests};
}

async function call(name, args, env) {
  const response = await worker.fetch(new Request('https://getecoback.com/mcp/v1', {
    method: 'POST', headers: {'content-type': 'application/json', 'user-agent': 'getecoback-ci'},
    body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/call', params: {name, arguments: args}}),
  }), env, {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.error, undefined);
  return payload.result;
}

test('the committed MCP corpus is derived from current public canonical pages and built mirrors', () => {
  const py = spawnSync('python3', ['-c', "import json,sys;sys.path.insert(0,'tools');from build_mcp_guides import collect_guides;print(json.dumps(collect_guides()))"], {cwd, encoding: 'utf8', timeout: 15000});
  assert.equal(py.status, 0, py.stderr);
  assert.deepEqual(corpus, JSON.parse(py.stdout));
  assert.ok(corpus.length > 100);
  assert.ok(corpus.some(entry => entry.u === laundry));
  assert.ok(!corpus.some(entry => /(?:account|members|auth|balkonspeicher|balkonkraftwerk)/.test(entry.u)));
  const entry = corpus.find(entry => entry.u === '/guide/waesche-trocknen-wohnung.html');
  assert.ok(entry.d.startsWith('Wäsche in der Wohnung trocknen:'));
  assert.ok(!/Saugroboter|PortaSplit|Nassreiniger/.test(entry.d));
});

test('the corpus builder excludes noindex pages, private routes and canonical aliases even with mirrors', () => {
  const code = `import json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'tools')
import build_search
from build_mcp_guides import collect_guides
with tempfile.TemporaryDirectory() as directory:
 build_search.SITE=Path(directory)
 for route,canonical,robots in [('/guide/public.html','/guide/public.html',''),('/guide/hidden.html','/guide/hidden.html','<meta name="robots" content="follow, NOINDEX">'),('/guide/alias.html','/guide/public.html',''),('/auth/private.html','/auth/private.html','')]:
  page=Path(directory)/route.lstrip('/');page.parent.mkdir(parents=True,exist_ok=True)
  page.write_text('<html lang="de"><head><title>Fixture</title><meta name="description" content="Fixture"><link rel="canonical" href="https://getecoback.com'+canonical+'">'+robots+'</head><main>Public fixture</main></html>')
  page.with_suffix('.md').write_text('# Fixture\\n\\nCanonical (HTML, zitierfähig): https://getecoback.com'+route+'\\n\\nPublic fixture\\n')
 print(json.dumps([entry['u'] for entry in collect_guides()]))`;
  const py = spawnSync('python3', ['-c', code], {cwd, encoding: 'utf8', timeout: 15000});
  assert.equal(py.status, 0, py.stderr);
  assert.deepEqual(JSON.parse(py.stdout), ['/guide/public.html']);
});

test('laundry search stays on task and every search result can be read through the same published corpus', async () => {
  const {env} = assetEnv();
  for (const frage of ['Wäsche trocknen Wohnung Stromkosten', 'waesche trocknen wohnung stromkosten', 'Trockner oder Luftentfeuchter Kosten']) {
    const result = await call('ratgeber_suche', {frage, sprache: 'de', max: 3}, env);
    assert.equal(result.isError, false);
    const text = textOf(result);
    const paths = [...text.matchAll(/https:\/\/getecoback\.com(\/[a-z0-9/-]+\.html)/g)].map(match => match[1]);
    assert.ok(paths.includes(laundry), frage);
    assert.ok(!paths.some(path => /klimaanlage-mietwohnung|fenster-zugluft/.test(path)), frage);
    for (const path of paths) assert.equal((await call('ratgeber_lesen', {pfad: path}, env)).isError, false, path);
  }
});

test('root-level laundry reading preserves measured-condition limits and trusted original sources', async () => {
  const {env} = assetEnv();
  const relative = await call('ratgeber_lesen', {pfad: laundry}, env);
  assert.equal(relative.isError, false);
  assert.deepEqual(await call('ratgeber_lesen', {pfad: 'https://getecoback.com' + laundry}, env), relative);
  const text = textOf(relative);
  for (const expected of [labelSource, 'gleichen gewünschten Trocknungsgrad', 'keine Produktmessungen', 'keine Prüfung eines bestimmten Geräts', 'Gekürzt: nein']) assert.ok(text.includes(expected), expected);
  assert.ok(!/<(?:form|script|input)|<!--EB_|https?:\/\/[^\s]*(?:amazon\.|amzn\.)|[?&]tag=/i.test(text));
});

test('dedicated French and Spanish mirrors retain their existing search/read coverage', async () => {
  const {env} = assetEnv();
  for (const [sprache, frage, path] of [['fr', 'climatisation chauffage', '/fr/calculateur.html'], ['es', 'climatización ahorro', '/es/calculadora.html']]) {
    const result = await call('ratgeber_suche', {frage, sprache}, env);
    assert.equal(result.isError, false);
    assert.ok(textOf(result).includes('https://getecoback.com' + path), sprache);
    const reading = await call('ratgeber_lesen', {pfad: path}, env);
    assert.equal(reading.isError, false);
    assert.ok(textOf(reading).includes('Canonical: https://getecoback.com' + path));
  }
});

test('every published MCP entry resolves to its own canonical text mirror', async () => {
  const {env, requests} = assetEnv();
  for (const entry of corpus) {
    const result = await call('ratgeber_lesen', {pfad: entry.u}, env);
    assert.equal(result.isError, false, entry.u + ': ' + textOf(result));
    assert.ok(textOf(result).includes('Quelle: https://getecoback.com' + entry.u));
    assert.ok(textOf(result).includes('Vollständige Textansicht: https://getecoback.com' + entry.m));
  }
  assert.ok(requests.every(request => /\/(?:mcp-guides\.json|[a-z0-9/-]+\.md)$/.test(new URL(request.url).pathname)));
});

test('malformed, external, credentialed, query, fragment and traversal inputs fetch nothing', async () => {
  const invalid = [null, {}, 1, '//evil.test/a.html', 'http://getecoback.com' + laundry,
    'https://www.getecoback.com' + laundry, 'https://getecoback.com.evil.test' + laundry,
    'https://getecoback.com@evil.test' + laundry, 'https://user@getecoback.com' + laundry,
    'https://getecoback.com:443' + laundry, 'https://getecoback.com:8443' + laundry,
    laundry + '?private=1', laundry + '#input', laundry + '\n', '/guide/../' + laundry.slice(1),
    '/guide/%2e%2e/' + laundry.slice(1), '/guide/%2fsecret.html', '/guide/%5csecret.html',
    '/guide/\\secret.html', '/guide/a\u0000.html', '/api/test.html', '/en/members.html', '/auth/account.html'];
  for (const pfad of invalid) {
    const {env, requests} = assetEnv();
    assert.equal((await call('ratgeber_lesen', {pfad}, env)).isError, true, JSON.stringify(pfad));
    assert.equal(requests.length, 0, JSON.stringify(pfad));
  }
});

test('unpublished, removed and noncanonical aliases cannot bypass the corpus even if an asset exists', async () => {
  for (const pfad of ['/guide/private-draft.html', '/guide/growatt-noah-2000-probleme.html', '/index.html', '/tools.html']) {
    const {env, requests} = assetEnv(new Map([[pfad.replace('.html', '.md'), () => new Response('# Unlisted content')]]));
    assert.equal((await call('ratgeber_lesen', {pfad}, env)).isError, true, pfad);
    assert.deepEqual(requests.map(request => new URL(request.url).pathname), ['/mcp-guides.json']);
  }
});

test('missing or invalid corpus fails closed for both search and read', async () => {
  const responses = [() => new Response('missing', {status: 404}), () => new Response('<html>soft 404</html>'),
    () => Response.json({items: []}), () => Response.json([]),
    () => Response.json([{...corpus[0], u: 'https://evil.test/a.html'}]),
    () => Response.json([{...corpus[0], m: '/api/private.md'}]),
    () => Response.json([corpus[0], corpus[0]])];
  for (const response of responses) {
    const {env, requests} = assetEnv(new Map([['/mcp-guides.json', response]]));
    assert.equal((await call('ratgeber_suche', {frage: 'Wäsche'}, env)).isError, true);
    assert.equal((await call('ratgeber_lesen', {pfad: laundry}, env)).isError, true);
    assert.ok(requests.every(request => new URL(request.url).pathname === '/mcp-guides.json'));
  }
});

test('missing, redirected, non-Markdown, wrong-canonical or contaminated mirrors never fall back to HTML', async () => {
  const valid = readFileSync(new URL(laundry.slice(1).replace('.html', '.md'), site), 'utf8');
  const markdown = body => new Response(body, {headers: {'content-type': 'text/markdown'}});
  const responses = [() => new Response('missing', {status: 404}),
    () => new Response('', {status: 302, headers: {location: 'https://evil.test/'}}),
    () => new Response(valid, {headers: {'content-type': 'text/html'}}),
    () => markdown(valid.replace('Canonical (HTML, zitierfähig):', 'Mentioned elsewhere:')),
    () => markdown(valid.replace(laundry, '/guide/another.html')),
    () => markdown(valid + '\nCanonical (HTML, zitierfähig): https://getecoback.com/guide/another.html'),
    () => markdown(valid + '<script>hidden UI</script>'),
    () => markdown(valid + '\n[buy](https://www.amazon.de/dp/EXAMPLE?tag=getecoback-21)')];
  for (const response of responses) {
    const {env, requests} = assetEnv(new Map([[laundry.replace('.html', '.md'), response]]));
    assert.equal((await call('ratgeber_lesen', {pfad: laundry}, env)).isError, true);
    assert.equal(requests.length, 2);
    assert.ok(requests.every(request => !new URL(request.url).pathname.endsWith('.html')));
  }
});

test('long excerpts declare truncation and retain references beyond the cut', async () => {
  const long = `# Long guide\n\nCanonical (HTML, zitierfähig): https://getecoback.com${laundry}\n\n` +
    'A complete paragraph with conditions.\n\n'.repeat(700) + `[Official label source](${labelSource})\n`;
  const {env} = assetEnv(new Map([[laundry.replace('.html', '.md'), () => new Response(long, {headers: {'content-type': 'text/markdown'}})]]));
  const result = await call('ratgeber_lesen', {pfad: laundry}, env);
  assert.equal(result.isError, false);
  const text = textOf(result);
  assert.ok(text.includes('Gekürzt: ja'));
  assert.ok(text.includes('vor einer Bewertung den vollständigen Text mit allen Bedingungen lesen'));
  assert.ok(text.includes('Originalquellen der vollständigen Textansicht:\n- ' + labelSource));
  assert.ok(!text.includes('[Official label source]'), 'the source was actually beyond the excerpt');
});
