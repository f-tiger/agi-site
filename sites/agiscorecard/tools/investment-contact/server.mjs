const SITE_ORIGIN = 'https://agiscorecard.com';
const MAIL_ENDPOINT = 'https://api.resend.com/emails';
const MAX_BODY_BYTES = 8192;
const PROJECTS = new Set(['AGI', 'BPJ', 'ECO', 'TDS']);
const TYPES = new Set(['INVESTMENT', 'PARTNERSHIP']);
const INPUT_FIELDS = new Set(['project', 'type', 'name', 'replyEmail', 'proposal', 'website', 'timing', 'requestId', 'websiteCheck']);
const SINGLE_LINE_CONTROLS = /[\u0000-\u001f\u007f-\u009f]/u;
const MULTILINE_CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;
const MAILBOX = /^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~.]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$/u;
const REQUEST_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;
const encoder = new TextEncoder();

function reply(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...headers,
    },
  });
}

const failure = (error, status, headers) => reply({ok: false, error}, status, headers);

function mailbox(value) {
  if (typeof value !== 'string' || value.length > 254 || SINGLE_LINE_CONTROLS.test(value)) return '';
  const address = value.trim();
  if (!MAILBOX.test(address)) return '';
  const local = address.split('@', 1)[0];
  return local.startsWith('.') || local.endsWith('.') || local.includes('..') ? '' : address;
}

function mailConfig(env) {
  const recipient = mailbox(env?.FLEET_INVESTMENT_RECIPIENT);
  const from = env?.FLEET_INVESTMENT_FROM;
  const key = env?.FLEET_INVESTMENT_RESEND_API_KEY;
  const limiter = env?.INVESTMENT_CONTACT_RATE_LIMITER;
  if (!recipient || typeof from !== 'string' || from.length > 330 || SINGLE_LINE_CONTROLS.test(from) ||
      typeof key !== 'string' || !/^re_[A-Za-z0-9_-]{1,250}$/u.test(key) || typeof limiter?.limit !== 'function') return null;

  const sender = from.trim();
  const decorated = /^[^<>,"]{1,100}<([^<>]+)>$/u.exec(sender);
  if (!mailbox(decorated?.[1] || sender)) return null;
  return {recipient, sender, key, limiter};
}

async function boundedJson(request) {
  if (!request.body || Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', {fatal: true});
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, {stream: true});
    }
    return JSON.parse(text + decoder.decode());
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function textField(value, maxLength, controls = SINGLE_LINE_CONTROLS) {
  if (typeof value !== 'string' || value.length > maxLength || controls.test(value)) return null;
  return value.trim();
}

function websiteValid(value) {
  if (!/^https?:\/\//iu.test(value) || value.includes('\\')) return false;
  try {
    const url = new URL(value);
    return Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function submission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !INPUT_FIELDS.has(key)) ||
      !PROJECTS.has(body.project) || !TYPES.has(body.type) ||
      body.websiteCheck !== '' || typeof body.requestId !== 'string' || !REQUEST_ID.test(body.requestId)) return null;

  const name = textField(body.name, 100);
  const replyEmail = mailbox(body.replyEmail);
  const proposal = textField(body.proposal, 600, MULTILINE_CONTROLS);
  const website = textField(Object.hasOwn(body, 'website') ? body.website : '', 180);
  const timing = textField(Object.hasOwn(body, 'timing') ? body.timing : '', 100);
  if (!name || !replyEmail || !proposal || website === null || timing === null || (website && !websiteValid(website))) return null;
  return {
    project: body.project,
    type: body.type,
    requestId: body.requestId.toLowerCase(),
    name,
    replyEmail,
    proposal: proposal.replace(/\r\n?/gu, '\n'),
    website,
    timing,
  };
}

function cloudflareIP(request) {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip || !/^[a-fA-F0-9:.]{2,64}$/u.test(ip)) return '';
  if (!ip.includes(':')) {
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(ip)) return '';
    const octets = ip.split('.').map(Number);
    return octets.some(octet => octet > 255) ? '' : octets.join('.');
  }
  try {
    return new URL('http://[' + ip + ']/').hostname;
  } catch {
    return '';
  }
}

async function clientKey(ip, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode('investment-contact ip/v1\n' + ip)));
  const fingerprint = Array.from(bytes.subarray(0, 16), byte => byte.toString(16).padStart(2, '0')).join('');
  return 'investment-contact:client:' + fingerprint;
}

async function limitReached(config, ip) {
  const keys = [await clientKey(ip, config.key), 'investment-contact:all'];
  for (const key of keys) {
    const {success} = await config.limiter.limit({key});
    if (typeof success !== 'boolean') throw Error('Unexpected rate-limiter response.');
    if (!success) return true;
  }
  return false;
}

function sameOriginPost(request) {
  const site = request.headers.get('Sec-Fetch-Site');
  const mode = request.headers.get('Sec-Fetch-Mode');
  const destination = request.headers.get('Sec-Fetch-Dest');
  return request.headers.get('Origin') === SITE_ORIGIN &&
    (site === null || site === 'same-origin') &&
    (mode === null || mode === 'cors' || mode === 'same-origin') &&
    (destination === null || destination === 'empty');
}

async function deliver(fetcher, config, lead) {
  const fields = [
    ['Project', lead.project],
    ['Interest', lead.type],
    ['Name or organization', lead.name],
    ['Proposal', lead.proposal],
    ['Public website', lead.website],
    ['Preferred timing', lead.timing],
  ];
  const response = await fetcher(MAIL_ENDPOINT, {
    method: 'POST',
    redirect: 'manual',
    signal: AbortSignal.timeout(8000),
    headers: {
      'Authorization': 'Bearer ' + config.key,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'fleet-investment-contact-v1/' + lead.requestId,
    },
    body: JSON.stringify({
      from: config.sender,
      to: [config.recipient],
      reply_to: lead.replyEmail,
      subject: 'AGIFLEETINVESTV1 [' + lead.project + '] [' + lead.type + ']',
      text: fields.filter(([, value]) => value).map(([label, value]) => label + '\n' + value).join('\n\n'),
    }),
  });
  if (!response.ok) return false;
  const providerResponse = await response.json();
  return typeof providerResponse?.id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/u.test(providerResponse.id);
}

export async function handleInvestmentContact(request, env, {fetcher = fetch} = {}) {
  if (new URL(request.url).origin !== SITE_ORIGIN) return failure('forbidden', 403);
  const config = mailConfig(env);
  if (request.method === 'GET') return reply({ready: Boolean(config)});
  if (request.method !== 'POST') return failure('invalid', 405, {'Allow': 'GET, POST'});
  if (!sameOriginPost(request)) return failure('forbidden', 403);
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get('Content-Type') || '')) return failure('invalid', 400);

  const lead = submission(await boundedJson(request));
  if (!lead) return failure('invalid', 400);
  const ip = cloudflareIP(request);
  if (!config || !ip) return failure('unavailable', 503);

  try {
    if (await limitReached(config, ip)) return failure('rate_limited', 429);
  } catch {
    return failure('unavailable', 503);
  }
  try {
    if (await deliver(fetcher, config, lead)) return reply({ok: true}, 202);
  } catch {
    return failure('delivery_failed', 502);
  }
  return failure('delivery_failed', 502);
}
