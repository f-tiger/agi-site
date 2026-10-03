import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {VERSION,groups} from '../../site-nav/render.mjs';
const origin='https://agiscorecard.com',hash=x=>createHash('sha256').update(x).digest('hex');
async function get(route){const u=new URL(route,origin);u.searchParams.set('__qa','1');const r=await fetch(u,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,route);return r.text();}
for(const route of ['/home-focus/nav.css','/site-nav/app.mjs']){const text=await get(route);assert.equal(hash(text),hash(fs.readFileSync(new URL('../..'+route,import.meta.url))),route+' deployed version');}
const routes=['/','/cn',...['future-guide','progress-index','ai-tools','invest','jarvis','mentor','earn','workbench','members','discuss','discuss/account'].flatMap(x=>['/'+x,'/zh/'+x])];
for(const route of routes){const html=await get(route);assert.ok(html.includes(`data-nav-version="${VERSION}"`),route+' shared navigation');assert.equal((html.match(/id="agi-nav"/g)||[]).length,1,route);assert.equal((html.match(/id="agi-menu-panel"/g)||[]).length,1,route);assert.equal((html.match(/data-nav-destination=/g)||[]).length,26,route+' complete menu');assert.ok(html.includes('data-nav-language-link="translation"'),route+' paired language');}
const paths=new Set();for(const g of groups)for(const item of g.links){const route=item[3].split('#')[0];if(route.startsWith('https:'))continue;paths.add(route.startsWith('/')?route:'/'+route);if(!route.startsWith('/'))paths.add('/zh/'+route);}
for(const route of paths)await get(route);
console.log(JSON.stringify({navigation:VERSION,livePages:routes.length,menuRoutes:paths.size,passed:true}));
