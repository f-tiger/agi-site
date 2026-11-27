import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {tradeMcpKeysPath, tradeMcpPath} from './trade-mcp-pages.mjs';

const origin = 'https://baipiaoji.com';
const dist = new URL('../dist/',import.meta.url);
const read = path => readFileSync(new URL(path.replace(/^\//,''),dist),'utf8');

test('bilingual MCP docs, examples and credential-free public config are published at canonical paths',()=>{
  const sitemap = read('sitemap.xml');
  for (const locale of ['', '/en']) {
    const publicPath = locale + tradeMcpPath;
    const keyPath = locale + tradeMcpKeysPath;
    const canonical = origin + publicPath;
    const docs = read(publicPath+'index.html');
    const guide = JSON.parse(read(publicPath+'guide.json'));
    const config = JSON.parse(read(publicPath+'config.json'));
    assert(docs.includes(`<link rel="canonical" href="${canonical}">`));
    assert(docs.includes(`<link rel="alternate" hreflang="zh-Hans" href="${origin+tradeMcpPath}">`));
    assert(docs.includes(`<link rel="alternate" hreflang="en" href="${origin+'/en'+tradeMcpPath}">`));
    assert(docs.includes(`<link rel="alternate" type="text/markdown" href="${canonical}index.md">`));
    assert(docs.includes(`<link rel="alternate" type="application/json" href="${canonical}guide.json">`));
    assert(docs.includes(`data-trade-mcp-key-entry href="${origin+keyPath}"`));
    assert(sitemap.includes(`<loc>${canonical}</loc>`));
    assert(!sitemap.includes(`<loc>${origin+keyPath}</loc>`));
    assert.equal(guide.canonical,canonical);
    assert.equal(guide.authentication.keyManager,origin+keyPath);
    assert.deepEqual(guide.allowances,{free:10,linkedMember:100,sharedWithWeb:true,reset:'00:00 UTC'});
    assert.deepEqual(guide.protocolTools.map(tool=>tool.name),['list_trade_tools','get_trade_tool','run_trade_tool']);
    assert.equal(guide.example.shipmentVolumeM3,2.016);
    assert(docs.includes(guide.example.source.url));
    assert(read(publicPath+'index.md').includes(guide.example.source.url));
    assert.deepEqual(config.mcpServers['bpj-trade-tools'],{url:origin+'/api/trade-mcp',headers:{Authorization:'Bearer BPJ_TRADE_MCP_KEY'}});
  }
});

test('standalone key pages expose no credential, shared script or analytics',()=>{
  for (const locale of ['', '/en']) {
    const keyPath = locale + tradeMcpKeysPath;
    const html = read(keyPath+'index.html');
    const login = new URL(html.match(/id="trade-mcp-sign-in" href="([^"]+)"/)[1]);
    assert.equal(login.pathname,locale+'/account');
    assert.equal(login.searchParams.get('next'),keyPath);
    assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
    assert.match(html,/name="referrer" content="no-referrer"/);
    assert.doesNotMatch(html,/analytics-assets|google|account\.js|site-shell\.js|bpj_trade_[\w-]{43}/i);
    assert.deepEqual([...html.matchAll(/<script[^>]*src="([^\"]+)"/g)].map(m=>m[1]),['/studio-assets/trade-mcp-keys.mjs?v=trade-mcp1']);
    assert(!new URL(login).searchParams.has('token'));
  }
});
