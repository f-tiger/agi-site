// A separate, private expression-of-interest queue. No order or payment is created.
export const INQUIRY_LIMITS = Object.freeze({bytes:4096,perNetworkDay:5,perDay:100,contactDays:30,cancellationDays:30,rateHours:48});
export const SKU_COUNTS = Object.freeze(['1-10','11-50']);
export const BLOCKERS = Object.freeze(['facts','english','images','handoff']);
const APPLICATION_KEYS = new Set(['email','shopUrl','skuCount','blocker','consent','website','requestId','receipt','qa']);
const WITHDRAW_KEYS = new Set(['action','requestId','receipt']);
export const validId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const validReceipt = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value,keys) => object(value) && Object.keys(value).every(key => keys.has(key));

export function application(body) {
  if (!exactKeys(body,APPLICATION_KEYS) || !validId(body.requestId) || !validReceipt(body.receipt) || body.consent !== true || typeof body.qa !== 'boolean') throw Error('invalid');
  if (typeof body.email !== 'string' || body.email.length > 254 || /[\u0000-\u001f\u007f]/.test(body.email)) throw Error('invalid');
  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email) || !SKU_COUNTS.includes(body.skuCount) || !BLOCKERS.includes(body.blocker)) throw Error('invalid');
  if (body.website !== undefined && (typeof body.website !== 'string' || body.website.length > 300)) throw Error('invalid');
  if (body.shopUrl !== undefined && (typeof body.shopUrl !== 'string' || body.shopUrl.length > 300)) throw Error('invalid');
  let shopUrl = (body.shopUrl || '').trim();
  if (shopUrl) {
    if (/[\u0000-\u0020\u007f]/.test(shopUrl)) throw Error('invalid');
    let url; try {url = new URL(shopUrl);} catch {throw Error('invalid');}
    // The shop link is not fetched. Reject credentials and token-bearing URLs
    // instead of silently storing accidental credentials in a contact queue.
    if (!['https:','http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.href.length > 300) throw Error('invalid');
    shopUrl = url.href;
  }
  return {email,shopUrl,skuCount:body.skuCount,blocker:body.blocker,consent:true,requestId:body.requestId.toLowerCase(),receipt:body.receipt,qa:body.qa,honeypot:Boolean(body.website?.trim())};
}

export function withdrawal(body) {
  if (!exactKeys(body,WITHDRAW_KEYS) || body.action !== 'withdraw' || !validId(body.requestId) || !validReceipt(body.receipt)) throw Error('invalid');
  return {requestId:body.requestId.toLowerCase(),receipt:body.receipt};
}

export async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),byte => byte.toString(16).padStart(2,'0')).join('');
}

export function payloadDigest(value) {
  return digest(JSON.stringify([value.email,value.shopUrl,value.skuCount,value.blocker,true]));
}

export function isQA(request) {
  const url = new URL(request.url);
  return ['qa','__qa','__ci','ci','__probe'].some(key => url.searchParams.has(key)) || /bpj-ci|selftest|playwright|headless/i.test(request.headers.get('User-Agent') || '');
}

export async function smallJSON(request) {
  const declared = request.headers.get('Content-Length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > INQUIRY_LIMITS.bytes)) throw Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw Error('invalid');
  const chunks = []; let total = 0;
  try {
    for (;;) {
      const {value,done} = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > INQUIRY_LIMITS.bytes) {await reader.cancel();throw Error('size');}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  const bytes = new Uint8Array(total); let offset = 0;
  for (const part of chunks) {bytes.set(part,offset);offset += part.byteLength;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}

export async function ensure(db,now) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS listing_inquiries (
      request_id TEXT PRIMARY KEY, receipt_hash TEXT NOT NULL, payload_hash TEXT NOT NULL,
      email TEXT NOT NULL, shop_url TEXT NOT NULL, sku_count TEXT NOT NULL, blocker TEXT NOT NULL,
      consent INTEGER NOT NULL CHECK(consent=1), qa INTEGER NOT NULL DEFAULT 0 CHECK(qa=0),
      status TEXT NOT NULL DEFAULT 'new', created INTEGER NOT NULL, expires INTEGER NOT NULL)`),
    db.prepare('CREATE INDEX IF NOT EXISTS listing_inquiries_expires ON listing_inquiries(expires)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS listing_inquiry_rates (
      request_id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL, rate_key TEXT NOT NULL,
      day TEXT NOT NULL, expires INTEGER NOT NULL)`),
    db.prepare('CREATE INDEX IF NOT EXISTS listing_inquiry_rates_key ON listing_inquiry_rates(rate_key)'),
    db.prepare('CREATE INDEX IF NOT EXISTS listing_inquiry_rates_day ON listing_inquiry_rates(day)'),
    db.prepare('CREATE INDEX IF NOT EXISTS listing_inquiry_rates_expires ON listing_inquiry_rates(expires)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS listing_inquiry_cancellations (
      request_id TEXT NOT NULL, receipt_hash TEXT NOT NULL, expires INTEGER NOT NULL,
      PRIMARY KEY(request_id,receipt_hash))`),
    db.prepare('CREATE INDEX IF NOT EXISTS listing_inquiry_cancellations_expires ON listing_inquiry_cancellations(expires)'),
  ]);
  // No new timer: expiry cleanup happens on the next valid mutation. Public
  // capability GET is deliberately read-only. Do not promise a timed purge.
  await db.batch([
    db.prepare('DELETE FROM listing_inquiries WHERE expires <= ?').bind(now),
    db.prepare('DELETE FROM listing_inquiry_rates WHERE expires <= ?').bind(now),
    db.prepare('DELETE FROM listing_inquiry_cancellations WHERE expires <= ?').bind(now),
  ]);
}

export async function saveInquiry(db,value,ip,now=Date.now()) {
  await ensure(db,now);
  const receiptHash = await digest(value.receipt), payloadHash = await payloadDigest(value);
  const prior = await db.prepare('SELECT receipt_hash,payload_hash FROM listing_inquiries WHERE request_id=?').bind(value.requestId).first();
  if (prior) return prior.receipt_hash === receiptHash && prior.payload_hash === payloadHash ? 'saved' : 'conflict';
  const day = new Date(now).toISOString().slice(0,10);
  // Daily one-way network pseudonym, not an anonymity claim. Neither raw IP nor
  // this pseudonym is copied into the contact record or browser analytics.
  const rateKey = await digest('bpj-listing-rate-v1|'+day+'|'+ip);
  const attempt = crypto.randomUUID();
  // D1 batch is transactional. The attempt nonce makes only the transaction
  // that inserted a rate reservation eligible to create its contact record.
  // Withdrawal leaves the short-lived reservation, so delete/reapply cannot
  // bypass the cap. Both counts use indexes and are bounded to <=100/day.
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO listing_inquiry_rates(request_id,attempt_id,rate_key,day,expires)
      SELECT ?,?,?,?,? WHERE
      NOT EXISTS(SELECT 1 FROM listing_inquiry_cancellations WHERE request_id=? AND receipt_hash=?) AND
      (SELECT COUNT(*) FROM listing_inquiry_rates WHERE rate_key=?) < ? AND
      (SELECT COUNT(*) FROM listing_inquiry_rates WHERE day=?) < ?`)
      .bind(value.requestId,attempt,rateKey,day,now+INQUIRY_LIMITS.rateHours*3600000,value.requestId,receiptHash,rateKey,INQUIRY_LIMITS.perNetworkDay,day,INQUIRY_LIMITS.perDay),
    db.prepare(`INSERT OR IGNORE INTO listing_inquiries(request_id,receipt_hash,payload_hash,email,shop_url,sku_count,blocker,consent,qa,status,created,expires)
      SELECT ?,?,?,?,?,?,?,1,0,'new',?,? WHERE
      EXISTS(SELECT 1 FROM listing_inquiry_rates WHERE request_id=? AND attempt_id=?) AND
      NOT EXISTS(SELECT 1 FROM listing_inquiry_cancellations WHERE request_id=? AND receipt_hash=?)`)
      .bind(value.requestId,receiptHash,payloadHash,value.email,value.shopUrl,value.skuCount,value.blocker,now,now+INQUIRY_LIMITS.contactDays*86400000,value.requestId,attempt,value.requestId,receiptHash),
  ]);
  const saved = await db.prepare('SELECT receipt_hash,payload_hash FROM listing_inquiries WHERE request_id=?').bind(value.requestId).first();
  if (!saved) {
    const cancelled = await db.prepare('SELECT request_id FROM listing_inquiry_cancellations WHERE request_id=? AND receipt_hash=?').bind(value.requestId,receiptHash).first();
    return cancelled ? 'conflict' : 'capacity';
  }
  return saved.receipt_hash === receiptHash && saved.payload_hash === payloadHash ? 'saved' : 'conflict';
}

export async function withdrawInquiry(db,value,now=Date.now(),ip='unknown') {
  await ensure(db,now);
  const receiptHash = await digest(value.receipt),day = new Date(now).toISOString().slice(0,10);
  const rateKey = await digest('bpj-listing-rate-v1|'+day+'|'+ip),attempt = crypto.randomUUID();
  const reservation = 'cancel/'+value.requestId+'/'+receiptHash;
  // A withdrawal may arrive before its original POST. Persist a proof-bound
  // cancellation before deleting contacts; otherwise a late POST resurrects
  // the contact after the UI has reported successful withdrawal. Cancellation
  // prevents matching delayed submissions for 30 days, not indefinitely.
  // Unknown withdrawals share intake rate limits; genuine existing-contact
  // withdrawals and repeat cancellations remain available when caps are full.
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO listing_inquiry_rates(request_id,attempt_id,rate_key,day,expires)
      SELECT ?,?,?,?,? WHERE
      NOT EXISTS(SELECT 1 FROM listing_inquiry_cancellations WHERE request_id=? AND receipt_hash=?) AND
      NOT EXISTS(SELECT 1 FROM listing_inquiries WHERE request_id=? AND receipt_hash=?) AND
      (SELECT COUNT(*) FROM listing_inquiry_rates WHERE rate_key=?) < ? AND
      (SELECT COUNT(*) FROM listing_inquiry_rates WHERE day=?) < ?`)
      .bind(reservation,attempt,rateKey,day,now+INQUIRY_LIMITS.rateHours*3600000,value.requestId,receiptHash,value.requestId,receiptHash,rateKey,INQUIRY_LIMITS.perNetworkDay,day,INQUIRY_LIMITS.perDay),
    db.prepare(`INSERT OR IGNORE INTO listing_inquiry_cancellations(request_id,receipt_hash,expires)
      SELECT ?,?,? WHERE
      EXISTS(SELECT 1 FROM listing_inquiries WHERE request_id=? AND receipt_hash=?) OR
      EXISTS(SELECT 1 FROM listing_inquiry_rates WHERE request_id=? AND attempt_id=?)`)
      .bind(value.requestId,receiptHash,now+INQUIRY_LIMITS.cancellationDays*86400000,value.requestId,receiptHash,reservation,attempt),
    db.prepare(`DELETE FROM listing_inquiries WHERE request_id=? AND receipt_hash=? AND
      EXISTS(SELECT 1 FROM listing_inquiry_cancellations WHERE request_id=? AND receipt_hash=?)`)
      .bind(value.requestId,receiptHash,value.requestId,receiptHash),
  ]);
  const cancelled = await db.prepare('SELECT request_id FROM listing_inquiry_cancellations WHERE request_id=? AND receipt_hash=?').bind(value.requestId,receiptHash).first();
  // Never report a successful withdrawal when an unknown, in-flight POST was
  // not protected. A success still reveals no existing-contact information.
  return cancelled ? 'withdrawn' : 'capacity';
}
