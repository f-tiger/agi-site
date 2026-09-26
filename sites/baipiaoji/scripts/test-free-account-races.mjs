import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the shipped browser script with a minimal DOM and controlled HTTP
// responses. No production data, browser profile, network or file writes are used.
// These checks exercise user-visible results under deliberately reordered replies.
const source = fs.readFileSync(new URL('../assets/account.js', import.meta.url), 'utf8');
const ALICE = {id: 'test-alice', username: 'alice', created: 1};
const BOB = {id: 'test-bob', username: 'bob', created: 2};
const CODE = 'A'.repeat(43);
const PASSWORD = 'test-only long password';
const passwordIds = [
  'register-password', 'register-confirm', 'login-password', 'recover-code',
  'recover-password', 'rotate-password', 'change-current', 'change-new', 'delete-password',
];
const tick = () => new Promise(resolve => setImmediate(resolve));
const reply = (body, status = 200) => ({ok: status >= 200 && status < 300, status, json: async () => structuredClone(body)});
const view = user => ({ok: true, user, favorites: []});
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}

async function harness(initialUser = null) {
  const nodes = new Map(), listeners = new Map(), postHandlers = new Map(), getHandlers = [];
  const requests = [];
  let serverUser = initialUser, serial = 0;

  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      id, value: '', checked: false, hidden: true, textContent: '', className: '',
      disabled: false, children: [], attributes: new Map(),
      querySelector(selector) {
        assert.equal(selector, 'button[type=submit]', 'Add deliberate DOM support for a new selector');
        return node(id + '-submit');
      },
      replaceChildren(...children) { this.children = children; },
      append(...children) { this.children.push(...children); },
      setAttribute(name, value) { this.attributes.set(name, value); },
      removeAttribute(name) { this.attributes.delete(name); },
      getAttribute(name) { return this.attributes.get(name) || ''; },
      scrollIntoView() {}, focus() {}, click() {},
    });
    return nodes.get(id);
  }
  const document = {
    documentElement: {lang: 'en'},
    querySelector(selector) {
      if (selector === '.bpj-account-page') return node('page');
      if (selector === '[data-account-gate]') return null;
      throw Error('Unsupported selector: ' + selector);
    },
    querySelectorAll(selector) {
      if (selector === '.bpj-account-page input[type=password]') return passwordIds.map(node);
      if (['[data-account-tab]', '.bpj-account,[data-free-account-nav]'].includes(selector)) return [];
      throw Error('Unsupported selector: ' + selector);
    },
    getElementById: node,
    createElement: tag => node('created-' + tag + '-' + (++serial)),
    addEventListener(name, fn) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(fn);
    },
    dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); },
  };
  const context = {
    document,
    window: {addEventListener() {}},
    location: {search: '', pathname: '/en/account', origin: 'https://baipiaoji.com'},
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    localStorage: {getItem() { return '[]'; }, setItem() {}},
    URL, URLSearchParams, Blob, setTimeout, clearTimeout,
    confirm: () => true,
    fetch: async (url, options = {}) => {
      if (url === '/api/account' && options.method === 'POST') {
        const body = JSON.parse(options.body);
        requests.push({method: 'POST', body});
        const queue = postHandlers.get(body.action);
        assert(queue?.length, 'Unexpected POST action: ' + body.action);
        return queue.shift()(body);
      }
      if (url === '/api/account' || url === '/api/account?readiness=1') {
        requests.push({method: 'GET'});
        return getHandlers.length ? getHandlers.shift()() : reply(view(serverUser));
      }
      if (url === '/en/directory.json') return reply({tools: []});
      if (url === '/en/changes.json') return reply({changes: []});
      throw Error('Unexpected fetch: ' + url);
    },
  };
  vm.runInNewContext(source, context, {filename: 'assets/account.js'});
  const account = context.window.bpjAccount;
  async function until(predicate, label) {
    for (let i = 0; i < 30; i++) {
      if (predicate()) return;
      await tick();
    }
    assert.fail('Unsettled controlled operation: ' + label);
  }
  await until(() => account.state.loaded, 'initial account read');
  await tick();

  function nextPost(action, handler) {
    if (!postHandlers.has(action)) postHandlers.set(action, []);
    postHandlers.get(action).push(handler);
  }
  function holdPost(action) {
    const pending = deferred();
    nextPost(action, () => pending.promise);
    return pending;
  }
  function holdGet() {
    const pending = deferred();
    getHandlers.push(() => pending.promise);
    return pending;
  }
  function submit(id) {
    const form = node(id);
    assert.equal(typeof form.onsubmit, 'function', 'Form handler exists: ' + id);
    form.onsubmit({preventDefault() {}, currentTarget: form});
    return until(() => node('account-status').textContent !== 'Working…', 'submit ' + id);
  }
  async function switchTo(user) {
    serverUser = user;
    await account.refresh();
    await tick();
  }
  function fillRegister() {
    node('register-username').value = 'Alice';
    node('register-password').value = PASSWORD;
    node('register-confirm').value = PASSWORD;
    node('account-consent').checked = true;
  }
  function fillRecover() {
    node('recover-username').value = 'alice';
    node('recover-code').value = 'Z'.repeat(43);
    node('recover-password').value = PASSWORD;
  }
  function noSecret(label) {
    assert.equal(node('account-recovery').hidden, true, label + ': receipt is hidden');
    assert.equal(node('account-recovery-code').textContent, '', label + ': plaintext is removed');
  }
  return {
    node, account, requests, until, submit, switchTo, nextPost, holdPost, holdGet,
    fillRegister, fillRecover, noSecret,
    setServerUser(user) { serverUser = user; },
    failNextGet() { getHandlers.push(() => reply({ok: false, error: 'unavailable'}, 503)); },
  };
}

const tests = [];
const test = (name, fn) => tests.push({name, fn});

test('late authenticated recovery-code receipt cannot enter another account view', async () => {
  const h = await harness(ALICE), pending = h.holdPost('rotate_recovery');
  h.node('rotate-password').value = PASSWORD;
  const completion = h.submit('account-rotate-recovery');
  assert.equal(h.requests.at(-1).body.account_id, ALICE.id);
  await h.switchTo(BOB);
  assert.equal(h.node('rotate-password').value, '', 'Account changes erase the old password');
  pending.resolve(reply({...view(ALICE), recovery_code: CODE}));
  await completion;
  assert.equal(h.account.state.user.id, BOB.id);
  h.noSecret('Alice reply delivered to Bob view');
  assert.match(h.node('account-status').textContent, /account changed/i);
});

for (const action of ['register', 'recover']) {
  test('late public ' + action + ' receipt cannot enter an authenticated account view', async () => {
    const h = await harness(), pending = h.holdPost(action);
    action === 'register' ? h.fillRegister() : h.fillRecover();
    const completion = h.submit('account-' + action);
    await h.switchTo(BOB);
    pending.resolve(reply({...view(action === 'register' ? ALICE : null), recovery_code: CODE}));
    await completion;
    assert.equal(h.account.state.user.id, BOB.id);
    h.noSecret('Late public ' + action);
  });
}

test('an intervening sign-in and sign-out cancels a pending public recovery receipt', async () => {
  const h = await harness(), pending = h.holdPost('recover');
  h.fillRecover();
  const completion = h.submit('account-recover');
  await h.switchTo(BOB);
  await h.switchTo(null);
  pending.resolve(reply({...view(null), recovery_code: CODE}));
  await completion;
  h.noSecret('Recovery reply after Bob signs out');
});

for (const target of [BOB, null]) {
  test('displayed recovery code and all password fields clear on ' + (target ? 'account switch' : 'sign-out'), async () => {
    const h = await harness(ALICE);
    h.nextPost('rotate_recovery', () => reply({...view(ALICE), recovery_code: CODE}));
    h.node('rotate-password').value = PASSWORD;
    await h.submit('account-rotate-recovery');
    assert.equal(h.node('account-recovery-code').textContent, CODE, 'Precondition: Alice code is visible');
    for (const id of passwordIds) h.node(id).value = 'Alice secret';
    await h.switchTo(target);
    h.noSecret('Previously displayed Alice code');
    for (const id of passwordIds) assert.equal(h.node(id).value, '', id + ' must be erased');
  });
}

for (const action of ['register', 'recover']) {
  test('successful ' + action + ' keeps its one-time code when the following GET fails', async () => {
    const h = await harness();
    action === 'register' ? h.fillRegister() : h.fillRecover();
    h.nextPost(action, () => {
      h.setServerUser(action === 'register' ? ALICE : null);
      return reply({...view(action === 'register' ? ALICE : null), recovery_code: CODE});
    });
    h.failNextGet();
    await h.submit('account-' + action);
    assert.equal(h.account.state.error, true, 'Post-operation refresh actually failed');
    assert.equal(h.node('account-recovery').hidden, false, 'Received code remains visible');
    assert.equal(h.node('account-recovery-code').textContent, CODE);
    await h.account.refresh();
    await tick();
    assert.equal(h.node('account-recovery-code').textContent, CODE, 'A later same-owner refresh retains the code');
    assert.equal(h.node('account-recovery').hidden, false);
  });
}

test('a stale GET neither overwrites the identity nor clears a newer pending GET', async () => {
  const h = await harness(ALICE), older = h.holdGet();
  const oldRead = h.account.refresh();
  h.nextPost('favorite_add', () => reply(view(ALICE)));
  await h.account.api('favorite_add', {slug: 'claude'});
  const newer = h.holdGet(), newRead = h.account.refresh();
  const readsBefore = h.requests.filter(r => r.method === 'GET').length;
  older.resolve(reply(view(ALICE)));
  await oldRead;
  const coalesced = h.account.refresh();
  assert.equal(h.requests.filter(r => r.method === 'GET').length, readsBefore, 'Old finally must not discard the new in-flight read');
  newer.resolve(reply(view(BOB)));
  await Promise.all([newRead, coalesced]);
  assert.equal(h.account.state.user.id, BOB.id);
});

test('outage disables account forms and retry restores them without losing identity', async () => {
 const h=await harness(ALICE);h.failNextGet();await assert.rejects(h.account.refresh());await tick();
 assert.equal(h.node('account-retry').hidden,false);
 for(const id of ['account-register','account-login','account-recover','account-rotate-recovery','account-change-password','account-delete'])assert.equal(h.node(id+'-submit').disabled,true);
 assert.match(h.node('account-status').textContent,/temporarily unavailable/);
 await h.node('account-retry').onclick();await tick();
 assert.equal(h.node('account-retry').hidden,true);assert.equal(h.node('account-login-submit').disabled,false);assert.equal(h.account.state.user.id,ALICE.id);
});

let failed = 0;
for (const {name, fn} of tests) {
  try {
    await fn();
    console.log('PASS ' + name);
  } catch (error) {
    failed++;
    console.error('FAIL ' + name + '\n' + error.stack);
  }
}
console.log(`${tests.length - failed}/${tests.length} controlled free-account race checks passed.`);
if (failed) process.exitCode = 1;
