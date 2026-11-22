import assert from 'node:assert/strict';
import test from 'node:test';
import {handleInvestmentContact} from './server.mjs';

const origin = 'https://agiscorecard.com';
const endpoint = origin + '/api/investment-contact';
const requestId = '8e09a448-c898-4d2c-923c-711ece8b6751';
const from = 'Fleet Intake Fixture <sender@example.test>';
const recipient = 'private-recipient@example.test';
const key = 're_test_this_is_a_fixture_not_a_secret';
const cfIP = '192.0.2.19';
const cleanLead = {
  project: 'BPJ',
  type: 'PARTNERSHIP',
  name: 'Example & 同行',
  replyEmail: 'investor+fixture@example.test',
  proposal: 'Discuss a public pilot?\r\nUse <this> & next.',
  website: 'https://example.test/?a=b&c=d',
  timing: 'Next quarter',
  requestId,
  websiteCheck: '',
};

function post(body = cleanLead, {url = endpoint, headers = {}} = {}) {
  const all = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Origin': origin,
    'CF-Connecting-IP': cfIP,
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
  });
  for (const [name, value] of Object.entries(headers)) {
    if (value === null) all.delete(name);
    else all.set(name, value);
  }
  const payload = typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body);
  return new Request(url, {method: 'POST', headers: all, body: payload});
}

function fixture({decisions = [], provider = () => Response.json({id: 'provider-message-fixture'})} = {}) {
  const rateKeys = [];
  const mails = [];
  const env = {
    FLEET_INVESTMENT_RECIPIENT: recipient,
    FLEET_INVESTMENT_FROM: from,
    FLEET_INVESTMENT_RESEND_API_KEY: key,
    INVESTMENT_CONTACT_RATE_LIMITER: {async limit({key: rateKey}) {
      rateKeys.push(rateKey);
      return {success: decisions[rateKeys.length - 1] ?? true};
    }},
  };
  const fetcher = async (url, options) => {
    mails.push({url, options, data: JSON.parse(options.body)});
    return provider();
  };
  return {env, rateKeys, mails, run: req => handleInvestmentContact(req, env, {fetcher})};
}

async function expect(response, status, body) {
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), body);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
}

test('readiness only discloses whether valid server-side bindings are available', async () => {
  const f = fixture();
  await expect(await f.run(new Request(endpoint)), 200, {ready: true});
  const get = () => new Request(endpoint);
  for (const patch of [
    {FLEET_INVESTMENT_RECIPIENT: ''},
    {FLEET_INVESTMENT_RECIPIENT: 'first@example.test, second@example.test'},
    {FLEET_INVESTMENT_RECIPIENT: 'first@example.test\r\nBcc: second@example.test'},
    {FLEET_INVESTMENT_FROM: 'bad sender <first@example.test> <second@example.test>'},
    {FLEET_INVESTMENT_FROM: 'From \n injected <first@example.test>'},
    {FLEET_INVESTMENT_RESEND_API_KEY: 'invalid-key'},
    {INVESTMENT_CONTACT_RATE_LIMITER: null},
  ]) {
    await expect(await handleInvestmentContact(get(), {...f.env, ...patch}), 200, {ready: false});
  }
  assert.equal(f.mails.length, 0);
  assert.equal(f.rateKeys.length, 0);
});

test('valid form data goes only to the fixed mailbox as plain text with one reply address', async () => {
  const f = fixture();
  const req = post(cleanLead, {url: endpoint + '?recipient=spoofed%40example.test'});
  await expect(await f.run(req), 202, {ok: true});
  assert.equal(f.mails.length, 1);
  const [{url, options, data}] = f.mails;
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(options.method, 'POST');
  assert.equal(options.redirect, 'manual');
  assert.ok(options.signal instanceof AbortSignal);
  assert.equal(options.headers.Authorization, 'Bearer ' + key);
  assert.equal(options.headers['Idempotency-Key'], 'fleet-investment-contact-v1/' + requestId);
  assert.deepEqual(Object.keys(data).sort(), ['from', 'reply_to', 'subject', 'text', 'to']);
  assert.equal(data.from, from);
  assert.deepEqual(data.to, [recipient]);
  assert.equal(data.reply_to, cleanLead.replyEmail);
  assert.equal(data.subject, 'AGIFLEETINVESTV1 [BPJ] [PARTNERSHIP]');
  assert.match(data.text, /Example & 同行/);
  assert.match(data.text, /Discuss a public pilot\?\nUse <this> & next\./);
  assert.match(data.text, /https:\/\/example\.test\/\?a=b&c=d/);
  assert.ok(!data.text.includes(cleanLead.replyEmail));
  assert.ok(!data.text.includes(cfIP));
  assert.match(f.rateKeys[0], /^investment-contact:client:[0-9a-f]{32}$/u);
  assert.equal(f.rateKeys[1], 'investment-contact:all');
});

test('host and browser-origin checks reject cross-site submissions before rate limiting', async () => {
  const f = fixture();
  for (const options of [
    {url: 'https://www.agiscorecard.com/api/investment-contact'},
    {url: 'http://agiscorecard.com/api/investment-contact'},
    {headers: {'Origin': null}},
    {headers: {'Origin': 'https://baipiaoji.com'}},
    {headers: {'Sec-Fetch-Site': 'cross-site'}},
    {headers: {'Sec-Fetch-Mode': 'navigate'}},
    {headers: {'Sec-Fetch-Dest': 'document'}},
  ]) {
    await expect(await f.run(post(cleanLead, options)), 403, {ok: false, error: 'forbidden'});
  }
  const method = await f.run(new Request(endpoint, {method: 'OPTIONS'}));
  assert.equal(method.headers.get('Allow'), 'GET, POST');
  await expect(method, 405, {ok: false, error: 'invalid'});
  await expect(await f.run(post(cleanLead, {headers: {'Content-Type': 'text/plain'}})), 400, {ok: false, error: 'invalid'});
  assert.equal(f.mails.length, 0);
  assert.equal(f.rateKeys.length, 0);
});

test('invalid enums, recipient overrides, unsafe fields and bounded malformed bodies fail closed', async () => {
  const f = fixture();
  const invalid = [
    {...cleanLead, project: 'agi'},
    {...cleanLead, type: 'SPONSORSHIP'},
    {...cleanLead, requestId: 'not-uuid'},
    {...cleanLead, websiteCheck: 'filled'},
    {...cleanLead, replyEmail: 'one@example.test\r\nBcc: two@example.test'},
    {...cleanLead, replyEmail: 'Name <one@example.test>'},
    {...cleanLead, replyEmail: 'one@example.test,two@example.test'},
    {...cleanLead, replyEmail: 'name..dots@example.test'},
    {...cleanLead, name: ' \t '},
    {...cleanLead, name: '2030\r\nNew field'},
    {...cleanLead, proposal: ' '},
    {...cleanLead, proposal: 'A'.repeat(601)},
    {...cleanLead, website: 'javascript:alert(0)'},
    {...cleanLead, website: 'https://user:password@example.test'},
    {...cleanLead, website: 'https:example.test'},
    {...cleanLead, timing: 'Two\r\nLines'},
    {...cleanLead, from: 'override@example.test'},
    {...cleanLead, to: 'override@example.test'},
    {...cleanLead, cc: 'override@example.test'},
    {...cleanLead, bcc: 'override@example.test'},
    {...cleanLead, headers: {'Reply-To': 'override@example.test'}},
    [],
    '  ]',
    JSON.stringify(cleanLead) + ' '.repeat(8192),
    new Uint8Array([123, 255, 125]),
  ];
  for (const lead of invalid) await expect(await f.run(post(lead)), 400, {ok: false, error: 'invalid'});
  await expect(await f.run(post(cleanLead, {headers: {'Content-Length': '8193'}})), 400, {ok: false, error: 'invalid'});
  assert.equal(f.mails.length, 0);
  assert.equal(f.rateKeys.length, 0);
});

test('missing verified IP, missing configuration or malformed limiter response fails closed', async () => {
  const f = fixture();
  for (const ip of [null, 'unknown', '999.0.0.1', '192.0.2.1, 192.0.2.2', '2001:db8::zzz']) {
    await expect(await f.run(post(cleanLead, {headers: {'CF-Connecting-IP': ip, 'X-Forwarded-For': cfIP}})),
      503, {ok: false, error: 'unavailable'});
  }
  const notConfigured = await handleInvestmentContact(post(), {...f.env, FLEET_INVESTMENT_RECIPIENT: ''}, {
    fetcher: () => { throw Error('No provider call while unavailable.'); },
  });
  await expect(notConfigured, 503, {ok: false, error: 'unavailable'});
  assert.equal(f.rateKeys.length, 0);
  f.env.INVESTMENT_CONTACT_RATE_LIMITER.limit = async () => ({success: 'true'});
  await expect(await f.run(post()), 503, {ok: false, error: 'unavailable'});
  assert.equal(f.mails.length, 0);
});

test('both per-client and shared rate limits guard the mail provider', async () => {
  const perClient = fixture({decisions: [false]});
  await expect(await perClient.run(post()), 429, {ok: false, error: 'rate_limited'});
  assert.equal(perClient.rateKeys.length, 1);
  assert.equal(perClient.mails.length, 0);

  const shared = fixture({decisions: [true, false]});
  await expect(await shared.run(post()), 429, {ok: false, error: 'rate_limited'});
  assert.equal(shared.rateKeys.at(-1), 'investment-contact:all');
  assert.equal(shared.mails.length, 0);
});

test('canonical IPv6 rate key is stable and settled request identity is preserved on retry', async () => {
  const f = fixture();
  const {website, timing, ...required} = cleanLead;
  for (const ip of ['2001:0DB8:0:0:0:0:0:42', '2001:db8::42']) {
    await expect(await f.run(post(required, {
      headers: {'CF-Connecting-IP': ip, 'Sec-Fetch-Site': null, 'Sec-Fetch-Mode': null, 'Sec-Fetch-Dest': null},
    })), 202, {ok: true});
  }
  assert.equal(f.rateKeys[0], f.rateKeys[2]);
  assert.ok(!f.rateKeys[0].includes('2001:db8'));
  assert.equal(f.mails[0].options.headers['Idempotency-Key'], f.mails[1].options.headers['Idempotency-Key']);
  assert.doesNotMatch(f.mails[0].data.text, /Public website|Preferred timing/);
});

test('Resend errors, redirects and malformed receipts never count as acceptance', async () => {
  for (const provider of [
    () => { throw Error('Do not disclose provider details.'); },
    () => Response.redirect('https://example.test/untrusted-hop', 302),
    () => Response.json({error: 'Do not disclose provider details.'}, {status: 429}),
    () => Response.json({id: ''}),
    () => Response.json({id: 'text space'}),
    () => new Response('not JSON', {status: 200}),
  ]) {
    const f = fixture({provider});
    await expect(await f.run(post()), 502, {ok: false, error: 'delivery_failed'});
    assert.equal(f.mails.length, 1);
  }
});
