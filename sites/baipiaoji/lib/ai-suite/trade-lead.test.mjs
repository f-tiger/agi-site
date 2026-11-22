import assert from 'node:assert/strict';
import test from 'node:test';
import {executeSuiteTool} from './runtime.mjs';
import {tools} from './trade-lead.mjs';

const [tool] = tools;
const lead = {
  company: 'Acme Manufacturing', country: 'DE', product: 'recycled mailers', signal: 'open_tender',
  source_url: 'https://acme.example/tender', source_reviewed: true, requested_units: 200, response_by: '2026-11-22',
};
const run = (records, overrides = {}) => executeSuiteTool(tool, {
  ...tool.example, ...overrides, leads: JSON.stringify(records),
});

test('CSV fixture ranks the source-reviewed buyer and retains duplicate row references', () => {
  const report = executeSuiteTool(tool, tool.example);
  assert.deepEqual(report.counts, {follow_up:1, verify:1, low_fit:1});
  assert.equal(report.inputRows, 4);
  assert.equal(report.uniqueCompanies, 3);
  assert.equal(report.duplicateRows, 1);
  assert.equal(report.ranked[0].company, 'Sample Buyer A');
  assert.equal(report.ranked[0].score, 100);
  assert.equal(report.ranked[0].sourceReview, 'reviewed_by_user');
  assert.deepEqual(report.ranked[0].sourceRows, [1, 2]);
});

test('a strong lead still needs a live deadline, matching market and viable quantity', () => {
  const report = run([
    {...lead, company:'Current buyer'},
    {...lead, company:'Tender with missing deadline', response_by:null},
    {...lead, company:'Awaiting source check', source_reviewed:false},
    {...lead, company:'Directory lead', signal:'directory'},
    {...lead, company:'Insufficient quantity', requested_units:199},
    {...lead, company:'Expired tender', response_by:'2026-11-21'},
    {...lead, company:'Different market', country:'CA'},
    {...lead, company:'Different category', product:'PLASTIC PALLETS'},
  ]);
  assert.deepEqual(report.counts, {follow_up:1, verify:3, low_fit:4});
  assert.equal(report.ranked[0].company, 'Current buyer');
  assert(report.ranked.find(lead => lead.company === 'Expired tender').reasons.includes('response_date_passed'));
  assert(report.ranked.find(lead => lead.company === 'Insufficient quantity').reasons.includes('below_minimum'));
});

test('conflicting records stay in review and each retained value belongs to one input row', () => {
  const report = run([
    lead,
    {...lead, company:'ＡＣＭＥ  manufacturing', country:'de', requested_units:150},
  ]);
  assert.equal(report.uniqueCompanies, 1);
  assert.equal(report.ranked[0].priority, 'verify');
  assert.equal(report.ranked[0].requestedUnits, 200);
  assert.deepEqual(report.ranked[0].sourceRows, [1, 2]);
  assert(report.ranked[0].reasons.includes('duplicate_details_differ'));
});

test('incomplete company data remains visible and blanks do not score as evidence', () => {
  const report = run([{company:'Local lead', country:'de', product:'Recycled   Mailers'}]);
  assert.equal(report.ranked[0].score, 50);
  assert.equal(report.ranked[0].priority, 'verify');
  assert.equal(report.ranked[0].sourceUrl, null);
  assert(report.ranked[0].reasons.includes('no_source'));
  assert(report.ranked[0].reasons.includes('quantity_missing'));
});

test('invalid dates, unexpected contact fields and non-web source URLs produce row-specific errors', () => {
  assert.throws(() => run([{...lead, response_by:'2026-02-30'}]), /Lead 1: response_by/);
  assert.throws(() => run([{...lead, contact_email:'example@example.test'}]), /Lead 1: Use company records/);
  for (const source_url of [
    'javascript:alert(1)', 'https://secret@example.test/', 'https:example.com/private',
    'http://localhost:8080/private', 'http://0x7f000001/private', 'https://orders.office.local/private',
  ]) {
    assert.throws(() => run([{...lead, source_url}]), /Lead 1: source_url/);
  }
  assert.throws(() => run([{...lead, source_url:''}]), /Lead 1: source_reviewed requires/);
  assert.throws(() => run([]), /1 to 100 lead records/);
});

test('CSV supports quoted business fields and rejects unexpected extra columns', () => {
  const report = executeSuiteTool(tool, {
    ...tool.example,
    leads:'country,product,company\r\nDE,recycled mailers,"Example Buyer, GmbH"\r\n',
  });
  assert.equal(report.ranked[0].company, 'Example Buyer, GmbH');
  assert.equal(report.ranked[0].priority, 'verify');
  assert.throws(() => executeSuiteTool(tool, {
    ...tool.example, leads:'company,country,product,contact_email\nExample,DE,recycled mailers,x@example.test',
  }), /CSV header/);
});
