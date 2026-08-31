// AI 赚钱作业包的发放接口（2026-08-30，owner「加一个板块…必须注册才能看」）。
//
// 为什么必须走服务端：静态站上「注册才能看」如果只是前端把 DOM 藏起来，查看源码即破，
// 那不是墙，是装饰。作业包正文只存在于 data/earn-packs.generated.js（构建期由已核实
// 数据编译，不进 dist、不进 sitemap、不进 .md 镜像），本接口校验邮箱确实在 D1 subs 表
// 且未退订之后才回正文。
//
// 边界说清楚，免得日后自己骗自己：这是**转化机制，不是 DRM**。包里的原始事实
// （额度、出处、商用判定）本就以 CC BY 4.0 公开，本仓也是公开仓——墙拦的是
// 「不留邮箱就把编译好的接单资料拿走」，不是拦知识本身。
//
// 隐私红线（仓库根 CLAUDE.md 第 2 条）：邮箱只用于查表，**绝不写进任何日志或统计行**。
// 下面记的那条 hits 只有路径与事件名，没有任何个人身份信息。
import { PACKS } from '../../data/earn-packs.generated.js';

export async function onRequestPost({ request, env }) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });

  try {
    const b = await request.json().catch(() => ({}));
    const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
    // slug 白名单化：只允许小写字母、数字与连字符，且必须命中已生成的包
    const slug = String(b.slug || '').replace(/[^a-z0-9-]/g, '').slice(0, 80);
    const lang = b.lang === 'en' ? 'en' : 'zh';

    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return json({ ok: false, code: 'invalid' }, 400);

    const pack = (PACKS[lang] || {})[slug];
    if (!pack) return json({ ok: false, code: 'unknown' }, 404);

    if (!env.HITS) return json({ ok: false, code: 'unavailable' }, 503);

    const row = await env.HITS.prepare('SELECT status FROM subs WHERE email = ?').bind(email).first();
    // 退订过的人不算注册用户——否则「退订」就成了单方面的假动作：
    // 我们不再发信，他却继续拿墙后内容，两边对这段关系的理解不一致。
    if (!row || row.status === 'unsub') return json({ ok: false, code: 'not_registered' }, 403);

    // 打点只记路径与事件，不记邮箱（公开仓隐私红线）。这条是判定线的读数来源。
    const p = env.HITS
      .prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
      .bind(new Date().toISOString().slice(0, 10), `/earn/open/${slug}`, lang,
        (request.cf && request.cf.country) || '', '', 'earn_open')
      .run().catch(() => {});
    if (typeof p?.catch === 'function') p.catch(() => {});

    return json({ ok: true, pack });
  } catch (e) {
    return json({ ok: false, code: 'error' }, 500);
  }
}
