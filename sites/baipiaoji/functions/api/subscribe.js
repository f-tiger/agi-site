// 订阅接口：把「路过的读者」变成「可再次触达的资产」。
//
// 本站此前完全没有留存手段——161 个工具页每天接自然搜索，人看完就走，一次性消耗。
// 订阅是唯一能把流量沉淀成资产的动作，而且不需要任何外部服务商：D1 就是名单本身。
//
// 订阅主张只有一条，也只承诺这一条：**你关注的工具免费额度一变，我们告诉你。**
// 这条兑现得起——每日流水线本来就在做核实与变更检测（见 scripts/guard-regression.mjs
// 与 data/page-lastmod.json）。不承诺周更、不承诺资讯，因为那些我们不做。
//
// 边界（写在这里免得日后自己骗自己）：目前**只能收不能发**——没有邮件服务商账号。
// 名单从今天开始积累，发信通道接上之后即可用。所以前端文案不能出现「立刻收到」之类的话。
export async function onRequestPost({ request, env }) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });

  try {
    const b = await request.json().catch(() => ({}));
    const email = String(b.email || '').trim().toLowerCase().slice(0, 254);

    // 校验保持克制：只挡明显不是邮箱的输入。过度严格的正则会误杀合法地址（如 + 号别名、新顶级域）。
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) {
      return json({ ok: false, code: 'invalid' }, 400);
    }

    // 蜜罐：真人看不见 website 字段，填了就是机器人。静默返回成功——
    // 告诉机器人「你被识破了」只会让它换个写法再来。
    if (String(b.website || '').trim()) return json({ ok: true, code: 'ok' });

    const lang = String(b.lang || '').slice(0, 10);
    const src = String(b.src || '').slice(0, 200);
    // 关注的工具：前端从本地清单带上来，用于日后只推送与他相关的变更，而不是群发。
    const tools = String(b.tools || '').replace(/[^a-z0-9,\-]/gi, '').slice(0, 400);
    const country = (request.cf && request.cf.country) || '';
    const created = new Date().toISOString().slice(0, 10);
    // 退订令牌现在就生成：等发信通道接上时，每封信都要能一键退订，不能到时候再补。
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

    // 重复订阅不报错——对用户来说「我已经订过了」和「订阅成功」应该是同一种体验。
    // 但已存在时把 tools 合并进去：同一个人在不同工具页订阅，关注列表应该累加而不是覆盖。
    const existing = await env.HITS.prepare('SELECT id, tools, status FROM subs WHERE email = ?')
      .bind(email).first();

    if (existing) {
      const merged = [...new Set([...(existing.tools || '').split(','), ...tools.split(',')])]
        .filter(Boolean).slice(0, 40).join(',');
      // status 必须一并重置回 pending：退订过的人再来订阅，如果只更新 tools，
      // 界面会显示「你已经在名单里了」，而这一行在库里仍是 unsub——他永远收不到信，
      // 却以为订上了。这是最伤人的一种失败：不报错、但静默失效。
      await env.HITS.prepare("UPDATE subs SET tools = ?, status = 'pending' WHERE id = ?")
        .bind(merged, existing.id).run();
      return json({ ok: true, code: existing.status === 'unsub' ? 'resub' : 'already' });
    }

    await env.HITS.prepare(
      'INSERT INTO subs (email, lang, src, tools, country, created, status, token) VALUES (?,?,?,?,?,?,?,?)'
    ).bind(email, lang, src, tools, country, created, 'pending', token).run();

    return json({ ok: true, code: 'ok' });
  } catch (e) {
    // 订阅失败不能是白屏或静默：用户付出了输入邮箱的成本，必须给回执。
    return json({ ok: false, code: 'error' }, 500);
  }
}
