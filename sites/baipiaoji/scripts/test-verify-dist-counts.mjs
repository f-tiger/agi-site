// Offline CLI regression: only quoted publisher data is outside the BPJ size gate.
// Run: node --test sites/baipiaoji/scripts/test-verify-dist-counts.mjs
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {discoveryCard} from '../lib/github-catalog.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repository = join(here, '../../..');
// All allowed totals are derived by the real verifier: 120 / 45 / 75,
// categories 40 / 80, verified categories 30 / 15. 37 is deliberately absent.
const catalog = Array.from({length: 120}, (_, i) => ({
  slug: `fixture-${i}`, category: i < 40 ? 'coding' : 'other',
  ...(i < 30 || (i >= 40 && i < 55) ? {limits: {}} : {})
}));
const publisherDescription = 'Free, local tool to track AI coding token usage and cost across 37 tools and agents (Claude Code, Cursor, Codex, Gemini and more), by model, project, and task. npx codeburn';
const automatic = discoveryCard({
  id: 'fixture-codeburn', name: 'codeburn', repo: 'getagentseal/codeburn',
  topic: 'coding', description: publisherDescription, stars: 0,
  discoveredAt: '2026-10-13T07:04:30.117Z', checkedAt: '2026-10-13T07:04:30.117Z'
});
const payload = () => ({version: 1, scope: 'Fixture catalogue', tools: [structuredClone(automatic)]});
const serialize = data => JSON.stringify(data).replace(/</g, '\\u003c');
const block = (data = payload(), {id = 'github-tool-data', type = 'application/json', raw} = {}) =>
  `<script type="${type}" id="${id}">${raw ?? serialize(data)}</script>`;
const filler = 'This is a synthetic catalogue page for offline validation, with source attribution and useful explanatory content. '.repeat(6);
const page = ({body = '', head = '', data = block(), short = false} = {}) =>
  `<!doctype html><html><head><title>Catalogue fixture</title>${head}</head><body><main><h1>Catalogue fixture</h1><p>${short ? '' : filler}</p>${body}</main>${data}</body></html>`;
const keys = ['broken', 'ldErr', 'zhLeak', 'placeholder', 'rawMd', 'contradiction', 'enJson', 'staleCount', 'hollow', 'hreflang'];

function verify({pages = {'github-tools/index.html': page()}, files = {}} = {}, expected = {}) {
  const temp = mkdtempSync(join(tmpdir(), 'bpj-count-regression-'));
  const site = join(temp, 'sites/baipiaoji');
  const put = (relative, contents) => {
    const target = join(temp, relative);
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, contents);
  };
  try {
    for (const relative of ['sites/baipiaoji/scripts/verify-dist.mjs', 'tools/revenue-studio/catalog.mjs', 'tools/revenue-studio/i18n.mjs']) {
      const target = join(temp, relative);
      mkdirSync(dirname(target), {recursive: true});
      copyFileSync(join(repository, relative), target);
    }
    put('sites/baipiaoji/data/tools.json', JSON.stringify(catalog));
    for (const [path, html] of Object.entries(pages)) put('sites/baipiaoji/dist/' + path, html);
    for (const [path, text] of Object.entries(files)) put('sites/baipiaoji/' + path, text);
    const result = spawnSync(process.execPath, ['scripts/verify-dist.mjs'], {cwd: site, encoding: 'utf8', timeout: 10000});
    assert.ifError(result.error);
    assert.equal(result.status, Object.values(expected).some(Boolean) ? 1 : 0, result.stdout + result.stderr);
    for (const key of keys) {
      const value = result.stdout.match(new RegExp(`\\b${key}=(\\d+)`));
      assert.ok(value, `missing ${key} summary: ${result.stdout}`);
      assert.equal(Number(value[1]), expected[key] || 0, `${key}: ${result.stdout}`);
    }
    for (const [path, html] of Object.entries(pages)) {
      assert.equal(readFileSync(join(site, 'dist', path), 'utf8'), html, 'verification must not rewrite source data');
    }
  } finally { rmSync(temp, {recursive: true, force: true}); }
}

for (const prefix of ['', 'en/']) {
  const path = prefix + 'github-tools/index.html';
  test(`${prefix || 'zh/'}upstream codeburn 37 tools passes without changing its text`, () => {
    verify({pages: {[path]: page()}});
  });
  for (const [label, change] of [
    ['visible site claim', {body: '<p>BPJ lists 37 tools.</p>'}],
    ['metadata site claim', {head: '<meta name="description" content="BPJ lists 37 tools">'}],
    ['JSON-LD site claim', {head: '<script type="application/ld+json">{"description":"BPJ lists 37 tools"}</script>'}]
  ]) test(`${prefix || 'zh/'}${label} still fails on the same GitHub page`, () => {
    verify({pages: {[path]: page(change)}}, {staleCount: 1});
  });
  test(`${prefix || 'zh/'}site-owned fields inside the data block still fail`, () => {
    const data = payload();
    data.scope = 'BPJ lists 37 tools';
    data.tools[0].description.en = 'BPJ lists 37 tools';
    verify({pages: {[path]: page({data: block(data)})}}, {staleCount: 2});
  });
}

test('Chinese authored count remains blocked next to quoted Chinese publisher text', () => {
  const data = payload();
  data.tools[0].publisherDescription = '支持 37 个工具的上游项目';
  verify({pages: {'github-tools/index.html': page({data: block(data)})}});
  verify({pages: {'github-tools/index.html': page({data: block(data), body: '<p>本站收录 37 个工具。</p>'})}}, {staleCount: 1});
});

test('legitimate total, verified, unverified and category counts remain valid', () => {
  verify({pages: {'en/github-tools/index.html': page({body: '<p>120 tools, 45 verified free tiers, 75 tools, 40 tools, 80 tools, 30 tools, 15 tools.</p>'})}});
});

test('escaped publisher content cannot swallow adjacent authored claims', () => {
  const data = payload();
  data.tools[0].publisherDescription = '37 tools "quote" <script> \\ slash';
  verify({pages: {'github-tools/index.html': page({data: block(data)})}});
  verify({pages: {'github-tools/index.html': page({data: block(data), body: '<p>37 tools</p>'})}}, {staleCount: 1});
});

for (const [label, data, expected] of [
  ['another JSON block', block(payload(), {id: 'other-data'}), 1],
  ['another script type', block(payload(), {type: 'text/plain'}), 1],
  ['invalid JSON', block(null, {raw: '{"description":"37 tools",'}), 1],
  ['unexpected payload shape', block({publisherDescription: '37 tools'}), 1],
  ['noncanonical JSON', block(null, {raw: JSON.stringify(payload(), null, 2)}), 1],
  ['duplicate authored keys', block(null, {raw: serialize(payload()).replace('"scope":"Fixture catalogue"', '"scope":"BPJ lists 37 tools","scope":"Fixture catalogue"')}), 2],
  ['duplicate root tools keys', block(null, {raw: '{"tools":[{"description":"BPJ lists 37 tools"}],"tools":[]}'}), 1],
  ['non-string publisher field', block({tools: [{origin: 'automatic', publisherDescription: {claim: '37 tools'}}]}), 1],
  ['curated record', block({tools: [{origin: 'curated', publisherDescription: '37 tools'}]}), 1],
  ['unknown origin', block({tools: [{publisherDescription: '37 tools'}]}), 1],
  ['unrelated nested publisher field', block({tools: [], own: {publisherDescription: '37 tools'}}), 1],
  ['null tool leaves subsequent site claims visible', block({tools: [null, automatic], scope: '37 tools'}), 1]
]) test(`${label} receives no broader count exemption`, () => {
  verify({pages: {'github-tools/index.html': page({data})}}, {staleCount: expected});
});

for (const path of ['index.html', 'en/index.html', 'github-tools/other.html', 'other/github-tools/index.html']) {
  test(`matching data marker on unrelated route ${path} stays checked`, () => {
    verify({pages: {[path]: page()}}, {staleCount: 1});
  });
}
for (const path of ['.well-known/mcp.json', 'openapi.json', 'llms.txt', 'llms-full.txt']) {
  test(`stale authored count in ${path} remains blocked`, () => {
    verify({files: {['dist/' + path]: 'BPJ lists 37 tools'}}, {staleCount: 1});
  });
}

for (const [label, change, files, expected] of [
  ['broken local link', {body: '<a href="/missing">Missing</a>'}, {}, {broken: 1}],
  ['invalid JSON-LD', {head: '<script type="application/ld+json">{bad}</script>'}, {}, {ldErr: 1}],
  ['untranslated English UI', {body: '<p>中文残留</p>'}, {}, {zhLeak: 1}],
  ['placeholder inside publisher data', {data: block({tools: [{origin: 'automatic', publisherDescription: 'TODO 37 tools'}]})}, {}, {placeholder: 1}],
  ['raw Markdown inside publisher data', {data: block({tools: [{origin: 'automatic', publisherDescription: '**37 tools**'}]})}, {}, {rawMd: 1}],
  ['source contradiction', {}, {'data/no-source.json': JSON.stringify({items: [{slug: 'fixture-0'}]})}, {contradiction: 1}],
  ['untranslated English JSON', {}, {'dist/en/directory.json': '{"name":"中文残留"}'}, {enJson: 1}],
  ['hollow page', {short: true}, {}, {hollow: 1}],
  ['invalid hreflang', {head: '<meta name="robots" content="noindex"><link rel="alternate" hreflang="en" href="https://baipiaoji.com/en/github-tools/">'}, {}, {hreflang: 1}]
]) test(`${label} still blocks the actual verifier`, () => {
  verify({pages: {'en/github-tools/index.html': page(change)}, files}, expected);
});
