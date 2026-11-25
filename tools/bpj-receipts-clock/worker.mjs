const origin = 'https://baipiaoji.com';
const hour = 60 * 60_000;
const retryDelay = 15 * 60_000;
const firstFollowup = 90_000;
const key = 'status';
const statusInit = {
  enabled: false, generation: 0, observeNext: false,
  runs: 0, succeeded: 0, lastRunAt: null, lastSuccessAt: null, lastError: null,
};

const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
});

function authenticated(request, secret) {
  if (!/^[a-f0-9]{64}$/.test(secret || '')) return false;
  const proof = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization') || '')?.[1];
  if (!proof) return false;
  let difference = 0;
  for (let index = 0; index < 64; index++) difference |= secret.charCodeAt(index) ^ proof.charCodeAt(index);
  return difference === 0;
}

class ReceiptError extends Error {}

export async function verifyReceipts(secret, request = fetch) {
  if (typeof secret !== 'string' || secret.length < 32) throw new ReceiptError('watch_secret_missing');
  const deadline = Date.now() + 180_000;

  async function read(path, method, failure, accepts) {
    const budget = deadline - Date.now();
    if (budget <= 0) throw new ReceiptError('verification_timeout');
    const headers = { 'X-Probe': '1' };
    if (method === 'POST') headers.Authorization = `Bearer ${secret}`;
    try {
      const response = await request(`${origin}${path}`, {
        method, headers, redirect: 'manual', cache: 'no-store',
        signal: AbortSignal.timeout(Math.min(45_000, budget)),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.ok === true && accepts(data)) return data;
      }
    } catch {
      // The public status only retains fixed stages, never RPC bodies or order details.
    }
    throw new ReceiptError(failure);
  }

  for (let batch = 0; batch < 7; batch++) {
    const ads = await read('/api/ad-web3-watch', 'POST', 'ad_receipts_unavailable',
      data => Number.isSafeInteger(data.processed) && data.processed >= 0 && data.processed <= 3);
    if (ads.processed < 3) break;
  }
  await read('/api/ads?doctor=1', 'GET', 'ad_readiness_unavailable',
    data => data.selling === true && data.rails?.wallet === true && data.web3?.watch_healthy === true);
  for (let batch = 0; batch < 7; batch++) {
    const members = await read('/api/bpj-member-recovery', 'POST', 'member_receipts_unavailable',
      data => data.mode === 'receipts-only' && data.site === 'bpj' && data.ready === true && (data.processed === 0 || data.processed === 1));
    if (members.processed === 0) break;
  }
  await read('/api/member?__ci=1', 'GET', 'member_readiness_unavailable',
    data => data.site === 'bpj' && data.ready === true);
}

export class ReceiptClock {
  constructor(state, env) {
    this.storage = state.storage;
    this.env = env;
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    return this.storage.transaction(async transaction => {
      const state = await transaction.get(key) || { ...statusInit };
      if (path === '/start' && !state.enabled) {
        state.enabled = true;
        state.generation++;
        state.observeNext = true;
        await transaction.setAlarm(Date.now() + 1_000);
        await transaction.put(key, state);
      } else if (path === '/pause' && state.enabled) {
        state.enabled = false;
        state.generation++;
        await transaction.deleteAlarm();
        await transaction.put(key, state);
      }
      const { generation, observeNext, ...status } = state;
      return json({ ok: true, ...status, scheduledAt: await transaction.getAlarm() });
    });
  }

  async alarm() {
    const generation = await this.storage.transaction(async transaction => {
      const state = await transaction.get(key);
      if (!state?.enabled) return null;
      state.runs++;
      state.lastRunAt = Date.now();
      await transaction.put(key, state);
      // Keep the next check scheduled even if the Worker is replaced mid-run.
      await transaction.setAlarm(state.lastRunAt + hour);
      return state.generation;
    });
    if (generation === null) return;

    let failure = null;
    try {
      await verifyReceipts(this.env.BPJ_WATCH_SECRET);
    } catch (error) {
      failure = error instanceof ReceiptError ? error.message : 'verification_unavailable';
    }

    await this.storage.transaction(async transaction => {
      const state = await transaction.get(key);
      if (!state?.enabled || state.generation !== generation) return;
      const now = Date.now();
      state.lastError = failure;
      if (failure) {
        await transaction.setAlarm(now + retryDelay);
      } else {
        state.succeeded++;
        state.lastSuccessAt = now;
        await transaction.setAlarm(now + (state.observeNext ? firstFollowup : hour));
        state.observeNext = false;
      }
      await transaction.put(key, state);
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const commands = { '/start': 'POST', '/pause': 'POST', '/status': 'GET' };
    if (url.search || commands[url.pathname] !== request.method) return json({ ok: false }, 404);
    if (!authenticated(request, env.BPJ_CLOCK_SECRET)) return json({ ok: false }, 401);
    const clock = env.BPJ_CLOCK.getByName('bpj');
    return clock.fetch(new URL(url.pathname, 'https://clock.internal'), { method: request.method });
  },
};
