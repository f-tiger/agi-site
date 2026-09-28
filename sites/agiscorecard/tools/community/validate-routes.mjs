// Validate the actual Worker routes before admitting them to the static link checker.
import assert from 'node:assert/strict';
import {database} from '../../../../tools/member-studio/test-fixtures.mjs';
import {communityRoute} from './server.mjs';
import {seeds} from './content.mjs';
const env={EVENTS:database()},paths=['discuss','zh/discuss'].flatMap(root=>[root,...['account','new','rules','moderate',...seeds.map(s=>s.id)].map(id=>root+'/'+id)]);
for(const path of paths){const response=await communityRoute(new Request('https://agiscorecard.com/'+path),env);assert.equal(response?.status,200,'Dynamic route /'+path);assert.match(await response.text(),/<!doctype html>/i);}
console.log(JSON.stringify(paths));
