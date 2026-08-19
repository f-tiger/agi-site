#!/usr/bin/env node
// 线下签发授权码。收款渠道是什么无所谓（爱发电 / Ko-fi / GitHub Sponsors / 转账都行），
// 收到钱之后跑这一条命令，把码发给对方即可。
//
//   LICENSE_SECRET=… node scripts/license.mjs --tier pro --days 365
//
// 校验端是 functions/api/entitlement.js，用同一个 LICENSE_SECRET（存 Cloudflare 环境变量）。
// 码里只有「档位 + 到期日 + 随机串」，不含任何个人信息——所以既不需要数据库，
// 也不存在「买了付费就被记录了什么」这件事。
import { createHmac, randomBytes } from 'node:crypto';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};

const secret = process.env.LICENSE_SECRET;
if (!secret) {
  console.error('缺 LICENSE_SECRET 环境变量——它必须与 Cloudflare 上那份完全一致，否则签出来的码校验不过。');
  process.exit(1);
}

const tier = arg('tier', 'pro');
const days = Number(arg('days', '365'));
if (!/^[a-z]+$/.test(tier) || !Number.isFinite(days) || days <= 0) {
  console.error('用法：LICENSE_SECRET=… node scripts/license.mjs --tier pro --days 365');
  process.exit(1);
}

// 到期日按「整天」存，精确到毫秒既没必要，也会让码变长
const expDays = Math.floor((Date.now() + days * 86400000) / 86400000);
const nonce = randomBytes(6).toString('hex');
const payload = ['bpj', tier, String(expDays), nonce].join('.');
const sig = createHmac('sha256', secret).update(payload).digest('base64url');

console.log(`${payload}.${sig}`);
console.error(`档位 ${tier}｜到期 ${new Date(expDays * 86400000).toISOString().slice(0, 10)}（${days} 天）`);
