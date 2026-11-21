// Snapshot the existing public compact response without making a network request.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import worker from '../src/worker.js';

const resource = '/assets/mcp-catalogue.json';
const response = await worker.fetch(new Request('https://getecoback.com/api/mcp-tools?view=compact'), {
  EVENTS: {prepare() { throw new Error('Catalogue generation must not write events'); }},
}, {});
assert.equal(response.status, 200);
const text = await response.text();
const {tools, total, distinctTotal} = JSON.parse(text);
assert.ok(Array.isArray(tools) && tools.length === total && distinctTotal > 0 && distinctTotal <= total);

const page = new URL('../site/mcp.html', import.meta.url);
const html = await readFile(page, 'utf8');
const hook = /data-catalogue="\/assets\/mcp-catalogue\.json(?:\?v=[a-f0-9]{12})?"/g;
assert.equal([...html.matchAll(hook)].length, 1, 'MCP page must reference one generated catalogue');
const hash = createHash('sha256').update(text).digest('hex').slice(0, 12);
await writeFile(new URL('../site' + resource, import.meta.url), text);
await writeFile(page, html.replace(hook, `data-catalogue="${resource}?v=${hash}"`));
console.log(`MCP catalogue snapshot built: ${distinctTotal} distinct tasks, ${total} entries, ${hash}`);
