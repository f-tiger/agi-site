import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {portfolioRoute} from './api.mjs';
const env={ASSETS:{fetch:async request=>new Response(await readFile(new URL('../../'+new URL(request.url).pathname.slice(1),import.meta.url)))}};
const r=await portfolioRoute(new Request('https://agiscorecard.com/api/portfolio'),env);
assert.equal(r.status,200);const d=await r.json();assert.equal(d.schema_version,1);assert.equal(d.stocks.length,12);assert.equal(d.benchmarks.length,3);
console.log(JSON.stringify(['api/portfolio']));
