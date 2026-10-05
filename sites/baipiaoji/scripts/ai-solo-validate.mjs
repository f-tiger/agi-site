#!/usr/bin/env node
// Facts enter through an editor/researcher, never through a successful HTTP GET.
import { validateClassification } from '../lib/ai-solo-taxonomy.mjs';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { safeSourceURL } from './ai-solo-refresh.mjs';

export const SCOPES = new Set(['solo', 'small-team', 'company', 'unknown']);
export const METRIC_KINDS = new Set(['revenue', 'profit', 'users', 'usage', 'downloads', 'cost', 'funding', 'valuation', 'paid-customers', 'retention', 'growth', 'other']);
export const EVIDENCE_KINDS = new Set(['founder-report', 'company-report', 'media-report', 'filing', 'independent-report']);
export const FAILURE_SUBTYPES = new Set(['shutdown', 'product-discontinued', 'pivot', 'commercial-setback']);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export function isoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
export function validateCases(cases, { today = new Date().toISOString().slice(0, 10), requireBoth = true } = {}) {
  const errors = [];
  if (!Array.isArray(cases)) return ['cases must be an array'];
  const ids = new Set(), outcomes = new Set();
  for (const [i, c] of cases.entries()) {
    const label = c?.id || 'case[' + i + ']';
    const fail = message => errors.push(label + ': ' + message);
    if (!c || typeof c !== 'object' || Array.isArray(c)) { fail('must be an object'); continue; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id || '')) fail('invalid id');
    if (ids.has(c.id)) fail('duplicate id'); ids.add(c.id);
    for (const field of ['name', 'category', 'categoryEn', 'summary', 'summaryEn', 'soloRelevance', 'soloRelevanceEn']) if (!nonempty(c[field])) fail(field + ' is required');
    if (!['success', 'failure'].includes(c.outcome)) fail('outcome must be success or failure'); else outcomes.add(c.outcome);
    if (!SCOPES.has(c.scope)) fail('scope must distinguish solo / small-team / company / unknown');
    if (c.outcome === 'failure' && !FAILURE_SUBTYPES.has(c.failureSubtype)) fail('failureSubtype is required');
    if (!isoDate(c.observedAt) || c.observedAt > today) fail('observedAt must be a valid nonfuture ISO date');
    if (c.features !== null && (!c.features || typeof c.features !== 'object' || Array.isArray(c.features) || Object.values(c.features).some(v => v !== null))) fail('unlabeled features must be null; inferred training scores are forbidden');
    if (Object.hasOwn(c, 'score') || Object.hasOwn(c, 'successProbability')) fail('case records cannot invent scores/probabilities');
    if (!Array.isArray(c.sources) || !c.sources.length) fail('at least one cited source is required');
    const urls = new Set();
    for (const [j, source] of (Array.isArray(c.sources) ? c.sources : []).entries()) {
      if (!source || typeof source !== 'object') { fail('sources[' + j + '] must be an object'); continue; }
      try { safeSourceURL(source.url); } catch { fail('sources[' + j + '] requires a safe public HTTPS URL'); }
      if (urls.has(source.url)) fail('duplicate source URL'); urls.add(source.url);
      for (const field of ['title', 'supports']) if (!nonempty(source[field])) fail('sources[' + j + '].' + field + ' is required');
      if (!EVIDENCE_KINDS.has(source.evidence)) fail('sources[' + j + '].evidence is invalid');
      if (source.publishedAt !== null && (!isoDate(source.publishedAt) || source.publishedAt > c.observedAt)) fail('sources[' + j + '].publishedAt must be null or a valid ISO date no later than observedAt');
    }
    for(const key of ['teamEvidence','businessModel','acquisition']) if(Object.hasOwn(c,key)){
      if(!nonempty(c[key])||!nonempty(c[key+'En']))fail(key+' requires bilingual text');
      if(!urls.has(c[key+'SourceUrl']))fail(key+'SourceUrl must reference a cited source');
    }
    if (!Array.isArray(c.metrics)) fail('metrics must be an array (unknown metrics use an empty array)');
    for (const [j, metric] of (Array.isArray(c.metrics) ? c.metrics : []).entries()) {
      if (!metric || typeof metric !== 'object') { fail('metrics[' + j + '] must be an object'); continue; }
      for (const field of ['label', 'period']) if (!nonempty(metric[field])) fail('metrics[' + j + '].' + field + ' is required');
      if (metric.value !== null && !nonempty(metric.value) && !(typeof metric.value === 'number' && Number.isFinite(metric.value))) fail('metrics[' + j + '].value must be text, a finite number, or null');
      if (!METRIC_KINDS.has(metric.kind)) fail('metrics[' + j + '].kind is invalid');
      if (metric.sourceUrl && !urls.has(metric.sourceUrl)) fail('metrics[' + j + '].sourceUrl must reference a cited source');
    }
    if (!Array.isArray(c.drivers) || !c.drivers.length) fail('at least one evidence-labeled driver is required');
    for (const [j, driver] of (Array.isArray(c.drivers) ? c.drivers : []).entries()) {
      if (!driver || typeof driver !== 'object') { fail('drivers[' + j + '] must be an object'); continue; }
      for (const field of ['text', 'textEn']) if (!nonempty(driver[field])) fail('drivers[' + j + '].' + field + ' is required');
      if (!['reported', 'inference'].includes(driver.kind)) fail('drivers[' + j + '].kind must distinguish report from inference');
      if (!urls.has(driver.sourceUrl)) fail('drivers[' + j + '].sourceUrl must reference a cited source');
    }
    if (!Array.isArray(c.risks) || !c.risks.length || c.risks.some(r => !nonempty(r))) fail('risks must contain explicit limitations');
    if (!Array.isArray(c.risksEn) || c.risksEn.length !== c.risks?.length || c.risksEn.some(r => !nonempty(r))) fail('risksEn must match risks');
  }
  if (requireBoth && (!outcomes.has('success') || !outcomes.has('failure'))) errors.push('catalog must include success and failure; no fixed case count is required');
  return errors;
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const cases = JSON.parse(readFileSync(join(root, 'data', 'ai-solo-cases.json'), 'utf8'));
  const errors = validateCases(cases);
  try { validateClassification(cases); } catch (err) { errors.push(err.message); }
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('AI Solo case schema: ' + cases.length + ' cases, citations, dates and uncertainty labels valid.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) { try { main(); } catch { console.error('AI Solo case schema: data unavailable or invalid JSON.'); process.exitCode = 1; } }
