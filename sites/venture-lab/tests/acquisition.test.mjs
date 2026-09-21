import test from 'node:test';import assert from 'node:assert/strict';
import {acquisitionSource} from '../site/shared/acquisition.mjs';
test('categorizes acquisition without collecting URLs or queries',()=>{
 for(const [url,expected] of [['https://www.google.com/search?q=private','search'],['https://cn.bing.com/search?q=private','search'],['https://chatgpt.com/c/private','ai'],['https://www.reddit.com/r/test','community'],['https://www.linkedin.com/feed','social'],['https://baipiaoji.com/en/','bpj'],['','direct'],['https://google.com.attacker.example','direct']])assert.equal(acquisitionSource('',url),expected);
 assert.equal(acquisitionSource('?src=example','https://google.com/'),'example');assert.equal(acquisitionSource('?src=private-email','https://perplexity.ai/'),'ai');
});
