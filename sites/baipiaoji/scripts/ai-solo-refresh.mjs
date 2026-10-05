#!/usr/bin/env node
// Existing daily schedule only. 5 cases × 2 sources × 8 seconds / 2 workers
// = at most ~40 seconds per run (~20 extra minutes/month); normal runs take seconds.
// HTTP availability/content drift is NOT fact verification. Never rewrite cases,
// outcome, metrics or observedAt. Persist URL status and hashes, never page text.
import https from 'node:https';
import http from 'node:http';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { publicIP, safeURL } from './catalog-network.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LIMITS = Object.freeze({ cases: 5, sources: 2, concurrency: 2, timeout: 8000, bytes: 128 * 1024, queue: 200 });
const sha = value => createHash('sha256').update(value).digest('hex');
let proxyConfigured = false;
export const emptyState = () => ({ lastRun: null, status: 'not-run', checkedSources: 0, queue: [], sources: {}, cursor: 0, errors: [] });

export function safeSourceURL(value, trustedHosts) {
  const u = safeURL(value);
  if (trustedHosts && !trustedHosts.has(u.hostname)) throw new Error('untrusted-host');
  return u;
}

// Page chrome, scripts and whitespace should not turn every run into a review.
export function readableText(html) {
  let text = String(html).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|svg|noscript|template|header|footer|nav)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  const main = text.match(/<(main|article)\b[^>]*>([\s\S]*?)<\/\1\s*>/i);
  if (main) text = main[2];
  return text.replace(/<[^>]+>/g, ' ').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, h, d) => {
    const n = parseInt(h || d, h ? 16 : 10); return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
  }).replace(/&(nbsp|amp|lt|gt|quot|apos);/gi, (_, name) => ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[name.toLowerCase()]).replace(/\s+/g, ' ').trim();
}

export function fingerprint(text) {
  // Segment CJK characters too: whitespace token counts badly undercount Chinese.
  const words = text.toLowerCase().replace(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])/gu, ' $1 ').match(/[\p{L}\p{N}]+/gu) || [];
  const weights = Array(64).fill(0);
  for (const word of new Set(words)) {
    const n = BigInt('0x' + sha(word).slice(0, 16));
    for (let bit = 0; bit < 64; bit++) weights[bit] += n & (1n << BigInt(bit)) ? 1 : -1;
  }
  const simhash = weights.reduce((n, w, bit) => w > 0 ? n | (1n << BigInt(bit)) : n, 0n).toString(16).padStart(16, '0');
  return { hash: sha(text), simhash, words: words.length };
}

export function significantChange(previous, next) {
  if (!previous?.hash || previous.hash === next.hash) return false;
  // Tiny pages cannot support useful similarity; these remain an availability check.
  if (previous.words < 30 || next.words < 30) return false;
  if (Math.abs(next.words - previous.words) / Math.max(previous.words, 1) >= 0.15) return true;
  let bits = BigInt('0x' + previous.simhash) ^ BigInt('0x' + next.simhash), distance = 0;
  while (bits) { distance++; bits &= bits - 1n; }
  return distance >= 8;
}

function requestPinned(u, options) {
  return new Promise((accept, reject) => {
    const req = https.get(u, {
      headers: options.headers,
      lookup: (_host, opts, cb) => opts.all ? cb(null, options.addresses) : cb(null, options.addresses[0].address, options.addresses[0].family),
    }, res => {
      const chunks = []; let bytes = 0;
      if (res.statusCode < 200 || res.statusCode >= 300) { res.destroy(); accept({ status: res.statusCode, location: res.headers.location, body: '', type: res.headers['content-type'] || '' }); return; }
      res.on('data', chunk => { bytes += chunk.length; if (bytes > options.maxBytes) req.destroy(new Error('body-limit')); else chunks.push(chunk); });
      res.on('error', reject);
      res.on('end', () => accept({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8'), type: res.headers['content-type'] || '' }));
    });
    const timer = setTimeout(() => req.destroy(new Error('timeout')), options.remaining);
    req.on('close', () => clearTimeout(timer)); req.on('error', reject);
  });
}

// fetchImpl/resolve injection is solely for deterministic offline tests. Direct
// production requests pin public DNS in HTTPS lookup. Managed environments retain
// their configured proxy via Node's built-in EnvHttpProxyAgent; redirects and each
// target's DNS still pass checks, and targets are existing editorial citations.
export async function fetchSource(value, { trustedHosts, fetchImpl, resolve = lookup, timeout = LIMITS.timeout, maxBytes = LIMITS.bytes } = {}) {
  if (!fetchImpl && (process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy)) {
    if (typeof http.setGlobalProxyFromEnv !== 'function') throw new Error('proxy-runtime-unavailable');
    if (!proxyConfigured) { http.setGlobalProxyFromEnv(process.env); proxyConfigured = true; }
    fetchImpl = globalThis.fetch;
  }
  const start = Date.now(); let u = safeSourceURL(value, trustedHosts);
  const deadline = async promise => {
    let timer;
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), Math.max(1, timeout - (Date.now() - start))); })]); }
    finally { clearTimeout(timer); }
  };
  for (let redirects = 0; redirects <= 3; redirects++) {
    const host = u.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await deadline(resolve(host, { all: true }));
    if (!addresses.length || addresses.some(a => !publicIP(a.address))) throw new Error('unsafe-dns');
    const headers = { 'user-agent': 'baipiaoji-ai-solo-source-monitor/1.0 (+https://baipiaoji.com/ai-solo/)', accept: 'text/html,text/plain;q=0.9' };
    let res;
    if (fetchImpl) {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), Math.max(1, timeout - (Date.now() - start)));
      try {
        const response = await deadline(fetchImpl(u.href, { redirect: 'manual', headers, signal: ctl.signal }));
        res = { status: response.status, location: response.headers.get('location'), type: response.headers.get('content-type') || '', body: '' };
        if (response.status >= 200 && response.status < 300) {
          const reader = response.body?.getReader(); const chunks = []; let size = 0;
          if (reader) { try { while (true) { const { value: chunk, done } = await deadline(reader.read()); if (done) break; size += chunk.byteLength; if (size > maxBytes) throw new Error('body-limit'); chunks.push(Buffer.from(chunk)); } } finally { await reader.cancel().catch(() => {}); } }
          res.body = Buffer.concat(chunks).toString('utf8');
        } else await response.body?.cancel();
      } finally { clearTimeout(timer); }
    } else res = await requestPinned(u, { addresses, headers, remaining: Math.max(1, timeout - (Date.now() - start)), maxBytes });
    if ([301, 302, 303, 307, 308].includes(res.status) && res.location) {
      if (redirects === 3) throw new Error('redirect-limit');
      u = safeSourceURL(new URL(res.location, u).href, trustedHosts); continue;
    }
    if (res.status < 200 || res.status >= 300) return { status: 'unreachable', http: res.status, url: u.href };
    if (res.type && !/^(text\/html|text\/plain|application\/xhtml\+xml)\b/i.test(res.type)) return { status: 'unreadable', http: res.status, url: u.href };
    const text = readableText(res.body);
    if (text.length < 120) return { status: 'unreadable', http: res.status, url: u.href };
    return { status: 'available', http: res.status, url: u.href, ...fingerprint(text) };
  }
}

export function pickBatch(cases, cursor = 0, max = LIMITS.cases) {
  if (!cases.length) return { cases: [], cursor: 0 };
  const start = Number.isInteger(cursor) && cursor >= 0 ? cursor % cases.length : 0;
  const count = Math.min(LIMITS.cases, Math.max(1, max), cases.length);
  return { cases: Array.from({ length: count }, (_, i) => cases[(start + i) % cases.length]), cursor: (start + count) % cases.length };
}

export function applySourceCheck(previous, result, now) {
  const next = { ...previous, lastAttempt: now, status: result.status, http: result.http ?? null };
  if (result.status !== 'available') { next.consecutiveChange = 0; return next; }
  next.lastSuccess = now; next.lastHash = result.hash;
  if (!previous?.hash) return { ...next, ...fingerprintState(result), consecutiveChange: 0, status: 'baseline' };
  if (significantChange(previous, result)) {
    next.consecutiveChange = previous.lastHash === result.hash ? Math.min(2, (previous.consecutiveChange || 0) + 1) : 1;
    next.status = next.consecutiveChange >= 2 ? 'review-required' : 'change-pending';
  } else next.consecutiveChange = 0;
  return next;
}
const fingerprintState = result => ({ hash: result.hash, simhash: result.simhash, words: result.words });
const compactError = e => /unsafe|untrusted/.test(e.message) ? 'unsafe-source' : /proxy-runtime/.test(e.message) ? 'proxy-runtime-unavailable' : /timeout|abort/i.test(e.message) ? 'timeout' : /body-limit/.test(e.message) ? 'body-limit' : 'network-error';

export async function refreshCases({ cases, state = emptyState(), now = new Date().toISOString(), fetchImpl, resolve, max = LIMITS.cases } = {}) {
  const next = structuredClone({ ...emptyState(), ...state });
  next.lastRun = now; next.checkedSources = 0; next.errors = [];
  const trustedHosts = new Set(cases.flatMap(c => (c.sources || []).map(s => { try { return safeSourceURL(s.url).hostname; } catch { return ''; } })).filter(Boolean));
  const batch = pickBatch(cases, next.cursor, max); next.cursor = batch.cursor;
  const tasks = batch.cases.flatMap(c => (c.sources || []).slice(0, LIMITS.sources).map(s => ({ caseId: c.id, sourceUrl: s.url })));
  const results = []; let index = 0;
  await Promise.all(Array.from({ length: Math.min(LIMITS.concurrency, tasks.length) }, async () => {
    while (index < tasks.length) {
      const i = index++, task = tasks[i];
      try { results[i] = { ...task, result: await fetchSource(task.sourceUrl, { trustedHosts, fetchImpl, resolve }) }; }
      catch (e) { results[i] = { ...task, result: { status: 'unreachable' }, error: compactError(e) }; }
    }
  }));
  const queue = new Map((next.queue || []).slice(-LIMITS.queue).map(q => [q.caseId + '|' + q.sourceUrl + '|' + q.reason, q]));
  for (const item of results) {
    next.checkedSources++;
    const key = item.caseId + '|' + item.sourceUrl;
    next.sources[key] = { caseId: item.caseId, sourceUrl: item.sourceUrl, ...applySourceCheck(next.sources[key], item.result, now) };
    const record = next.sources[key];
    if (item.error) next.errors.push({ caseId: item.caseId, sourceUrl: item.sourceUrl, reason: item.error });
    const reason = record.status === 'review-required' ? 'source-content-changed' : ['unreachable', 'unreadable'].includes(record.status) ? 'source-unreachable' : null;
    if (reason) queue.set(key + '|' + reason, { caseId: item.caseId, reason, sourceUrl: item.sourceUrl, lastChecked: now });
    // Availability recovery removes only its availability alert. It cannot clear
    // a content review or claim that facts have been checked by an editor.
    else if (record.lastSuccess === now) queue.delete(key + '|source-unreachable');
  }
  const liveKeys = new Set(cases.flatMap(c => (c.sources || []).map(s => c.id + '|' + s.url)));
  next.sources = Object.fromEntries(Object.entries(next.sources).filter(([key]) => liveKeys.has(key)));
  next.queue = [...queue.values()].filter(q => liveKeys.has(q.caseId + '|' + q.sourceUrl)).slice(-LIMITS.queue);
  next.status = results.some(r => ['unreachable', 'unreadable'].includes(r.result.status)) ? 'degraded' : 'ok';
  return next;
}

async function main() {
  if (process.argv.includes('--selftest')) { await import('./test-ai-solo-refresh.mjs'); return; }
  const caseFile = join(ROOT, 'data', 'ai-solo-cases.json'), stateFile = join(ROOT, 'data', 'ai-solo-refresh.json');
  const cases = JSON.parse(readFileSync(caseFile, 'utf8'));
  const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : emptyState();
  const next = await refreshCases({ cases, state });
  if (!process.argv.includes('--dry-run')) { writeFileSync(stateFile + '.tmp', JSON.stringify(next, null, 2) + '\n'); renameSync(stateFile + '.tmp', stateFile); }
  console.log(JSON.stringify({ status: next.status, checkedSources: next.checkedSources, queued: next.queue.length, cursor: next.cursor, errors: next.errors.length, factsUpdated: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolvePath(process.argv[1])).href) main().catch(e => { console.error('AI Solo source monitor:', compactError(e)); process.exitCode = 1; });
