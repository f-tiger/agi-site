import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, compareTables, toCSV, handoff } from '../assets/studio/table-review-core.mjs';

const source = parseCSV('id,name,qty,price\n001,桌灯,12,19.90\n002,纸盒,8,3.50');
const rule = { key: 'id', mutable: ['name'] };

test('repair altered facts while preserving allowed translations and reordered rows/columns', () => {
  const draft = parseCSV('name,price,id,qty\nBox,3.50,002,8\nLamp,29.90,001,120');
  const result = compareTables(source, draft, rule);
  assert.deepEqual(result.errors, []);
  assert.equal(result.repairs.length, 2);
  assert.equal(result.edits.length, 2);
  assert.deepEqual(result.repaired.rows, [['002','Box','8','3.50'], ['001','Lamp','12','19.90']]);
  assert.deepEqual(compareTables(source, result.repaired, rule).repairs, []);
  assert.equal(source.rows[0][1], '桌灯');
});

test('identity errors block automatic repair rather than guessing alignment', () => {
  for (const csv of ['id,name,qty,price\n001,Lamp,12,19.90', 'id,name,qty,price\n001,Lamp,12,19.90\n001,Box,8,3.50', 'id,name,qty,price\n003,Lamp,12,19.90\n002,Box,8,3.50']) {
    const result = compareTables(source, parseCSV(csv), rule);
    assert.equal(result.repaired, null);
    assert.ok(result.errors.length);
  }
});

test('CSV round trips quotes, embedded CRLF, commas, BOM and zero-prefixed keys', () => {
  const table = parseCSV('\uFEFFid,text,amount\r\n001,"a,b\r\n""c""",-3.50\r\n');
  assert.equal(table.rows[0][1], 'a,b\r\n"c"');
  assert.deepEqual(parseCSV(toCSV(table)), table);
});

test('malformed or oversized inputs fail explicitly', () => {
  for (const csv of ['id,id\n1,2','id,\n1,2','id,name\n1','id,name\n1,"open','id,name\n1,"ok"bad', 'id,name\n1,a"b', 'x'.repeat(1_000_001)]) assert.throws(() => parseCSV(csv));
});

test('unsafe formulas cannot pass export, including protected original facts', () => {
  const draft = parseCSV('id,name,qty,price\n001,=HYPERLINK(""),12,19.90\n002,Box,8,3.50'.replace('=HYPERLINK(""),' , '=1+1,'));
  const result = compareTables(source, draft, rule);
  assert.equal(result.repaired, null);
  assert.ok(result.errors.some(e => e.includes('公式')));
  const unsafe = parseCSV('id,name\n001,@SUM(A1)');
  assert.equal(compareTables(unsafe, unsafe, {key:'id',mutable:[]}).repaired, null);
});

test('negative numeric strings are preserved; exact decimal formatting matters', () => {
  const a=parseCSV('id,label,amount\n01,a,-2.50');
  const b=parseCSV('id,label,amount\n01,b,-2.5');
  const r=compareTables(a,b,{key:'id',mutable:['label']});
  assert.equal(r.repaired.rows[0][2], '-2.50');
  assert.equal(r.repairs.length,1);
});

test('schema and rule mismatches block export', () => {
  assert.equal(compareTables(source,source,{key:'id',mutable:['id']}).repaired,null);
  assert.equal(compareTables(source,source,{key:'missing',mutable:[]}).repaired,null);
  assert.equal(compareTables(source,parseCSV('id,name,qty,extra\n001,a,1,x'),rule).repaired,null);
});

test('handoff records the same constraint contract used for checking', () => {
  const prompt=handoff(source,rule);
  assert.ok(prompt.includes('只可改写这些列：name'));
  assert.ok(prompt.includes('001,桌灯,12,19.90'));
});
