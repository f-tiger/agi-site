// 变更分发：把当日已核实的额度/条款变更推给注册了 watch 的 webhook。
// 由每日 CI 在部署完成后触发（也可以手动 curl）。设计成**幂等且不信任调用方**：
// 载荷不从请求里来——端点自己从同源拉 changes.json（那是已核实数据的构建产物），
// 按每个 watch 的 last_sent 去重。重复触发不重发，谁触发都无所谓。
//
// 通知的每一条都是已核实的变更记录，带官方核实日期与工具页链接——
// 机器不写事实，机器只搬运人核实过的事实。

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export async function onRequest(ctx) {
  const { request, env } = ctx;
  if (request.method !== 'POST') return json({ ok: false, reason: 'method' }, 405);
  if (!env.HITS) return json({ ok: false, reason: 'no_db' }, 500);

  const origin = new URL(request.url).origin;
  const changes = (await (await env.ASSETS.fetch(new URL('/changes.json', origin))).json()).changes || [];
  if (!changes.length) return json({ ok: true, sent: 0, note: 'no changes at all' });

  const { results: watches } = await env.HITS.prepare('SELECT * FROM watches WHERE fails < 10').all();
  let sent = 0, dropped = 0;
  for (const w of watches || []) {
    const mine = w.slugs === '*' ? changes : changes.filter((c) => w.slugs.split(',').includes(c.slug));
    // last_sent 存「已送达的最大变更日期」；只发比它新的
    const fresh = mine.filter((c) => c.date > (w.last_sent || ''));
    if (!fresh.length) continue;
    const maxDate = fresh.map((c) => c.date).sort().pop();
    const payload = {
      source: 'baipiaoji.com verified free-tier watch',
      docs: `${origin}/watch.html`,
      changes: fresh.map((c) => ({
        date: c.date, slug: c.slug, name: c.name, kind: c.kind,
        fields_changed: c.fields_changed || [],
        current_quota: c.current_quota || '',
        checked: c.checked || '',
        page: c.page || `${origin}/tools/${c.slug}.html`,
      })),
    };
    try {
      const res = await fetch(w.hook, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': 'baipiaoji-watch/1.0' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok || res.status === 202) {
        await env.HITS.prepare('UPDATE watches SET last_sent=?, fails=0 WHERE id=?').bind(maxDate, w.id).run();
        sent++;
      } else {
        // 4xx/5xx 记一次失败；连续 10 次失败的 watch 停发（上面 WHERE fails<10），
        // 不删——对方修好后可以自己重注册或等我们放宽。静默永久重试只会喂死队列。
        await env.HITS.prepare('UPDATE watches SET fails=fails+1 WHERE id=?').bind(w.id).run();
        dropped++;
      }
    } catch (e) {
      await env.HITS.prepare('UPDATE watches SET fails=fails+1 WHERE id=?').bind(w.id).run();
      dropped++;
    }
  }
  return json({ ok: true, watches: (watches || []).length, sent, failed: dropped });
}
