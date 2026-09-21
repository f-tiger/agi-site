// Read-only production smoke: no registrations, posts, payments or tracking beacons.
import assert from 'node:assert/strict';
const origin='https://agiscorecard.com';
const paths=[['/','community-home'],['/cn','community-home'],['/discuss','Editorial prompt'],['/zh/discuss','编辑开场话题'],['/discuss/tool-evidence','Copy share link'],['/zh/discuss/tool-evidence','复制分享链接'],['/discuss/account','Create free account'],['/zh/discuss/account','创建免费账号'],['/discuss/rules','What we store'],['/discuss-sitemap.xml','/zh/discuss/tool-evidence'],['/community-assets/app.mjs','workbench-member-key:agi']];
for(const [path,needle]of paths){const r=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);assert.ok((await r.text()).includes(needle),path+' content');console.log('OK '+path);}
const api=await fetch(origin+'/api/discuss',{signal:AbortSignal.timeout(30000)});assert.equal(api.status,200);const j=await api.json();assert.equal(j.site,'agi');assert.equal(j.editorial.length,6);assert.equal(api.headers.get('X-Robots-Tag'),'noindex');
const privatePage=await fetch(origin+'/discuss/account');assert.match(privatePage.headers.get('Cache-Control'),/no-store/);assert.match(privatePage.headers.get('Content-Security-Policy'),/script-src 'self'/);
for(const [path,body]of [['/api/discuss',{action:'status'}],['/api/discuss/admin',{action:'queue'}]]){const r=await fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});assert.equal(r.status,401,path+' authorization');assert.doesNotMatch(await r.text(),/member_id|token_hash|handle/);}
console.log('Community live checks passed; no accounts or content created.');
