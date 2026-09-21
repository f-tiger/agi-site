// Black-box deterministic MCP evaluation. Do not import the engine or its tests.
// All server interactions are read-only; only local evaluation artifacts are written.
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client = new Client({name: 'tradecheck-contract-evaluation', version: '1.0.0'});
const results = [];
let active;
const check = (name, passed, detail = '') => active.checks.push({name, passed: Boolean(passed), ...(detail ? {detail} : {})});
const clone = value => structuredClone(value);
const codes = report => report.findings.map(finding => finding.code);
async function invoke(method, args) {
  const result = await client[method](args);
  // Successful tools duplicate the same JSON in text and structuredContent.
  // Retain the structured response once; retain complete errors/resources.
  const recorded = result.structuredContent ? {structuredContent: result.structuredContent, ...(result.isError ? {isError: true} : {})} : result;
  active.calls.push({method, ...(args?.name ? {name: args.name} : {}), ...(args?.uri ? {uri: args.uri} : {}), ...(args?.arguments?.offset !== undefined ? {offset: args.arguments.offset} : {}), result: recorded});
  return result;
}
async function tool(name, args) {
  const result = await invoke('callTool', {name, arguments: args});
  if (result.isError || !result.structuredContent) throw new Error(`${name} did not return successful structured content: ${JSON.stringify(result)}`);
  return result.structuredContent;
}
async function fresh() {
  const contract = await invoke('readResource', {uri: 'tradecheck://contract'});
  check('contract resource is JSON with a declared rounding policy', JSON.parse(contract.contents[0].text).rounding === 'half up per invoice line');
  const sample = await tool('tradecheck_example', {});
  return clone(sample.data);
}
async function reconcile(data, limit = 1) {
  const findings = [];
  let offset = 0;
  let first;
  let pages = 0;
  while (offset !== null) {
    const page = await tool('tradecheck_reconcile', {data, offset, limit});
    first ??= page;
    check(`page ${pages}: payment remains unauthorized`, page.report.payment_authorized === false);
    check(`page ${pages}: summary remains stable`, JSON.stringify(page.report.summary) === JSON.stringify(first.report.summary));
    check(`page ${pages}: bounded findings`, page.report.findings.length <= limit);
    findings.push(...page.report.findings);
    const next = page.next_offset;
    check(`page ${pages}: pagination progresses`, next === null || next > offset);
    if (++pages > 100 || (next !== null && next <= offset)) throw new Error('Non-progressing or excessive pagination');
    offset = next;
  }
  check('all findings retrieved', findings.length === first.findings_total);
  return {...first.report, findings};
}
async function draft(data, report, language = 'en') {
  const result = await tool('tradecheck_supplier_draft', {data, language});
  const actionable = report.findings.filter(f => f.severity !== 'info');
  check('draft remains unsent', result.sent === false);
  check('draft reports the total reconciliation finding count', result.findings_total === report.findings.length);
  check('draft is bounded to twenty actionable items', result.draft_items === Math.min(20, actionable.length));
  for (const finding of actionable.slice(0, 20)) {
    check(`draft preserves ${finding.code}`, result.body.includes(`[${finding.code}]`));
    for (const ref of finding.refs) check(`draft preserves source ${ref}`, result.body.includes(ref));
  }
  return result;
}
function cleanPartial(data) {
  data.prior_invoices = [];
  data.invoice.lines[0].unit_price = '2.50';
  data.invoice.lines[0].line_total = '550.00';
  data.invoice.subtotal = '590.00';
  data.invoice.total = '590.00';
}

const cases = [
  {
    id: 'TC-01', title: 'Paginated sample and traceable supplier draft', expected: '44.00',
    question: 'Read tradecheck://contract and obtain a fresh tradecheck_example. Review this unmodified fictional invoice using tradecheck_reconcile with limit=1, fetching every page until next_offset is null, then prepare an English tradecheck_supplier_draft with the same data. What is the signed EUR price_variance from the complete report? Return only the decimal string, without a currency label.',
    async solve(d) {
      const r = await reconcile(d);
      check('sample has price and cumulative quantity exceptions', codes(r).join(',') === 'UNIT_PRICE_CHANGED,QUANTITY_OVER_ORDER');
      const quantity = r.findings.find(f => f.code === 'QUANTITY_OVER_ORDER');
      check('320 units are linked to the supplied prior evidence', quantity.message.includes('320.000') && quantity.refs.includes('fictional-prior.csv row 2'));
      await draft(d, r);
      return r.summary.price_variance;
    },
  },
  {
    id: 'TC-02', title: 'Unknown history and unreviewed extraction', expected: 'incomplete',
    question: 'Read the contract and obtain a fresh example. Remove all prior_invoices; set history_status to unknown and extraction_reviewed to false. Change invoice line 1 unit_price to 2.50 and line_total to 550.00, and set invoice subtotal and total to 590.00. Leave every other value unchanged. Retrieve all reconciliation pages and prepare a Chinese-introduction supplier draft using the same data. What exact report.status prevents treating this otherwise arithmetically consistent partial invoice as a completed review? Return only the status.',
    async solve(d) {
      cleanPartial(d); d.history_status = 'unknown'; d.extraction_reviewed = false;
      const r = await reconcile(d);
      check('both unverified extraction and missing history remain gaps', r.summary.gaps === 2 && codes(r).includes('HISTORY_UNKNOWN') && codes(r).includes('EXTRACTION_UNREVIEWED'));
      check('partial invoicing is informational', r.findings.find(f => f.code === 'PARTIAL_INVOICE')?.severity === 'info');
      const out = await draft(d, r, 'zh');
      check('Chinese introduction is present', out.subject.includes('请核对'));
      return r.status;
    },
  },
  {
    id: 'TC-03', title: 'Cross-currency comparison is blocked', expected: 'not_comparable',
    question: 'Read the contract and obtain a fresh example. Change only invoice.currency from EUR to USD; keep the PO and history in EUR. Retrieve all reconciliation pages and prepare an English supplier draft. What exact summary.price_variance value must be returned instead of converting the invoice or treating its nominal price difference as EUR? Return only that value.',
    async solve(d) {
      d.invoice.currency = 'USD';
      const r = await reconcile(d);
      check('currency discrepancy is explicit', codes(r).includes('CURRENCY_MISMATCH'));
      check('no cross-currency price finding is generated', !codes(r).includes('UNIT_PRICE_CHANGED'));
      await draft(d, r);
      return r.summary.price_variance;
    },
  },
  {
    id: 'TC-04', title: 'Supplier and PO identity block line comparison', expected: '0',
    question: 'Read the contract and obtain a fresh example. Change only invoice.po_id to PO-OTHER and invoice.supplier_id to SUP-OTHER. Retrieve every reconciliation page and prepare an English supplier draft from that same modified data. How many invoice lines does summary.matched_lines allow after these identity mismatches? Return only the integer.',
    async solve(d) {
      d.invoice.po_id = 'PO-OTHER'; d.invoice.supplier_id = 'SUP-OTHER';
      const r = await reconcile(d);
      check('both identity exceptions survive pagination', codes(r).includes('PO_REFERENCE_MISMATCH') && codes(r).includes('SUPPLIER_MISMATCH'));
      check('identity failure blocks price comparison', r.summary.price_variance === 'not_comparable');
      await draft(d, r);
      return String(r.summary.matched_lines);
    },
  },
  {
    id: 'TC-05', title: 'Exact item and unit identity', expected: '1',
    question: 'Read the contract and obtain a fresh example. First change only invoice line 1 uom from EA to BOX and review all findings. Then restore that uom to EA and change only the same line sku from BOTTLE-750 to bottle-750; review every page and prepare an English draft for this second variant. In the second variant, how many lines does summary.matched_lines report? Return only the integer; do not normalize SKU case or convert units.',
    async solve(d) {
      d.invoice.lines[0].uom = 'BOX';
      const units = await reconcile(d);
      check('unit mismatch is not converted', codes(units).includes('ITEM_OR_UNIT_MISMATCH') && units.summary.matched_lines === 1);
      d.invoice.lines[0].uom = 'EA'; d.invoice.lines[0].sku = 'bottle-750';
      const r = await reconcile(d);
      check('SKU comparison preserves case', codes(r).includes('ITEM_OR_UNIT_MISMATCH'));
      check('rejected item has no price or quantity comparison', !codes(r).includes('UNIT_PRICE_CHANGED') && !codes(r).includes('QUANTITY_OVER_ORDER'));
      await draft(d, r);
      return String(r.summary.matched_lines);
    },
  },
  {
    id: 'TC-06', title: 'Duplicate history exclusion and evidence regression', expected: '320.000',
    question: 'Read the contract and obtain a fresh example. Append a deep copy of prior_invoices[0], retaining its invoice ID INV-0070, but change the copied header source_ref to fictional-duplicate.csv row 1 and its line source_ref to fictional-duplicate.csv row 2 and quantity to 999. Keep the original prior invoice first. Retrieve all reconciliation pages, inspect which records were excluded, and prepare an English draft. What cumulative quantity is actually stated in QUANTITY_OVER_ORDER for PO line 10? Return only the decimal quantity with three places.',
    async solve(d) {
      const repeated = clone(d.prior_invoices[0]);
      repeated.source_ref = 'fictional-duplicate.csv row 1';
      repeated.lines[0].source_ref = 'fictional-duplicate.csv row 2'; repeated.lines[0].quantity = '999';
      d.prior_invoices.push(repeated);
      const r = await reconcile(d);
      check('duplicate history and cumulative uncertainty are explicit', codes(r).includes('DUPLICATE_HISTORY') && codes(r).includes('CUMULATIVE_CHECK_INCOMPLETE'));
      const over = r.findings.find(f => f.code === 'QUANTITY_OVER_ORDER');
      check('excluded duplicate is absent from cumulative evidence', !over.refs.includes('fictional-duplicate.csv row 2'), 'A 999-unit excluded duplicate must not appear as evidence for the 320-unit cumulative calculation.');
      const out = await draft(d, r);
      const sourceLine = out.body.split('\n').find((line, index, lines) => index > 0 && lines[index - 1].includes('[QUANTITY_OVER_ORDER]'));
      check('supplier quantity claim omits excluded evidence', sourceLine && !sourceLine.includes('fictional-duplicate.csv row 2'));
      return over.message.match(/quantity ([0-9]+\.[0-9]{3}) exceeds/)?.[1] ?? 'missing quantity';
    },
  },
  {
    id: 'TC-07', title: 'Current invoice already exists in history', expected: 'DUPLICATE_INVOICE',
    question: 'Read the contract and obtain a fresh example. Change only prior_invoices[0].id to INV-0088, the current invoice ID. Retrieve every reconciliation page and prepare an English supplier draft. Which exact finding code identifies the repeated current invoice for this supplier? Return only that code.',
    async solve(d) {
      d.prior_invoices[0].id = d.invoice.id;
      const r = await reconcile(d);
      check('the current invoice is not counted twice in quantity', !codes(r).includes('QUANTITY_OVER_ORDER') && r.findings.some(f => f.code === 'PARTIAL_INVOICE' && f.message.includes('220.000')));
      await draft(d, r);
      return r.findings.find(f => f.code === 'DUPLICATE_INVOICE')?.code ?? 'missing duplicate finding';
    },
  },
  {
    id: 'TC-08', title: 'Half-up rounding occurs per EUR line', expected: '0.02',
    question: 'Read the contract and obtain a fresh example. Remove prior_invoices. On both PO lines and both invoice lines set quantity to 1 and unit_price to 0.0050. Set each invoice line_total to 0.01 but set invoice subtotal and total to 0.01; keep charges and tax at 0.00. Retrieve all reconciliation pages and prepare an English draft. Then change invoice subtotal and total to 0.02 and reconcile again. What summary.computed_total is returned for the corrected invoice under per-line half-up rounding? Return only the two-place EUR amount.',
    async solve(d) {
      d.prior_invoices = [];
      for (const line of [...d.po.lines, ...d.invoice.lines]) {line.quantity = '1'; line.unit_price = '0.0050';}
      for (const line of d.invoice.lines) line.line_total = '0.01';
      d.invoice.subtotal = '0.01'; d.invoice.total = '0.01';
      const bad = await reconcile(d);
      check('aggregate-then-round subtotal is rejected', codes(bad).includes('SUBTOTAL_MISMATCH'));
      await draft(d, bad);
      d.invoice.subtotal = '0.02'; d.invoice.total = '0.02';
      const r = await reconcile(d);
      check('correct per-line rounding clears arithmetic exceptions', r.status === 'no_exceptions_in_scope');
      return r.summary.computed_total;
    },
  },
  {
    id: 'TC-09', title: 'JPY precision validation and half-up rounding', expected: '3',
    question: 'Read the contract and obtain a fresh example. Remove prior_invoices and keep only the first PO and invoice line. Change both currencies to JPY. Set the retained PO and invoice quantities to 1 and unit prices to 2.5000, and invoice charges and tax to 0. First set invoice line_total, subtotal and total to 2.50 and call reconcile to inspect validation. Then change those three totals to 3, reconcile every page, and prepare an English draft. What summary.computed_total does the valid corrected JPY report return? Return only the integer string.',
    async solve(d) {
      d.prior_invoices = []; d.po.lines = d.po.lines.slice(0, 1); d.invoice.lines = d.invoice.lines.slice(0, 1);
      d.po.currency = 'JPY'; d.invoice.currency = 'JPY';
      for (const line of [...d.po.lines, ...d.invoice.lines]) {line.quantity = '1'; line.unit_price = '2.5000';}
      d.invoice.charges = '0'; d.invoice.tax = '0'; d.invoice.lines[0].line_total = '2.50'; d.invoice.subtotal = '2.50'; d.invoice.total = '2.50';
      const invalid = await invoke('callTool', {name: 'tradecheck_reconcile', arguments: {data: d}});
      check('fractional JPY totals return an MCP tool error', invalid.isError === true && !invalid.structuredContent);
      d.invoice.lines[0].line_total = '3'; d.invoice.subtotal = '3'; d.invoice.total = '3';
      const r = await reconcile(d);
      check('correct integer JPY totals clear exceptions', r.status === 'no_exceptions_in_scope');
      await draft(d, r);
      return r.summary.computed_total;
    },
  },
  {
    id: 'TC-10', title: 'Positive quantities and signed price decreases', expected: '-44.00',
    question: 'Read the contract and obtain a fresh example. First set invoice line 1 quantity to 0 and call reconcile to inspect validation. Restore quantity to 220, change that line unit_price to 2.30 and line_total to 506.00, and change invoice subtotal and total to 546.00. Leave history and every other value unchanged. Retrieve all reconciliation pages and prepare an English draft. What signed summary.price_variance is returned for the valid price decrease? Return only the two-place decimal string, retaining its sign.',
    async solve(d) {
      d.invoice.lines[0].quantity = '0';
      const invalid = await invoke('callTool', {name: 'tradecheck_reconcile', arguments: {data: d}});
      check('zero quantity returns an MCP tool error', invalid.isError === true && !invalid.structuredContent);
      d.invoice.lines[0].quantity = '220'; d.invoice.lines[0].unit_price = '2.30'; d.invoice.lines[0].line_total = '506.00'; d.invoice.subtotal = '546.00'; d.invoice.total = '546.00';
      const r = await reconcile(d);
      check('price decrease remains a discrepancy', codes(r).includes('UNIT_PRICE_CHANGED'));
      await draft(d, r);
      return r.summary.price_variance;
    },
  },
];

let discovery;
try {
  await client.connect(new StdioClientTransport({command: process.execPath, args: ['dist/server.js'], cwd: root}));
  const tools = await client.listTools();
  const resources = await client.listResources();
  const prompts = await client.listPrompts();
  const prompt = await client.getPrompt({name: 'review_supplier_invoice', arguments: {}});
  discovery = {
    tools: tools.tools.map(t => ({name: t.name, annotations: t.annotations, inputFields: Object.keys(t.inputSchema.properties ?? {}), hasOutputSchema: Boolean(t.outputSchema)})),
    resources: resources.resources.map(r => r.uri), prompts: prompts.prompts.map(p => p.name), prompt,
  };
  for (const scenario of cases) {
    active = {id: scenario.id, title: scenario.title, expected: scenario.expected, checks: [], calls: []};
    try {
      const data = await fresh();
      active.observed = await scenario.solve(data);
      check('single answer matches independently specified expected value', active.observed === scenario.expected);
    } catch (error) {
      active.observed = 'evaluation error';
      check('scenario completed', false, String(error));
    }
    active.passed = active.checks.every(c => c.passed);
    results.push(active);
  }
} finally {
  await client.close();
}

const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<evaluation>\n' + cases.map(c => `  <qa_pair>\n    <question>${escapeXml(c.question)}</question>\n    <answer>${escapeXml(c.expected)}</answer>\n  </qa_pair>`).join('\n') + '\n</evaluation>\n';
const passed = results.filter(r => r.passed).length;
const answerPassed = results.filter(r => r.observed === r.expected).length;
const failures = results.flatMap(r => r.checks.filter(c => !c.passed).map(c => ({id: r.id, ...c})));
const summary = {kind: 'deterministic MCP protocol and tool-contract evaluation', generatedAt: new Date().toISOString(), scenarioCount: cases.length, answerPassed, scenarioPassed: passed, scenarioFailed: cases.length - passed, assertionCount: results.reduce((n, r) => n + r.checks.length, 0), failedAssertions: failures.length};
const table = results.map(r => `| ${r.id} | ${r.title} | \`${r.expected}\` | \`${r.observed}\` | ${r.calls.length} | ${r.passed ? 'PASS' : 'FAIL'} |`).join('\n');
const notes = failures.length ? failures.map(f => `- **${f.id}: ${f.name}.** ${f.detail}`).join('\n') : '- No outstanding failed assertions in this run.';
const md = `# TradeCheck MCP deterministic evaluation\n\nRun with \`npm run build && node scripts/evaluate.mjs\` from this directory. The evaluator uses the installed MCP client and stdio transport to launch \`dist/server.js\`. It reads the advertised tool schemas, resource, prompt and example; it does not import the implementation or existing tests. It makes no network requests or paid model calls and never sends supplier messages. Its only writes are these local evaluation artifacts.\n\nThis is **deterministic protocol and tool-contract evaluation**, not an independent LLM benchmark, OCR accuracy test, document-authenticity check or evidence that a host model follows the prompt. All source locators belong to fictional fixtures. The ten questions in \`evals.xml\` are independent, have a single exact answer, and require multiple MCP calls. Expected numeric answers were specified from the public contract and simple fixture arithmetic, then solved through MCP; they are not learned from implementation code.\n\n## Observed results\n\n- Run timestamp: ${summary.generatedAt}\n- Exact question answers: **${answerPassed}/${cases.length}**\n- Scenarios including contract assertions: **${passed}/${cases.length}**\n- Assertions: **${summary.assertionCount - failures.length}/${summary.assertionCount}**\n- Structured protocol outputs and assertion results: \`evaluation-results.json\`\n\n| ID | Buyer workflow | Expected answer | Observed answer | MCP calls | Contract result |\n| --- | --- | --- | --- | ---: | --- |\n${table}\n\n## Counterexamples and guardrails\n\nThe suite covers unknown history, unreviewed extraction, currency and identity mismatch, exact item and unit identifiers, duplicated history, a current invoice already present in history, per-line half-up rounding, JPY minor-unit validation, invalid zero quantities, and negative signed price variance. It retrieves all findings with a one-item page size and checks stable summaries, bounded pages and progress. Every returned report must preserve \`payment_authorized=false\`; each generated clarification must preserve \`sent=false\`, relevant diagnostic codes and supplied evidence locators.\n\n## Evidence-link defect discovered during black-box exploration\n\nThe initial MCP build excluded a duplicated prior invoice from the 320.000-unit cumulative calculation but still cited the excluded duplicate's row in \`QUANTITY_OVER_ORDER.refs\` and the supplier draft. Reproduction: append a copy of sample prior invoice INV-0070, change its quantity to 999, and give the copied row the locator \`fictional-duplicate.csv row 2\`. The valid arithmetic is 220 + 100 = 320, while the excluded row adds a misleading 999-unit citation. TC-06 keeps a regression assertion that the excluded locator must be absent from the quantity finding and its draft item. The duplicate-history warning may still cite the excluded document to explain its exclusion.\n\nCurrent failed assertions:\n\n${notes}\n\n## Limits of this evidence\n\nThese ten fixed scenarios exercise the tool boundary and buyer-facing invariants. They do not measure extraction from PDFs, understanding of natural-language invoices, prompt-injection resistance of a host LLM, tax correctness, supplier identity outside the submitted records, full-world duplicate coverage, currency conversion, payment authorization or production security. No independent model was evaluated and no real buyer data was used. A clean result remains limited to supplied two-way document data.\n`;
await writeFile(path.join(root, 'evals.xml'), xml);
await writeFile(path.join(root, 'evaluation-results.json'), JSON.stringify({summary, discovery, results}, null, 2) + '\n');
await writeFile(path.join(root, 'EVALUATION.md'), md);
console.log(JSON.stringify({...summary, failures}, null, 2));
if (failures.length) process.exitCode = 1;
