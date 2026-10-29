import test from 'node:test';import assert from 'node:assert/strict';
import {project,sample,backup,restore,html,svg,paidFiles,readTable,importTable,canvaTable} from '../assets/studio/testimonial-core.mjs';
import {database} from '../../../tools/member-studio/test-fixtures.mjs';
import {ensureMembers,allowedProduct} from '../lib/membership.js';import {digest,seconds} from '../lib/ad-commerce.js';
import {onRequestPost} from '../functions/api/member.js';
const own=()=>({...sample(),demo:false,title:'Client <script>private</script>',quotes:[{quote:'<img src=x onerror=alert(1)> A real customer statement.',name:'Name <svg>',role:'Maker',source:'https://example.test/review?q=a&b=2',approved:true}]});
test('quote exports escape all customer text and keep demos visibly labelled',()=>{
 const s=html(own());assert.ok(s.includes('&lt;script&gt;'));assert.ok(!s.includes('<script>private'));assert.ok(!s.includes('<img src=x'));assert.match(s,/Content-Security-Policy/);assert.match(svg(own()),/&lt;img/);
 assert.match(html(sample()),/Fictional example/);assert.match(svg(sample()),/Fictional example/);assert.throws(()=>paidFiles(backup(sample())),/own_project/);
 assert.deepEqual(restore(backup(own())),project(own()));
});
test('permission, URL, input limits and immutable demo markers are checked at delivery',()=>{
 const p=own();p.quotes[0].approved=false;assert.throws(()=>html(p),/permission/);
 for(const source of ['javascript:alert(1)','http://example.test','https://user:pass@example.test']){const p=own();p.quotes[0].source=source;assert.throws(()=>project(p));}
 const q=own();q.quotes[0].quote='x'.repeat(241);assert.throws(()=>project(q));q.quotes=Array(13).fill(own().quotes[0]);assert.throws(()=>project(q));
 const files=paidFiles(backup(own()));assert.equal(files.length,5);assert.ok(!files[0].data.includes('Made with BPJ'));assert.match(files.find(f=>f.name==='README.txt').data,/No hosting/);
});
test('only active BPJ membership can obtain an unbranded server package, no payment or cloud record is invented',async()=>{
 const db=database();await ensureMembers(db,'bpj');const key='1'.repeat(64),env={HITS:db,MEMBER_SITE:'bpj'};
 const call=(data=backup(own()),token=key,origin='https://baipiaoji.com')=>onRequestPost({env,request:new Request('https://baipiaoji.com/api/member',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,Origin:origin},body:JSON.stringify({action:'testimonial_export',data})})});
 assert.equal((await call()).status,401);db.sql.prepare('INSERT INTO wb_members(id,token_hash,created,ends_at) VALUES(?,?,?,?)').run('member',await digest(key),seconds(),seconds()-1);
 assert.equal((await call()).status,403);db.sql.exec('UPDATE wb_members SET ends_at='+(seconds()+86400));
 const r=await call();assert.equal(r.status,200);const body=await r.json();assert.equal(body.ok,true);assert.equal(body.files[0].name,'index.html');
 assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_orders').get().n,0);assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM wb_versions').get().n,0);
 assert.equal((await call(backup(sample()))).status,400);assert.equal((await call(undefined,key,'https://evil.test')).status,403);
 db.sql.exec('UPDATE wb_members SET suspended=1');assert.equal((await call()).status,403);db.sql.exec('UPDATE wb_members SET suspended=0');env.MEMBER_SITE='agi';assert.equal((await call()).status,403);
 assert.equal(allowedProduct('bpj','bpj-testimonial-kit'),true);assert.equal(allowedProduct('agi','bpj-testimonial-kit'),false);db.sql.close();
});

test('existing-app CSV mapping preserves quoted text, rejects excess data and requires fresh permission',()=>{
 const t=readTable('Feedback,Customer,Role,URL\r\n"Useful, clear",Alice,Maker,https://example.test/review');
 const p=importTable(t,{quote:'Feedback',name:'Customer',role:'Role',source:'URL'});assert.equal(p.quotes[0].quote,'Useful, clear');assert.equal(p.quotes[0].approved,false);assert.throws(()=>canvaTable(p),/permission/);
 p.quotes[0].approved=true;p.quotes[0].quote='=SUM(1,2)';assert.ok(canvaTable(p).includes("'=SUM"));assert.ok(canvaTable(sample()).includes('[Fictional example]'));
 assert.throws(()=>readTable('a,b\n'+Array(13).fill('x,y').join('\n')),/max_12/);assert.throws(()=>importTable(t,{quote:'Feedback',name:'Feedback'}),/mapping/);
});
