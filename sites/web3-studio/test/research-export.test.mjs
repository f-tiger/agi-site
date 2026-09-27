import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareNoteDownload} from '../public/research-export.mjs';
import {reviewMarkdown} from '../public/research-core.mjs';

test('download bytes and manual-copy text preserve all private note fields without early revocation',async()=>{
 const note={claim:'QA claim <script>not HTML</script>',evidence:'https://example.com/资料',counter:'Opposite evidence',invalidate:'A falsifiable condition',reviewDate:'2026-10-19'};
 const text=reviewMarkdown(note,[],'2026-09-27T00:00:00Z');
 let blob,revoked=[];
 const api={createObjectURL:b=>{blob=b;return 'blob:test';},revokeObjectURL:u=>revoked.push(u)};
 const link={hidden:true,removeAttribute(k){delete this[k];}},preview={};
 const dispose=prepareNoteDownload(text,link,preview,api);
 assert.equal(await blob.text(),text);assert.equal(preview.value,text);
 for(const value of Object.values(note))assert.ok(text.includes(value));
 assert.equal(link.download,'web3-evidence-note.md');assert.equal(link.hidden,false);
 assert.equal(blob.type,'text/markdown;charset=utf-8');assert.deepEqual(revoked,[]);
 dispose();assert.deepEqual(revoked,['blob:test']);assert.equal(link.hidden,true);assert.equal(link.href,undefined);
});

test('manual copy survives unavailable object URLs',()=>{
 const preview={},link={};
 assert.throws(()=>prepareNoteDownload('Private note',link,preview,{createObjectURL(){throw Error('blocked');}}));
 assert.equal(preview.value,'Private note');assert.equal(link.hidden,true);
});
