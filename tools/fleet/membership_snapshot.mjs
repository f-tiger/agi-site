#!/usr/bin/env node
/*
 * Read-only membership health and aggregate counters for the four independent
 * member services.  This script deliberately never reads a member token,
 * order id, support message, wallet, or customer row.  The admin endpoint only
 * returns aggregate counters and is authenticated with the existing operator
 * secret; the output is safe to commit to the public monorepo.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sites} from '../revenue-studio/catalog.mjs';
import {memberSecret} from '../member-studio/ops.mjs';
import {membershipTotals} from './membership_totals.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const outPath = path.join(root, 'data/fleet-evolution/membership.json');
const siteCodes = ['bpj', 'agi', 'eco', 'tds'];

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
const checkOnly = process.argv.includes('--check');
const output = arg('--out') ? path.resolve(arg('--out')) : outPath;

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, {...options, signal: AbortSignal.timeout(20000)});
  let body = null;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok || !body || body.ok === false) {
    throw new Error(`HTTP ${response.status}`);
  }
  return body;
}

async function inspectSite(site) {
  const origin = sites[site].origin;
  const row = {site, origin, public: {ok: false}, admin: {ok: false}, errors: []};
  try {
    const body = await jsonFetch(`${origin}/api/member`);
    row.public = {
      ok: body.ok === true,
      ready: body.ready === true,
      site: typeof body.site === 'string' ? body.site : null,
      auto_renew: body.auto_renew === true,
      plan_price_units: numberOrNull(body.plan?.price_units),
      plan_days: numberOrNull(body.plan?.days)
    };
  } catch (error) {
    row.errors.push(`public:${error.message}`);
  }

  const operatorSecret = String(process.env.ADS_WATCH_SECRET || '');
  if (operatorSecret.length < 32) {
    row.errors.push('admin:operator_secret_unset');
    return row;
  }

  try {
    const body = await jsonFetch(`${origin}/api/member-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberSecret(site, {ADS_WATCH_SECRET: operatorSecret})}`
      },
      body: JSON.stringify({action: 'stats'})
    });
    row.admin = {
      ok: body.ok === true,
      paid_orders: numberOrNull(body.paid_orders),
      paid_members: numberOrNull(body.paid_members),
      active_members: numberOrNull(body.active_members),
      unexpired_pending: numberOrNull(body.unexpired_pending),
      recurring_billing: body.recurring_billing === true
    };
  } catch (error) {
    row.errors.push(`admin:${error.message}`);
  }
  return row;
}

const rows = await Promise.all(siteCodes.map(inspectSite));
// An unread counter is unknown, never a zero-revenue observation.
const totals = membershipTotals(rows);
const snapshot = {
  schema_version: 1,
  generated: new Date().toISOString(),
  source: 'same-origin /api/member and /api/member-admin stats',
  privacy: 'aggregate counters only; no member, order, support, token or wallet data',
  ok: rows.every(row => row.public.ok && row.public.ready),
  counters_complete: rows.every(row => row.admin.ok),
  sites: rows,
  totals
};

console.log(JSON.stringify(snapshot, null, 2));
if (!checkOnly) {
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`);
}
