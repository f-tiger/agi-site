#!/usr/bin/env node
// Independent black-box evaluation. This file does not import or inspect server code.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = 3; // Every period page is deliberately smaller than ten.
const PERIOD = { start: '2024-01-01', end: '2024-12-31' };
const CUTOFFS = { before: '2025-03-01', after: '2026-03-01' };
const options = (extra = {}) => ({ unit: 'USD', ...PERIOD, ...CUTOFFS, ...extra });
const row = (val, filed, extra = {}) => ({
  ...PERIOD, val, filed, form: '10-K',
  accn: `9999999999-${filed.slice(2, 4)}-000001`, ...extra,
});
const fixture = (rows, extra = {}) => ({
  cik: 9999999999, entityName: 'SYNTHETIC EVALUATION ONLY — not a real issuer',
  taxonomy: 'us-gaap', tag: 'Revenues', units: { USD: rows }, ...extra,
});
const baseRows = () => [row(10, '2025-02-01'), row(12, '2026-02-01')];
const errorText = r => r.content?.filter(x => x.type === 'text').map(x => x.text).join('\n') ?? '';
let totalToolCalls = 0;

async function session(server, use) {
  const client = new Client({ name: 'independent-blackbox-evaluation', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [server], cwd: root, stderr: 'pipe' });
  // Drain stderr without printing document data; stdout remains MCP protocol only.
  transport.stderr?.on('data', () => {});
  await client.connect(transport);
  const context = {
    client, count: 0,
    async call(name, args, expectError = false) {
      this.count++; totalToolCalls++;
      const result = await client.callTool({ name, arguments: args });
      if (expectError) {
        assert.equal(result.isError, true, `${name} must reject invalid input`);
        assert.ok(errorText(result).length > 0, 'Errors must explain the rejection');
        return result;
      }
      assert.notEqual(result.isError, true, `${name}: ${errorText(result)}`);
      assert.ok(result.structuredContent, `${name} must return structuredContent`);
      const text = result.content?.find(x => x.type === 'text')?.text;
      assert.ok(text, `${name} must also return text content`);
      assert.deepEqual(JSON.parse(text), result.structuredContent, 'Text and structured results must agree');
      return result.structuredContent;
    },
    async periods(data) {
      let offset = 0;
      const all = [];
      const seen = new Set();
      for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
        assert.ok(LIMIT < 10);
        const page = await this.call('filinglens_periods', { data, offset, limit: LIMIT });
        assert.ok(page.periods.length <= LIMIT, 'Page size must respect the requested limit');
        for (const period of page.periods) {
          const key = JSON.stringify(period);
          assert.ok(!seen.has(key), 'Periods must not repeat across pages');
          seen.add(key); all.push(period);
        }
        if (page.next_offset === null) {
          assert.equal(all.length, page.periods_total, 'Pagination must retrieve the advertised total');
          return all;
        }
        assert.ok(Number.isInteger(page.next_offset) && page.next_offset > offset, 'Pagination must advance');
        offset = page.next_offset;
      }
      assert.fail('Pagination did not terminate');
    },
    compare(data, extra = {}) { return this.call('filinglens_compare', { data, options: options(extra) }); },
  };
  try {
    // Discover before every independent scenario; no scenario needs earlier state.
    const listed = await client.listTools();
    context.tools = new Map(listed.tools.map(t => [t.name, t]));
    const resources = await client.listResources();
    const uri = server.endsWith('server.mjs') ? 'filinglens://contract' : 'tradecheck://contract';
    assert.ok(resources.resources.some(r => r.uri === uri));
    const contract = await client.readResource({ uri });
    assert.ok(contract.contents.some(x => typeof x.text === 'string' && JSON.parse(x.text)));
    for (const t of listed.tools) {
      assert.ok(t.description?.length > 0 && t.inputSchema, 'Tools must advertise a schema and description');
      assert.equal(t.annotations?.readOnlyHint, true);
      assert.equal(t.annotations?.destructiveHint, false);
      assert.equal(t.annotations?.idempotentHint, true);
      assert.equal(t.annotations?.openWorldHint, false);
    }
    return await use(context);
  } finally {
    await client.close();
  }
}

const cases = [];
function add(id, title, question, data, expected, run) {
  const input = data ? `\nSynthetic companyconcept fixture (every identifier and source is fictional; do not browse its links):\n${JSON.stringify(data)}` : '';
  cases.push({ id, title, question: `Read the tool descriptions and filinglens://contract first. Use only this local MCP and the supplied fictional data. Fetch every period page with limit=3 and next_offset until null. Do not classify restatements or give investment advice.\n${question}${input}\nReturn only the single requested answer, without explanation.`, expected, run });
}

add('01', 'Fictional built-in example',
  'Obtain filinglens_example, confirm it is fictional, enumerate its exact periods, then compare only its data and options. Repeat that comparison with the observations reversed in input order. What signed absolute_change is identical in both results?',
  null, '-2000000', async c => {
    const ex = await c.call('filinglens_example', {});
    assert.equal(ex.fictional, true);
    const ps = await c.periods(ex.data); assert.equal(ps.length, 1);
    const result = await c.call('filinglens_compare', { data: ex.data, options: ex.options });
    const reversed = structuredClone(ex.data); reversed.units.USD.reverse();
    const second = await c.call('filinglens_compare', { data: reversed, options: ex.options });
    assert.deepEqual(second, result, 'Input order must not change the selected filing');
    assert.equal(result.restatement_determined, false); assert.equal(result.investment_recommendation, false);
    assert.equal(result.after.sources[0].filing_url, null, 'The built-in fictional accession must not acquire a real filing link');
    return result.absolute_change;
  });

{
  const quarter = [row(30, '2025-02-01', { start: '2024-07-01', end: '2024-09-30', fp: 'FY' }), row(33, '2026-02-01', { start: '2024-07-01', end: '2024-09-30', fp: 'Q3' })];
  const ytd = [row(90, '2025-02-01', { end: '2024-09-30' }), row(85, '2026-02-01', { end: '2024-09-30' })];
  const eur = quarter.map((r, i) => ({ ...r, val: i ? 999 : 100 }));
  const data = fixture([], { units: { USD: [...ytd, ...quarter], EUR: eur } });
  add('02', 'Exact quarter, YTD and unit isolation',
    'Enumerate the periods. Compare the USD quarter beginning 2024-07-01 and the USD year-to-date period beginning 2024-01-01, both ending 2024-09-30, at cutoffs 2025-03-01 and 2026-03-01. Also compare that exact quarter in EUR. Ignore misleading fp labels. What is the signed USD quarter absolute_change?',
    data, '3', async c => {
      assert.equal((await c.periods(data)).length, 3);
      const q = await c.compare(data, { start: '2024-07-01', end: '2024-09-30' });
      const y = await c.compare(data, { end: '2024-09-30' });
      const e = await c.compare(data, { unit: 'EUR', start: '2024-07-01', end: '2024-09-30' });
      assert.equal(y.absolute_change, '-5'); assert.equal(e.absolute_change, '899');
      return q.absolute_change;
    });
}

{
  const data = fixture([row(10, '2025-02-01'), row(11, '2026-02-01'), row(12, '2026-02-01', { accn: '9999999999-26-000002' }), row(13, '2026-03-01', { accn: '9999999999-26-000003' })]);
  add('03', 'Latest-day conflict and later resolution',
    'Enumerate periods, then compare USD for 2024-01-01 through 2024-12-31 against baseline cutoff 2025-03-01 at each later cutoff 2026-02-01, 2026-02-28 and 2026-03-01. Do not fall back to an older nonconflicting filing. Which of these three later cutoffs is the earliest to yield a complete value_changed result? Return YYYY-MM-DD.',
    data, '2026-03-01', async c => {
      await c.periods(data);
      const dates = ['2026-02-01', '2026-02-28', '2026-03-01']; const valid = [];
      for (const after of dates) {
        const r = await c.compare(data, { after });
        if (after !== '2026-03-01') { assert.equal(r.status, 'incomplete'); assert.equal(r.after.status, 'ambiguous'); assert.equal(r.absolute_change, null); assert.equal(r.after.source_count, 2); }
        else { assert.equal(r.absolute_change, '3'); }
        if (r.status === 'value_changed') valid.push(after);
      }
      return valid[0];
    });
}

{
  const data = fixture(baseRows());
  add('04', 'Missing baseline is not zero',
    'After enumerating periods, compare the full-year USD period at before=2025-01-31 and after=2026-03-01. Then repeat using before=2025-02-01 while keeping after unchanged, to check that a filing on the cutoff is eligible. What is the first comparison\'s before.status?',
    data, 'missing', async c => {
      await c.periods(data);
      const missing = await c.compare(data, { before: '2025-01-31' });
      const available = await c.compare(data, { before: '2025-02-01' });
      assert.equal(missing.status, 'incomplete'); assert.equal(missing.absolute_change, null);
      assert.equal(missing.before.source_count, 0); assert.equal(available.absolute_change, '2');
      return missing.before.status;
    });
}

{
  const data = fixture([row(-7.25, '2025-02-01'), row(0, '2026-02-01'), row(0, '2026-03-01', { accn: '9999999999-26-000002' })]);
  add('05', 'Negative and zero values',
    'Enumerate periods. Compare the full-year USD period at cutoffs 2025-03-01 and 2026-02-01, then at 2026-02-01 and 2026-03-01. Verify that the second interval is unchanged, with both zero values available. What signed absolute_change occurred in the first interval?',
    data, '7.25', async c => {
      await c.periods(data);
      const first = await c.compare(data, { after: '2026-02-01' });
      const zero = await c.compare(data, { before: '2026-02-01' });
      assert.equal(zero.status, 'unchanged'); assert.equal(zero.absolute_change, '0');
      assert.equal(zero.before.value, '0'); assert.equal(zero.after.value, '0');
      return first.absolute_change;
    });
}

{
  const data = fixture([row(0.1, '2025-02-01'), row(0.3, '2026-02-01'), row(0.1, '2026-03-01', { accn: '9999999999-26-000002' })]);
  add('06', 'Decimal arithmetic and direction',
    'Enumerate periods. Compare full-year USD at 2025-03-01 versus 2026-02-01, then 2026-02-01 versus 2026-03-01. Verify that the two signed changes cancel exactly. What is the first interval\'s absolute_change as the server\'s decimal string?',
    data, '0.2', async c => {
      await c.periods(data);
      const positive = await c.compare(data, { after: '2026-02-01' });
      const negative = await c.compare(data, { before: '2026-02-01' });
      assert.equal(negative.absolute_change, '-0.2');
      assert.equal(positive.before.value, negative.after.value);
      return positive.absolute_change;
    });
}

{
  const data = fixture([row(-9007199254740991, '2025-02-01'), row(9007199254740991, '2026-02-01')]);
  add('07', 'Large exact difference and unsafe input rejection',
    'Enumerate periods and compare the full-year USD period at 2025-03-01 and 2026-03-01. As a separate input-boundary check, replace the later val with numeric 9007199254740992 and confirm the server rejects it. For the original safe-endpoint fixture, what exact signed absolute_change does the server return?',
    data, '18014398509481982', async c => {
      await c.periods(data);
      const r = await c.compare(data);
      const unsafe = structuredClone(data); unsafe.units.USD[1].val = 9007199254740992;
      const rejected = await c.call('filinglens_compare', { data: unsafe, options: options() }, true);
      assert.match(errorText(rejected), /unsafe numeric/);
      return r.absolute_change;
    });
}

{
  const rows = Array.from({ length: 12 }, (_, i) => [
    row(100 + i, '2023-03-01', { start: `${2010 + i}-01-01`, end: `${2010 + i}-12-31` }),
    row(101 + 2 * i, '2024-03-01', { start: `${2010 + i}-01-01`, end: `${2010 + i}-12-31` }),
  ]).flat().reverse();
  const data = fixture(rows);
  add('08', 'Pagination across twelve exact periods',
    'Retrieve all twelve USD periods using limit=3 and following next_offset. Compare each exact period separately at cutoffs 2023-12-31 and 2024-12-31. Also request a period page at offset=12 and verify it is empty with no next page. What is the integer sum of the twelve signed absolute_change strings?',
    data, '78', async c => {
      const ps = await c.periods(data); assert.equal(ps.length, 12);
      const beyond = await c.call('filinglens_periods', { data, offset: 12, limit: LIMIT });
      assert.equal(beyond.periods.length, 0); assert.equal(beyond.next_offset, null);
      let sum = 0n;
      for (const p of ps) { const r = await c.compare(data, { ...p, before: '2023-12-31', after: '2024-12-31' }); sum += BigInt(r.absolute_change); }
      return sum.toString();
    });
}

{
  const sources = Array.from({ length: 23 }, (_, i) => row(12, '2026-02-01', { accn: `0001234567-26-${String(i + 1).padStart(6, '0')}` }));
  const data = fixture([row(10, '2025-02-01', { accn: '0001234567-25-000001' }), ...sources, { ...sources[0] }], { cik: 1234567 });
  add('09', 'Deduplicated sources and explicit truncation',
    'Enumerate periods and compare the full-year USD period at cutoffs 2025-03-01 and 2026-03-01. Repeat with all observation rows reversed and compare the sets of returned accession locators. These synthetic accession URLs are formatting checks only, not evidence of real filings. Exact duplicate rows should not count twice. What is the after.sources_omitted count, as an integer?',
    data, '3', async c => {
      await c.periods(data);
      const result = await c.compare(data);
      const reversed = structuredClone(data); reversed.units.USD.reverse();
      const second = await c.compare(reversed);
      assert.equal(result.after.source_count, 23); assert.equal(result.after.sources.length, 20);
      assert.equal(result.after.source_count, result.after.sources.length + result.after.sources_omitted);
      assert.deepEqual(new Set(second.after.sources.map(x => x.accession)), new Set(result.after.sources.map(x => x.accession)));
      const source = result.after.sources.find(x => x.accession === '0001234567-26-000001');
      assert.equal(source.filing_url, 'https://www.sec.gov/Archives/edgar/data/1234567/000123456726000001/');
      assert.equal(result.absolute_change, '2'); return String(result.after.sources_omitted);
    });
}

{
  const instant = (val, filed) => { const r = row(val, filed); delete r.start; return r; };
  const data = fixture([null, instant(100, '2025-03-01'), instant(105, '2026-03-01'), instant(999, '2026-03-02')], { tag: 'Assets' });
  add('10', 'Instant facts, null rows and date boundaries',
    'Enumerate the instant USD period. Compare Assets at start=null, end=2024-12-31, before=2025-03-01 and after=2026-03-01. Verify the filing on each cutoff is eligible and the next-day filing is excluded, despite a null observation row. Separately attempt an invalid end date 2024-02-31 and then equal before/after dates 2025-03-01; both must be rejected. What is the valid comparison\'s absolute_change?',
    data, '5', async c => {
      const ps = await c.periods(data); assert.equal(ps.length, 1); assert.equal(ps[0].start, null);
      const result = await c.compare(data, { start: null });
      assert.equal(result.before.value, '100'); assert.equal(result.after.value, '105');
      assert.equal(result.before.filed, '2025-03-01'); assert.equal(result.after.filed, '2026-03-01');
      await c.call('filinglens_compare', { data, options: options({ start: null, end: '2024-02-31' }) }, true);
      await c.call('filinglens_compare', { data, options: options({ start: null, after: '2025-03-01' }) }, true);
      return result.absolute_change;
    });
}

const xmlEscape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<evaluation>\n${cases.map(t => `  <qa_pair>\n    <question>${xmlEscape(t.question)}</question>\n    <answer>${xmlEscape(t.expected)}</answer>\n  </qa_pair>`).join('\n')}\n</evaluation>\n`;

async function tradecheck(server) {
  await session(server, async c => {
    assert.ok(c.tools.has('tradecheck_import_tables'));
    await c.call('tradecheck_example', {});
    const args = {
      po: { id: 'SYNTH-PO-1', supplier_id: 'SYNTH-SUP-1', currency: 'USD', source_ref: 'SYNTHETIC PO header' },
      invoice: { id: 'SYNTH-INV-1', po_id: 'SYNTH-PO-1', supplier_id: 'SYNTH-SUP-1', currency: 'USD', source_ref: 'SYNTHETIC invoice header', subtotal: '25.00', charges: '0', tax: '0', total: '25.00' },
      po_table: { text: 'line_id,sku,uom,quantity,unit_price\nP1,WIDGET,EA,2,12.50', source_name: 'SYNTHETIC PO table', columns: { line_id: 0, sku: 1, uom: 2, quantity: 3, unit_price: 4 } },
      invoice_table: { text: 'line_id,po_line_id,sku,uom,quantity,unit_price,line_total\nI1,P1,WIDGET,EA,2,12.50,25.00', source_name: 'SYNTHETIC invoice table', columns: { line_id: 0, po_line_id: 1, sku: 2, uom: 3, quantity: 4, unit_price: 5, line_total: 6 } },
    };
    const r = await c.call('tradecheck_import_tables', args);
    assert.equal(r.data.extraction_reviewed, false); assert.equal(r.data.history_status, 'unknown');
    assert.deepEqual(r.data.prior_invoices, []);
    assert.equal(r.data.invoice.lines[0].line_total, '25.00');
    assert.equal(r.data.po.lines[0].source_ref, 'SYNTHETIC PO table: row 2');
    assert.equal(r.data.invoice.lines[0].source_ref, 'SYNTHETIC invoice table: row 2');
    assert.deepEqual(await c.call('tradecheck_import_tables', args), r, 'Repeated imports must be deterministic');
    const missing = structuredClone(args); delete missing.invoice.tax;
    const missingResult = await c.call('tradecheck_import_tables', missing, true);
    assert.match(errorText(missingResult), /invoice.tax/);
    const invalid = structuredClone(args); invalid.po_table.columns.quantity = 20;
    const mappingResult = await c.call('tradecheck_import_tables', invalid, true);
    assert.match(errorText(mappingResult), /existing column/);
    console.log(`PASS TradeCheck import: success, repeated result, missing tax, invalid mapping (${c.count} tool calls)`);
  });
}

try {
  const cli = process.argv.slice(2);
  if (cli[0] === '--tradecheck') {
    assert.equal(cli.length, 2, 'Usage: node scripts/evaluate.mjs --tradecheck /path/to/tradecheck/dist/server.js');
    await tradecheck(resolve(cli[1]));
  } else {
    assert.ok(cli.length === 0 || (cli.length === 1 && cli[0] === '--write-xml'), 'Supported options: --write-xml OR --tradecheck PATH');
    if (cli[0] === '--write-xml') await writeFile(resolve(root, 'evals.xml'), xml);
    assert.equal(await readFile(resolve(root, 'evals.xml'), 'utf8'), xml, 'evals.xml must match the independently specified scenarios');
    const failures = [];
    for (const t of cases) {
      const counts = [];
      try {
        // Re-run each independent question in a fresh stdio process to check determinism.
        for (let attempt = 0; attempt < 2; attempt++) {
          await session(resolve(root, 'src/server.mjs'), async c => {
            assert.deepEqual([...c.tools.keys()].sort(), ['filinglens_compare', 'filinglens_example', 'filinglens_periods']);
            const answer = String(await t.run(c));
            assert.equal(answer, t.expected, `${t.id}: exact single-answer comparison`);
            assert.ok(c.count >= 2, 'Each question must require multiple tool calls');
            counts.push(c.count);
          });
        }
        console.log(`PASS ${t.id} ${t.title}: ${t.expected} (${counts.join('+')} tool calls)`);
      } catch (error) {
        failures.push(t.id);
        console.error(`FAIL ${t.id} ${t.title}: ${error.message}`);
      }
    }
    console.log(`${failures.length ? 'FAIL' : 'PASS'} ${10 - failures.length}/10 independent questions, passing questions repeated in fresh processes; ${totalToolCalls} tool calls. Protocol/deterministic evaluation only; no LLM reasoning benchmark was run.`);
    if (failures.length) process.exitCode = 1;
  }
} catch (error) {
  console.error(`FAIL ${error.stack ?? error.message}`);
  process.exitCode = 1;
}
