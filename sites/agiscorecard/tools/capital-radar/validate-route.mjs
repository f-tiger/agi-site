// A dynamic link is valid only if the actual account gate and private shell work.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {capitalRadarRoute} from './server.mjs';
const url='https://agiscorecard.com/capital-radar';
const anonymous=await capitalRadarRoute(new Request(url),{});
assert.equal(anonymous.status,303);assert.match(anonymous.headers.get('Location'),/^\/auth\/account\?/);
assert.equal((await capitalRadarRoute(new Request('https://agiscorecard.com/api/capital-radar'),{})).status,401);
const env={ASSETS:{fetch:async()=>new Response(await readFile(new URL('../../capital-radar/account.html',import.meta.url)),{headers:{'Content-Type':'text/html'}})}};
const registered=await capitalRadarRoute(new Request(url,{headers:{cookie:'__Host-fleet_account='+'x'.repeat(43)}}),env,async()=>Response.json({ok:true,user:{id:'local-validator'}}));
assert.equal(registered.status,200);assert.match(registered.headers.get('X-Robots-Tag'),/noindex/);assert.match(await registered.text(),/capital-radar-assets/);
console.log(JSON.stringify(['capital-radar','api/capital-radar']));
