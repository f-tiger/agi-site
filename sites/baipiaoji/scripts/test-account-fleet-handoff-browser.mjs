#!/usr/bin/env node
// Production account generator + assets, with every HTTP request fulfilled or
// aborted locally. POSTs below are fixed synthetic fixtures, never real accounts,
// authorization, Google credentials, analytics, or delivery events.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildAccountPages } from './account-pages.mjs';

const moduleName = process.env.PLAYWRIGHT_MODULE || new URL('../../../tools/revenue-studio/node_modules/playwright/index.mjs', import.meta.url).href;
const { chromium } = await import(isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
const ORIGIN = 'https://baipiaoji.com';
const HOST = 'getecoback.com', STATE = 'S'.repeat(43), CHALLENGE = 'C'.repeat(43);
const PASSWORD = 'local handoff fixture password', RECOVERY = 'R'.repeat(43);
const USER = { id: 'handoff-fixture-a', username: 'Fixture_A', email: 'handoff-a@example.test', email_verified: false };
const OTHER = { id: 'handoff-fixture-b', username: 'Fixture_B', email: 'handoff-b@example.test', email_verified: true };
const browser = await chromium.launch({ headless: true,
  ...(process.env.PILOT_CHROMIUM ? { executablePath: process.env.PILOT_CHROMIUM } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const asset = name => readFileSync(new URL('../assets/' + name, import.meta.url), 'utf8');
const gis = `window.google={accounts:{id:{initialize(options){window.__handoffGIS=options;},renderButton(box){const b=document.createElement('button');b.type='button';b.textContent='Mock Google';box.append(b);}}}};`;
let scenarios = 0;

function htmlFor(lang) {
  let html;
  buildAccountPages({ LOCALE: { code: lang }, BASE: ORIGIN + (lang === 'en' ? '/en' : ''), esc: String, pushPage() {},
    write(name, text) { if (name === 'account.html') html = text; },
    layout({ body }) { return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;padding:12px;font:16px/1.5 system-ui;--line:#ddd;--card:#fff;--rule:#ddd;--ink-2:#444}.stage{margin:auto}button,a{overflow-wrap:anywhere}</style><link rel="stylesheet" href="/account.css"><script src="/account.js" defer></script></head><body>${body}</body></html>`; } });
  assert(html?.startsWith('<!doctype html>'));
  return html;
}

async function fixture({ lang = 'en', sourceLang = lang, fleet = true, user = null, loginUser = USER, google = false, readinessFailure = false, holdAuthorize = false, authorizeFailure = false, authorizeRedirect = null, holdMetadata = false, metadataFailure = false, duplicateParam = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const errors = [], unexpected = [], calls = [], navigations = [], entered = deferred(), release = deferred(), metadataEntered = deferred(), metadataRelease = deferred();
  let currentUser = user, failRead = readinessFailure, failAuthorize = authorizeFailure, failMetadata = metadataFailure;
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.addInitScript(() => {
    window.handoffFlowEvents = [];
    document.addEventListener('bpj-account-flow', event => window.handoffFlowEvents.push({ detail: event.detail, cancelable: event.cancelable }));
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.href === 'https://accounts.google.com/gsi/client') return route.fulfill({ contentType: 'text/javascript', body: gis });
    if (url.origin === 'https://' + HOST && url.pathname === '/auth/callback') {
      navigations.push(url.href);
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><main id="mock-callback">Local callback boundary only</main></body></html>' });
    }
    if (url.origin !== ORIGIN) { unexpected.push(url.origin + url.pathname); return route.abort('blockedbyclient'); }
    const json = (body, status = 200) => route.fulfill({ status, json: body });
    if (url.pathname.startsWith('/api/')) {
      const body = request.method() === 'POST' ? request.postDataJSON() : null;
      calls.push({ path: url.pathname, method: request.method(), body });
      if (url.pathname === '/api/account') {
        if (!body) return failRead ? json({ ok: false, error: 'unavailable' }, 503) : json({ ok: true, user: currentUser, favorites: [] });
        if (body.action === 'login') { currentUser = loginUser; return json({ ok: true, user: currentUser, favorites: [] }); }
        if (body.action === 'register') { currentUser = { ...USER, email: body.email, username: body.username }; return json({ ok: true, user: currentUser, favorites: [], recovery_code: RECOVERY }); }
        if (body.action === 'rotate_recovery') { assert.equal(body.account_id, currentUser?.id); return json({ ok: true, user: currentUser, favorites: [], recovery_code: RECOVERY }); }
        if (body.action === 'logout') { currentUser = null; return json({ ok: true, user: null, favorites: [] }); }
      }
      if (url.pathname === '/api/account-email' && !body) return json({ ok: true, available: false });
      if (url.pathname === '/api/account-google') {
        if (!body) return json({ ok: true, available: google });
        if (body.action === 'start') return json({ ok: true, client_id: 'local-fixture.apps.googleusercontent.com', nonce: 'N'.repeat(43) });
        if (body.action === 'credential') { currentUser = USER; return json({ ok: true, state: 'signed_in', user: USER, favorites: [] }); }
      }
      if (url.pathname === '/api/account-fleet') {
        if (!body) { metadataEntered.resolve(); if (holdMetadata) await metadataRelease.promise; return failMetadata ? json({ ok: false, error: 'unavailable' }, 503) : json({ ok: true, available: true, site: url.searchParams.get('host') === HOST ? 'EcoBack' : null }); }
        if (body.action === 'authorize') {
          entered.resolve(); if (holdAuthorize) await release.promise;
          if (failAuthorize) return json({ ok: false, error: 'unavailable' }, 503);
          return json({ ok: true, redirect: authorizeRedirect || `https://${HOST}/auth/callback?code=${'A'.repeat(43)}&state=${STATE}` });
        }
      }
      unexpected.push(request.method() + ' ' + url.pathname + ' ' + (body?.action || ''));
      return json({ ok: false, error: 'fixture_unexpected' }, 400);
    }
    if (['/account', '/en/account'].includes(url.pathname)) return route.fulfill({ contentType: 'text/html', body: htmlFor(lang) });
    if (['/account.js', '/account-fleet.js'].includes(url.pathname)) return route.fulfill({ contentType: 'text/javascript', body: asset(url.pathname.slice(1)) });
    if (url.pathname === '/account.css') return route.fulfill({ contentType: 'text/css', body: asset('account.css') });
    if (url.pathname.endsWith('/directory.json')) return json({ tools: [] });
    if (url.pathname.endsWith('/changes.json')) return json({ changes: [] });
    unexpected.push(request.method() + ' ' + url.pathname);
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  return { context, page, errors, unexpected, calls, navigations, entered, release, metadataEntered, metadataRelease,
    posts(action) { return calls.filter(call => call.body?.action === action); },
    setUser(value) { currentUser = value; }, setReadFailure(value) { failRead = value; }, setAuthorizeFailure(value) { failAuthorize = value; }, setMetadataFailure(value) { failMetadata = value; },
    async open(waitForIntent = true) {
      const url = new URL((lang === 'en' ? '/en' : '') + '/account', ORIGIN);
      url.searchParams.set('__ci', '1');
      if (fleet) { url.searchParams.set('fleet', HOST); url.searchParams.set('state', STATE); url.searchParams.set('challenge', CHALLENGE); url.searchParams.set('lang', sourceLang); }
      if (duplicateParam) url.searchParams.append(duplicateParam, url.searchParams.get(duplicateParam));
      await page.goto(url.href);
      await page.waitForFunction(() => window.bpjAccount?.state.loaded);
      await page.waitForFunction(() => document.getElementById('account-mail-availability').textContent.length > 0);
      if (fleet && waitForIntent) await page.locator('#account-fleet-confirm').waitFor();
    },
    async close() {
      release.resolve(); metadataRelease.resolve();
      assert.deepEqual(errors, [], 'No browser exceptions.');
      assert.deepEqual(unexpected, [], 'All requests must match the closed local fixture.');
      await context.close();
    }
  };
}

async function noGrant(f) {
  assert.equal(f.posts('authorize').length, 0, 'Identity/readiness changes cannot authorize a site.');
  assert.equal(f.navigations.length, 0, 'No callback navigation before explicit confirmation.');
  assert.equal(new URL(f.page.url()).origin, ORIGIN);
}
async function focusedConfirm(f) {
  await f.page.waitForFunction(() => document.activeElement?.id === 'account-fleet-confirm');
  assert.equal(await f.page.locator('#account-fleet-confirm').isDisabled(), false);
  const bounds = await f.page.locator('#account-fleet-confirm').boundingBox();
  assert(bounds && bounds.y >= 0 && bounds.y < 844, 'Successful sign-in brings the authorization action into view.');
}
async function login(f) {
  await f.page.locator('[data-account-tab="login"]').click();
  await f.page.locator('#login-email').fill(USER.email);
  await f.page.locator('#login-password').fill(PASSWORD);
  await f.page.locator('#account-login button[type="submit"]').click();
  await f.page.waitForFunction(() => window.bpjAccount?.state.user);
}

try {
  for (const lang of ['zh', 'en']) {
    const ordinary = await fixture({ lang, fleet: false });
    try {
      await ordinary.open();
      assert.equal(await ordinary.page.locator('#account-page-title').innerText(), lang === 'zh' ? '免费注册 BPJ' : 'Create your free BPJ account');
      assert.equal(await ordinary.page.locator('#account-fleet-confirm').count(), 0);
      await login(ordinary);
      assert.equal(await ordinary.page.locator('#account-page-title').innerText(), lang === 'zh' ? '我的工具与账户' : 'My tools and account');
      await noGrant(ordinary); scenarios++;
    } finally { await ordinary.close(); }

    const guest = await fixture({ lang });
    try {
      await guest.open();
      const title = await guest.page.locator('#account-page-title').innerText();
      assert.match(title, /EcoBack/);
      const panel = await guest.page.locator('#account-fleet-intent').innerText();
      const benefits = await guest.page.locator('.account-grid > aside').innerText();
      assert.match(panel, /EcoBack/);
      assert.match(benefits, lang === 'zh' ? /免费/ : /free/i);
      assert.match(benefits, lang === 'zh' ? /付费|会员/ : /paid|membership/i);
      assert.match(benefits, lang === 'zh' ? /不会自动保存|不会.*同步/ : /does not automatically save|does not.*sync/i);
      if (lang === 'en') assert(!/[\u3400-\u9fff]/.test(panel + title + benefits), '/en/account fleet copy remains English.');
      assert(await guest.page.locator('#account-fleet-confirm').isDisabled());
      await noGrant(guest);
      await login(guest);
      await focusedConfirm(guest);
      await noGrant(guest);
      await guest.page.locator('#account-fleet-confirm').click();
      await guest.page.locator('#mock-callback').waitFor();
      assert.equal(guest.posts('authorize').length, 1);
      assert.deepEqual(guest.posts('authorize')[0].body, { action: 'authorize', host: HOST, state: STATE, challenge: CHALLENGE, confirmed: true, account_id: USER.id });
      assert.equal(guest.navigations.length, 1); scenarios++;
    } finally { await guest.close(); }

    const registered = await fixture({ lang });
    try {
      await registered.open();
      await registered.page.locator('#register-email').fill(USER.email);
      await registered.page.locator('#register-username').fill(USER.username);
      await registered.page.locator('#register-password').fill(PASSWORD);
      await registered.page.locator('#account-consent').check();
      await registered.page.locator('#account-register button[type="submit"]').click();
      await registered.page.locator('#account-recovery').waitFor({ state: 'visible' });
      await registered.page.waitForFunction(() => window.bpjAccount?.state.user);
      assert.equal(await registered.page.locator('#account-recovery-code').innerText(), RECOVERY);
      assert(await registered.page.locator('#account-fleet-confirm').isDisabled(), 'Unconfirmed recovery code blocks the continuation action.');
      await noGrant(registered);
      await registered.page.evaluate(() => window.bpjAccount.refresh());
      assert(await registered.page.locator('#account-recovery').isVisible());
      assert(await registered.page.locator('#account-fleet-confirm').isDisabled(), 'Session refresh must not bypass recovery acknowledgement.');
      await noGrant(registered);
      await registered.page.locator('#account-recovery-continue').click();
      await focusedConfirm(registered);
      assert.equal(await registered.page.locator('#account-recovery').isVisible(), false);
      await noGrant(registered); scenarios++;
      const events = await registered.page.evaluate(() => window.handoffFlowEvents);
      assert(events.some(event => event.detail.stage === 'registered' && event.detail.recoveryPending));
      assert(events.some(event => event.detail.stage === 'recovery_confirmed' && event.cancelable && !event.detail.recoveryPending));
      for (const {detail} of events) {
        assert.deepEqual(Object.keys(detail).sort(), ['googleAvailable', 'mailAvailable', 'recoveryPending', 'stage']);
        assert(['render', 'signed_in', 'registered', 'recovery_confirmed', 'providers_ready'].includes(detail.stage));
        for (const key of ['googleAvailable', 'mailAvailable', 'recoveryPending']) assert.equal(typeof detail[key], 'boolean');
      }
    } finally { await registered.close(); }
  }

  const google = await fixture({ google: true });
  try {
    await google.open();
    await google.page.waitForFunction(() => !!window.__handoffGIS);
    await google.page.evaluate(() => window.__handoffGIS.callback({ credential: 'local-provider-fixture-only' }));
    await focusedConfirm(google);
    assert.equal(google.posts('credential').length, 1);
    await noGrant(google); scenarios++;
  } finally { await google.close(); }

  const rotated = await fixture({ user: USER });
  try {
    await rotated.open();
    await rotated.page.waitForFunction(() => !document.getElementById('account-fleet-confirm').disabled);
    await rotated.page.locator('#account-dashboard > details > summary').click();
    await rotated.page.locator('#rotate-password').fill(PASSWORD);
    await rotated.page.locator('#account-rotate-recovery button[type="submit"]').click();
    await rotated.page.locator('#account-recovery').waitFor({ state: 'visible' });
    assert.equal(await rotated.page.evaluate(() => window.bpjAccount.state.user.id), USER.id, 'Recovery rotation retains the same displayed identity.');
    assert.equal(rotated.posts('rotate_recovery').length, 1);
    assert(await rotated.page.locator('#account-fleet-confirm').isDisabled(), 'Rotating a recovery code immediately blocks handoff without relying on a session refresh.');
    await noGrant(rotated);
    await rotated.page.locator('#account-recovery-continue').click();
    await focusedConfirm(rotated);
    await noGrant(rotated); scenarios++;
  } finally { await rotated.close(); }

  const legacy = await fixture({ loginUser: { ...USER, email: null, legacy: true } });
  try {
    await legacy.open();
    await legacy.page.locator('[data-account-tab="login"]').click();
    await legacy.page.locator('#account-legacy-entry > summary').click();
    await legacy.page.locator('#legacy-username').fill(USER.username);
    await legacy.page.locator('#legacy-password').fill(PASSWORD);
    await legacy.page.locator('#account-legacy-login button[type="submit"]').click();
    await focusedConfirm(legacy);
    assert.equal(legacy.posts('login')[0].body.username, USER.username);
    assert.equal(await legacy.page.evaluate(() => window.bpjAccount.state.user.email), null);
    await noGrant(legacy); scenarios++;
  } finally { await legacy.close(); }

  for (const redirect of [
    `https://${HOST}:8443/auth/callback?code=fixture`,
    `https://fixture:invalid@${HOST}/auth/callback?code=fixture`,
    'https://unrelated.example.test/auth/callback?code=fixture'
  ]) {
    const invalid = await fixture({ user: USER, authorizeRedirect: redirect });
    try {
      await invalid.open();
      await invalid.page.waitForFunction(() => !document.getElementById('account-fleet-confirm').disabled);
      await invalid.page.locator('#account-fleet-confirm').click();
      await invalid.page.waitForFunction(() => /Could not return/.test(document.getElementById('account-fleet-status')?.textContent || ''));
      assert.equal(invalid.posts('authorize').length, 1);
      assert.equal(new URL(invalid.page.url()).origin, ORIGIN, 'Rejected redirect stays at the trusted account hub.');
      assert.equal(invalid.navigations.length, 0);
      assert.equal(await invalid.page.locator('#account-fleet-confirm').isDisabled(), false);
      scenarios++;
    } finally { await invalid.close(); }
  }

  const delayed = await fixture({ holdMetadata: true, sourceLang: 'de' });
  try {
    await delayed.open(false);
    await delayed.metadataEntered.promise;
    await login(delayed);
    await noGrant(delayed);
    assert.equal(await delayed.page.locator('#account-fleet-confirm').count(), 0, 'Unverified source metadata must not create an authorization action.');
    delayed.metadataRelease.resolve();
    await focusedConfirm(delayed);
    assert.equal(new URL(delayed.page.url()).pathname, '/en/account');
    const intent = await delayed.page.locator('#account-fleet-intent').innerText();
    assert.match(intent, /English.*German/s, 'Non-Chinese source language explains the English form and return language.');
    assert(!/[\u3400-\u9fff]/.test(intent));
    await delayed.page.evaluate(() => window.bpjAccount.refresh());
    assert.match(await delayed.page.locator('#account-page-title').innerText(), /EcoBack/);
    await noGrant(delayed); scenarios++;
  } finally { await delayed.close(); }

  for (const duplicateParam of ['fleet', 'state', 'challenge']) {
    const duplicate = await fixture({ user: USER, duplicateParam });
    try {
      await duplicate.open(false);
      await duplicate.page.locator('#account-fleet-error').waitFor({ state: 'visible' });
      assert.equal(await duplicate.page.locator('#account-fleet-confirm').count(), 0, 'Ambiguous parameters cannot create an authorization action.');
      assert(!/EcoBack/.test(await duplicate.page.locator('#account-page-title').innerText()), 'Unverified URL parameters cannot claim a source brand.');
      assert.equal(duplicate.calls.filter(call => call.path === '/api/account-fleet').length, 0, 'Duplicate ' + duplicateParam + ' is rejected before querying or authorizing a source.');
      await noGrant(duplicate); scenarios++;
    } finally { await duplicate.close(); }
  }

  const metadataRetry = await fixture({ user: USER, metadataFailure: true });
  try {
    await metadataRetry.open(false);
    await metadataRetry.page.locator('#account-fleet-error').waitFor({ state: 'visible' });
    assert.equal(await metadataRetry.page.locator('#account-fleet-confirm').count(), 0);
    assert(!/EcoBack/.test(await metadataRetry.page.locator('#account-page-title').innerText()));
    assert.equal(metadataRetry.calls.filter(call => call.path === '/api/account-fleet').length, 1);
    await noGrant(metadataRetry);
    metadataRetry.setMetadataFailure(false);
    await metadataRetry.page.locator('#account-fleet-retry').click();
    await metadataRetry.page.locator('#account-fleet-confirm').waitFor({ state: 'visible' });
    assert.equal(await metadataRetry.page.locator('#account-fleet-error').isVisible(), false);
    assert.match(await metadataRetry.page.locator('#account-page-title').innerText(), /EcoBack/);
    assert.equal(metadataRetry.calls.filter(call => call.path === '/api/account-fleet').length, 2, 'Metadata is only retried through the explicit retry action.');
    await noGrant(metadataRetry); scenarios++;
  } finally { await metadataRetry.close(); }

  const retry = await fixture({ user: USER, readinessFailure: true, authorizeFailure: true });
  try {
    await retry.open();
    assert(await retry.page.locator('#account-fleet-confirm').isDisabled());
    await noGrant(retry);
    retry.setReadFailure(false);
    await retry.page.locator('#account-retry').click();
    await retry.page.waitForFunction(() => window.bpjAccount?.state.user && !window.bpjAccount.state.error);
    await noGrant(retry);
    await retry.page.locator('#account-fleet-confirm').click();
    await retry.page.waitForFunction(() => !document.getElementById('account-fleet-confirm').disabled);
    assert.equal(retry.posts('authorize').length, 1);
    assert.equal(retry.navigations.length, 0);
    await retry.page.evaluate(() => window.bpjAccount.refresh());
    assert.equal(retry.posts('authorize').length, 1, 'Refreshing after failure must not silently retry authorization.');
    retry.setAuthorizeFailure(false);
    await retry.page.locator('#account-fleet-confirm').click();
    await retry.page.locator('#mock-callback').waitFor();
    assert.equal(retry.posts('authorize').length, 2); scenarios++;
  } finally { await retry.close(); }

  const changed = await fixture({ user: USER, holdAuthorize: true });
  try {
    await changed.open();
    await changed.page.waitForFunction(() => !document.getElementById('account-fleet-confirm').disabled);
    await noGrant(changed);
    await changed.page.locator('#account-fleet-confirm').click();
    await changed.entered.promise;
    changed.setUser(OTHER);
    await changed.page.evaluate(() => window.bpjAccount.refresh());
    await changed.page.waitForFunction(id => window.bpjAccount?.state.user?.id === id, OTHER.id);
    changed.release.resolve();
    await changed.page.waitForFunction(() => !document.getElementById('account-fleet-confirm').disabled);
    assert.equal(changed.posts('authorize').length, 1);
    assert.equal(changed.posts('authorize')[0].body.account_id, USER.id);
    assert.equal(changed.navigations.length, 0, 'An authorization response for a previous displayed identity cannot redirect.');
    assert.equal(new URL(changed.page.url()).origin, ORIGIN);
    await changed.page.locator('#account-fleet-confirm').click();
    await changed.page.locator('#mock-callback').waitFor();
    assert.equal(changed.posts('authorize').length, 2);
    assert.equal(changed.posts('authorize')[1].body.account_id, OTHER.id); scenarios++;
  } finally { await changed.close(); }

  console.log(`PASS fleet hub handoff: ${scenarios} local browser scenarios; bilingual source context, unchanged ordinary BPJ copy, password/Google success focus, recovery acknowledgement, explicit authorization, retries and pending identity changes. All HTTP and all synthetic POSTs were intercepted; no production or actual OAuth claim.`);
} finally { await browser.close(); }
