import test from 'node:test';
import assert from 'node:assert/strict';
import {parseJSONExact,formatJSONExact,diffJSONExact,imageHeader,fitImage,resolveWallTime,planMeeting,calendarFile} from '../../document-assets/utility-core.mjs';
import {utilityCopy} from './utility-copy.mjs';
const parse=parseJSONExact;
test('JSON preserves numeric IDs, exponents and strings; compares decimal values without floating point',()=>{
 const input='{"id":9007199254740993123456789,"n":1.2300e+20,"text":"<script>hello</script>","zero":-0}';
 assert.equal(formatJSONExact(parse(input),{pretty:false}),input);
 assert.deepEqual(diffJSONExact(parse('{"x":1,"y":1000,"z":-0}'),parse('{"z":0,"y":1e3,"x":1.000}')),[]);
 assert.equal(diffJSONExact(parse('9007199254740992'),parse('9007199254740993')).length,1);
 assert.equal(formatJSONExact(parse('{"b":2,"a":1}'),{sort:true,pretty:false}),'{"a":1,"b":2}');
});
test('JSON rejects duplicate decoded keys, trailing tokens, comments and bounded-complexity violations',()=>{
 assert.throws(()=>parse('{"a":1,"\\u0061":2}'),/jsonDuplicate/);
 for(const bad of ['{"a":1,}','[1,]','01','[true false]','undefined','{"a":NaN}','{"a":/*x*/1}','"a\nb"','1e','1 2'])assert.throws(()=>parse(bad),/jsonSyntax/);
 assert.throws(()=>parse('['.repeat(62)+'0'+']'.repeat(62)),/jsonComplex/);
 assert.throws(()=>parse('1e100001'),/jsonComplex/);
 assert.throws(()=>parse(' '.repeat(524289)),/jsonSize/);
});
test('JSON paths escape slash and tilde, preserve prototype-like keys, and state array index changes',()=>{
 const a=parse('{"a/b":{"~key":1},"__proto__":{"polluted":false},"list":[1,2]}'),b=parse('{"list":[0,1,2],"__proto__":{"polluted":true},"a/b":{"~key":2}}');
 const d=diffJSONExact(a,b);assert.ok(d.some(r=>r.path==='/a~1b/~0key'));assert.ok(d.some(r=>r.path==='/__proto__/polluted'));assert.equal({}.polluted,undefined);
 assert.equal(d.filter(r=>r.path.startsWith('/list/')).length,3);
});
test('image bounds do not upscale or distort proportions and reject animated or oversized headers',()=>{
 assert.deepEqual(fitImage(1500,1000,1000,1000),{width:1000,height:667});assert.deepEqual(fitImage(20,10,1000,1000),{width:20,height:10});
 assert.throws(()=>fitImage(1,1,0,20),/imageDimensions/);
 const png=Buffer.alloc(45);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(13,8);png.write('IHDR',12);png.writeUInt32BE(100,16);png.writeUInt32BE(200,20);png.writeUInt32BE(0,33);png.write('IEND',37);
 assert.deepEqual(imageHeader(png),{width:100,height:200,type:'image/png'});
 png.writeUInt32BE(20000,16);assert.throws(()=>imageHeader(png),/imagePixels/);png.writeUInt32BE(100,16);png.write('acTL',37);assert.throws(()=>imageHeader(png),/imageAnimated/);
 assert.throws(()=>imageHeader(Buffer.from('<svg>'+'.'.repeat(80))),/imageType/);
});
test('time zones use date-specific offsets including quarter-hour zones and reject impossible dates',()=>{
 assert.equal(new Date(resolveWallTime('2026-10-15T09:00','America/New_York')).toISOString(),'2026-10-15T13:00:00.000Z');
 assert.equal(new Date(resolveWallTime('2026-10-15T09:00','Asia/Kathmandu')).toISOString(),'2026-10-15T03:15:00.000Z');
 for(const value of ['2026-02-30T10:00','2026-13-01T10:00','2026-01-01T24:00','2101-01-01T09:00'])assert.throws(()=>resolveWallTime(value,'UTC'),/timeDate/);
});
test('DST skipped times fail and repeated times need an explicit choice',()=>{
 assert.throws(()=>resolveWallTime('2026-03-08T02:30','America/New_York'),/timeGap/);
 assert.throws(()=>resolveWallTime('2026-11-01T01:30','America/New_York'),/timeFold/);
 const early=resolveWallTime('2026-11-01T01:30','America/New_York','earlier'),late=resolveWallTime('2026-11-01T01:30','America/New_York','later');assert.equal(late-early,3600000);assert.equal(new Date(early).toISOString(),'2026-11-01T05:30:00.000Z');
 assert.throws(()=>resolveWallTime('2026-10-25T02:30','Europe/Berlin'),/timeFold/);
 assert.throws(()=>resolveWallTime('2011-12-30T09:00','Pacific/Apia'),/timeGap/);
});
test('meeting calculations preserve duration across DST, show date rollover and mark work-hour assumptions',()=>{
 const p=planMeeting({local:'2026-10-15T09:00',zone:'America/New_York',duration:60,zones:['Europe/London','Europe/Berlin','Asia/Shanghai']});
 assert.deepEqual(p.rows.map(r=>r.start.hour),[9,14,15,21]);assert.deepEqual(p.rows.map(r=>r.outside),[false,false,false,true]);
 const fall=planMeeting({local:'2026-11-01T01:30',zone:'America/New_York',occurrence:'earlier',duration:60,zones:['Asia/Tokyo']});assert.equal(fall.end-fall.start,3600000);assert.equal(fall.rows[0].start.hour,fall.rows[0].end.hour);
 const cross=planMeeting({local:'2026-10-15T23:30',zone:'UTC',duration:60,zones:[]});assert.equal(cross.rows[0].end.day,16);assert.equal(cross.rows[0].outside,true);
});
test('calendar bytes use UTC, escape newlines and commas, fold UTF-8 at 75 bytes and send no invitations',()=>{
 const ics=calendarFile({start:Date.UTC(2026,9,15,13),end:Date.UTC(2026,9,15,14),title:'会議🙂'.repeat(35),description:'notes, semi; back\\\nATTENDEE:evil@example.com',uid:'test-123',now:Date.UTC(2026,8,27)});
 assert.match(ics,/DTSTART:20261015T130000Z\r\n/);assert.match(ics,/DTEND:20261015T140000Z\r\n/);
 assert.ok(ics.split('\r\n').every(line=>Buffer.byteLength(line)<=75));assert.equal(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.from(ics)),ics);
 const unfolded=ics.replace(/\r\n /g,'');assert.ok(unfolded.includes('notes\\, semi\\; back\\\\\\nATTENDEE:'));assert.ok(!/^ATTENDEE:|^METHOD:REQUEST/m.test(ics));
 assert.throws(()=>calendarFile({start:0,end:1,title:'x',uid:'\r\nX:bad'}),/timeDate/);
});
test('every utility has complete localized interface and error keys',()=>{
 for(const lang of ['de','zh']){assert.deepEqual(Object.keys(utilityCopy[lang].ui).sort(),Object.keys(utilityCopy.en.ui).sort());assert.deepEqual(Object.keys(utilityCopy[lang].errors).sort(),Object.keys(utilityCopy.en.errors).sort());for(const task of ['image','json','meeting'])assert.equal(utilityCopy[lang].tools[task].faq.length,2);}
});
