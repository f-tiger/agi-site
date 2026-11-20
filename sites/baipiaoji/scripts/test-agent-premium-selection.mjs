import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {selectPremiumAgents} from './agent-premium-selection.mjs';

const snapshot = '2026-11-18';
const check = '2026-11-01';
function record(slug, change = {}) {
  return {slug, name: slug, category: 'mcp', description: 'Search and organize product documentation by workspace and topic.',
    source_url: `https://notes-workspaces.dev/${slug}`, repo_url: `https://github.com/workspace-notes/${slug}`,
    status: 'verified', origin: 'mcp-registry', source_http: 200, source_checked: check, repo_http: 200, repo_checked: check,
    official: {checked: check, description: 'Workspace documentation search with tags and product ownership.'},
    registry: {name: `dev.notes-workspaces/${slug}`, version: '1.2.0', updated: check, packages: ['npm'], remotes: false},
    keys: {transport: 'mcp-stdio'}, ...change};
}
const select = (agents, count = 1000) => selectPremiumAgents({checked: snapshot, agents}, count);
const slugs = result => result.selected.map(a => a.slug);

test('canonical sources and publisher identities are counted once', () => {
  const fixture = [
    record('a', {source_url: 'https://www.notes-workspaces.dev/tools/?ref=campaign'}),
    record('b', {source_url: 'https://notes-workspaces.dev/tools#start'}),
    record('c', {repo_url: 'https://github.com/WORKSPACE-NOTES/a.git'}),
    record('d', {registry: {name: 'DEV.NOTES-WORKSPACES/A', version: '1', updated: check, remotes: true}}),
    record('e')
  ];
  assert.deepEqual(slugs(select(fixture)), ['a', 'e']);
  assert.deepEqual(slugs(select([...fixture].reverse())), ['a', 'e']);
});

test('admission requires recent official source evidence and real protocol metadata', () => {
  const fixture = [
    record('ok'),
    record('curated', {origin:'curated', repo_url:null, repo_http:null, repo_checked:null}),
    record('bad-source', {source_http:404}),
    record('old-source', {source_checked:'2026-10-02'}),
    record('bad-date', {source_checked:'2026-11-31'}),
    record('future-check', {source_checked:'2026-11-19'}),
    record('retired', {status:'retired'}),
    record('stale', {status:'stale'}),
    record('bad-repo', {repo_http:403}),
    record('bad-host', {source_url:'https://127.0.0.1/page'}),
    record('example-data', {source_url:'https://www.example.org/tools'}),
    record('no-protocol', {registry:{name:'dev.notes/abc', version:'1', updated:check, packages:[], remotes:false}}),
    record('unknown-package', {registry:{name:'dev.notes/xyz', version:'1', updated:check, packages:['unknown']}}),
    record('malformed-registry', {registry:{name:1, version:'1', updated:check, packages:['npm']}}),
    record('no-description', {description:'MCP server listed in the official MCP registry; the publisher did not provide an English description.'}),
    record('lesson-fixture', {description:'Simple greetings created for a student assignment with personalized names.'}),
    record('placeholder', {description:'TODO finish the implementation and write a meaningfully long description.'}),
    record('unsafe-cyber', {description:'Use offensive security tools to automate finding and exploiting exposed services.'}),
    record('unsafe-bio', {description:'Synthetic biology engineering with autonomous pathogen engineering workflows.'}),
    record('unsafe-kva', {description:'Design weapons with computer-assisted components and delivery choices.'}),
  ];
  assert.deepEqual(slugs(select(fixture)), ['curated', 'ok']);
});

test('a confirmed dead source is excluded until a subsequent successful producer check', () => {
  const slug = 'safe4-safe4';
  const fixture = record(slug, {source_url:'https://api.safe4.ai/docs'});
  assert.deepEqual(slugs(select([fixture])), []);
  const later = selectPremiumAgents({checked:'2026-11-21', agents:[{...fixture, source_checked:'2026-11-21'}]});
  assert.deepEqual(slugs(later), [slug]);
});

test('targets are bounded, counts report the source split, and missing snapshots do not fabricate entries', () => {
  const fixture = [record('b'), record('c'), record('a', {origin:'curated'})];
  const result = select(fixture, 2);
  assert.deepEqual(slugs(result), ['a','b']);
  assert.deepEqual(result.counts, {curated:1, registry:1, eligible:3, selected:2});
  assert.deepEqual(slugs(selectPremiumAgents({checked:'not a date', agents:fixture})), []);
  assert.throws(() => select(fixture, 1001), RangeError);
});

test('the checked-in directory supplies 1,000 existing identities without replacing the full ledger', () => {
  const registry = JSON.parse(readFileSync(new URL('../data/agent-watch.json', import.meta.url)));
  const result = selectPremiumAgents(registry);
  assert.equal(result.selected.length, 1000);
  assert.equal(new Set(slugs(result)).size, 1000);
  assert.ok(registry.agents.length > result.selected.length);
  assert.equal(result.counts.curated + result.counts.registry, 1000);
  assert.ok(result.selected.every(record => registry.agents.includes(record)));
});
