import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyConsumerLink as classify} from './manju-consumer-links.mjs';
const hongguo='https://hongguoduanju.com/detail?series_id=7690112243203050521';
test('official destinations depend on the recorded link type and exact host/path',()=>{
  assert.deepEqual(classify({linkType:'collection',destination:hongguo}),{url:hongguo,label:'到红果查看',action:'official_open',official:true,kind:'official'});
  assert.equal(classify({linkType:'collection',destination:'https://tv.cctv.com/2024/02/26/VIDAUw4U4rxtLHnKuKP9dFZV240226.shtml'}).label,'到央视查看');
  assert.equal(classify({linkType:'search',destination:hongguo}).official,false);
  assert.equal(classify({linkType:'collection',destination:'https://example.com/video',thumbnail:{url:hongguo},platform:'红果'}).official,false);
});
test('lookalikes, redirects, duplicate ids and unknown paths never acquire an official label',()=>{
  for(const destination of [
    'https://hongguoduanju.com.evil.example/detail?series_id=12',
    'https://evil.hongguoduanju.com/detail?series_id=12',
    'https://hongguoduanju.com@evil.example/detail?series_id=12',
    'https://user:password@hongguoduanju.com/detail?series_id=12',
    'https://hongguoduanju.com:444/detail?series_id=12',
    'http://hongguoduanju.com/detail?series_id=12',
    'https://hongguoduanju.com/detail?series_id=12&series_id=34',
    'https://hongguoduanju.com/detail?series_id=12&redirect=https://evil.example',
    'https://hongguoduanju.com/detail?series_id=abc',
    'https://hongguoduanju.com/detail?series_id=0',
    'https://hongguoduanju.com/unknown/../detail?series_id=12',
    'https://hongguoduanju.com/%2e%2e/detail?series_id=12',
    'https://hongguoduanju.com/detail?series_id=',
    'https://hongguoduanju.com/unknown?series_id=12',
    'https://hongguoduanju.com/detail/extra?series_id=12',
    'https://hongguoduanju.com/detail?series_id=12#other',
    'https://tv.cctv.com.evil.example/2024/02/26/VIDabc.shtml',
    'https://tv.cctv.com/redirect?url=https://evil.example',
    'https://tv.cctv.com/2024/02/26/VIDabc.shtml?redirect=elsewhere',
    'javascript:alert(1)','data:text/html,hello','https://hongguoduanju.com\\@evil.example/detail?series_id=12',
    ' https://hongguoduanju.com/detail?series_id=12','https://hongguo\nduanju.com/detail?series_id=12',
  ]){const link=classify({linkType:'collection',destination});assert.equal(link.official,false,destination);assert.equal(link.action,'source',destination);}
});
test('search and introduction remain distinct from official work entries',()=>{
  assert.equal(classify({linkType:'search',destination:'https://www.douyin.com/search/%E7%9F%AD%E5%89%A7'}).action,'platform_search');
  assert.equal(classify({linkType:'search',destination:'https://www.douyin.com/search/%E7%9F%AD%E5%89%A7'}).label,'去抖音搜索');
  assert.equal(classify({linkType:'search',destination:'https://v.qq.com/x/search/?q=%E5%89%A7'}).label,'在腾讯视频搜索');
  assert.equal(classify({linkType:'search',destination:'https://v.qq.com/x/search/?q=%E5%89%A7'}).kind,'search');
  assert.equal(classify({linkType:'intro',destination:'https://www.cctv.com/2024/03/22/ARTImxwnEZa0LYYPusv8E57A240322.shtml'}).action,'intro_open');
  for(const item of [{linkType:'search',destination:'https://www.douyin.com.evil.example/search/test'},{linkType:'intro',destination:'https://unknown.example/article'},{linkType:'search',destination:'https://v.qq.com/x/search/?q=one&q=two'}])assert.equal(classify(item).kind,'source');
});
test('unsafe destinations use a safe source or no hyperlink',()=>{
  assert.equal(classify({destination:'javascript:alert(1)',source:'https://example.com/evidence'}).url,'https://example.com/evidence');
  assert.equal(classify({destination:'javascript:alert(1)',source:'data:text/plain,no'}).url,'');
  assert.equal(classify(null).official,false);
});
test('current catalogue produces only traceable, typed outgoing actions',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../data/manju.json',import.meta.url),'utf8'));
  for(const item of catalog.items){const link=classify(item);assert.ok(link.url,item.id);assert.equal(link.official,item.linkType==='collection',item.id);assert.equal(link.kind,{collection:'official',search:'search',intro:'intro'}[item.linkType],item.id);}
});

test('current official cohorts may supplement an exact search-only record without mutating it',()=>{
  const item={title:'精确剧名：第二季',linkType:'search',destination:'https://www.douyin.com/search/test'},before=JSON.stringify(item);
  const records=[{title:item.title,url:hongguo},{title:item.title,url:hongguo}];
  const entry=classify(item,records);assert.equal(entry.url,hongguo);assert.equal(entry.official,true);assert.equal(entry.action,'official_open');assert.equal(JSON.stringify(item),before);
  assert.equal(classify(item).kind,'search');
  assert.equal(classify({...item,linkType:'intro'},records).official,false);
});
test('similar titles, ambiguous targets and invalid cohort URLs never upgrade search entries',()=>{
  const item={title:'精确剧名：第二季',linkType:'search',destination:'https://www.douyin.com/search/test'};
  for(const records of [
    [{title:'精确剧名第二季',url:hongguo}],
    [{title:'精确剧名：第二季 ',url:hongguo}],
    [{title:'精确剧名：第三季',url:hongguo}],
    [{title:item.title,url:hongguo},{title:item.title,url:'https://hongguoduanju.com/detail?series_id=7692043430955863102'}],
    [{title:item.title,url:'https://hongguoduanju.com.evil.example/detail?series_id=12'}],
    [{title:item.title,url:'https://unknown.example/detail?series_id=12'}],
    [{title:item.title,url:hongguo},{title:item.title,url:'https://hongguoduanju.com/detail?series_id=1&series_id=2'}],
  ]){const entry=classify(item,records);assert.equal(entry.kind,'search',JSON.stringify(records));assert.equal(entry.url,item.destination);}
  assert.equal(classify({...item,searchEvidence:[{title:item.title,url:hongguo}],thumbnail:{url:hongguo}}).official,false);
});
