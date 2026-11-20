import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCatalog, validateCatalog } from './build.mjs';

const checked = '2026-11-20';
const row = (slug, fields = {}) => ({
  slug,
  name: slug,
  category: 'mcp',
  status: 'verified',
  source_http: 200,
  source_checked: checked,
  source_url: `https://mcp.vendor.com/docs/${slug}`,
  description: 'Query PostgreSQL tables with schema metadata and export query results.',
  keys: { transport: 'mcp-remote' },
  registry: { name: `com.vendor/${slug}`, remotes: true },
  ...fields,
});
const catalog = (agents, featured) => buildCatalog({ checked, agents }, featured);

test('requires useful publisher evidence, current checks, and a declared transport', () => {
  const { entries } = catalog([
    row('database', { source_url: 'https://mcp.vendor.com/docs/database?utm_source=example' }),
    row('unconfirmed', { status: 'new' }),
    row('obsolete', { source_checked: '2026-04-29' }),
    row('private-link', { source_url: 'https://127.0.0.1/docs' }),
    row('credential-link', { source_url: 'https://mcp.vendor.com/docs/private?token=fixture' }),
    row('lacks-transport', { registry: { name: 'com.vendor/lacks-transport', remotes: false } }),
    row('mcp-hello-server'),
    row('prototype-hw3'),
    row('scope', { description: 'Toolkit for autonomous penetration testing and attack reproduction.' }),
  ]);
  assert.deepEqual(entries.map(entry => entry.id), ['database']);
  assert.equal(entries[0].sourceUrl, 'https://mcp.vendor.com/docs/database');
  assert.equal(entries[0].category, 'data');
});

test('collapses aliases by repository and same-publisher task', () => {
  const entries = [
    row('database-mcp', { name: 'Database MCP', repo_url: 'https://github.com/Vendor/database', repo_http: 200 }),
    row('database-mcp-api', { name: 'Database MCP API', repo_url: 'https://github.com/Vendor/database-api', repo_http: 200 }),
    row('same-repository', { repo_url: 'https://github.com/vendor/database.git', repo_http: 200 }),
    row('another-publisher', { name: 'Database MCP', registry: { name: 'com.other/database', remotes: true } }),
  ];
  const first = catalog(entries);
  assert.deepEqual(first.entries.map(entry => entry.id), ['database-mcp', 'another-publisher']);
  assert.deepEqual(catalog([...entries].reverse()), first);
  validateCatalog(first);
});

test('updates editorial aliases and admits direct registry records with explicit evidence', () => {
  const { entries } = catalog([row('present')], {
    'com.vendor/present': {
      title: 'Database query',
      category: 'data',
      documentationUrl: 'https://docs.vendor.com/database',
      note: 'Inspect a PostgreSQL schema and query tables.',
      noteZh: '检查 PostgreSQL 结构并查询表。',
      sourceChecked: checked,
      transports: ['local'],
    },
    'com.docs/retrieval': {
      title: 'Document retrieval',
      category: 'knowledge',
      sourceUrl: 'https://registry.modelcontextprotocol.io/v0.1/servers/com.docs%2Fretrieval/versions/latest',
      documentationUrl: 'https://docs.vendor.com/retrieval',
      note: 'Find relevant passages in the document collection.',
      noteZh: '查找文档集合中的相关段落。',
      transports: ['remote'],
      sourceChecked: checked,
    },
  });
  assert.equal(entries.length, 2);
  assert(entries.every(entry => entry.featured && entry.documentationChecked === checked));
  assert.deepEqual(entries.find(entry => entry.id === 'present').transports, ['local']);
  assert.match(entries.find(entry => entry.registryId === 'com.docs/retrieval').id, /^mcp-[a-f0-9]{16}$/);
});
