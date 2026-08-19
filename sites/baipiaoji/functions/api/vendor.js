// 厂商询价接口（付费 listing 需求探针，2026-08-17）：
// 冻结令里预告的「解冻后第一件事」，owner 当日指令提前执行。这不是产品，是探针——
// 行业依据（Dirstarter / TrustMRR）：「被列出=厂商收入」时每个 listing 都是付费线索，
// 但 TrustMRR 的 48 小时变现依赖创始人身处社区+病毒分发，本站不具备后者。
// 所以先测「有没有厂商询价」这一个二值信号，有信号再谈定价与产品（判定线见
// docs/competitor-watch-2026-08.md §五：90 天 0 询价 → 探针死，撤入口）。
//
// 不标价格：没有定价依据就不编——这和 limits 只认官方来源是同一条纪律。
// 通道走自家 D1 而不是 mailto（site.contact_email 为空，mailto 是死胡同）；
// 落进 vendor_inquiries 表的东西每日循环与人都能直接读。
export async function onRequestPost({ request, env }) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });

  try {
    const b = await request.json().catch(() => ({}));

    // 蜜罐：真人看不见 website 字段。静默返回成功，不给机器人调参的反馈。
    if (String(b.website || '').trim()) return json({ ok: true, code: 'ok' });

    const name = String(b.name || '').trim().slice(0, 80);
    const note = String(b.note || '').trim().slice(0, 500);
    const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
    // 意向走白名单：探针的读数就按这三档聚合，自由文本会把读数搅成浆糊
    const kind = ['expedite', 'feature', 'other'].includes(b.kind) ? b.kind : '';
    let url = String(b.url || '').trim().slice(0, 300);

    if (!name) return json({ ok: false, code: 'noname' }, 400);
    if (!kind) return json({ ok: false, code: 'nokind' }, 400);
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol)) throw new Error('scheme');
      url = u.href;
    } catch {
      return json({ ok: false, code: 'badurl' }, 400);
    }
    // 询价必须留邮箱：没有回复路径的「询价」无法核实是不是真实厂商，探针读数会掺假
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) {
      return json({ ok: false, code: 'bademail' }, 400);
    }

    // 表自举：首次请求时建表，省去对部署顺序的依赖
    await env.HITS.prepare(
      "CREATE TABLE IF NOT EXISTS vendor_inquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, url TEXT NOT NULL, kind TEXT NOT NULL, note TEXT DEFAULT '', email TEXT NOT NULL, country TEXT DEFAULT '', created TEXT DEFAULT '', status TEXT DEFAULT 'new')"
    ).run();

    // 同一 URL 同一意向重复提交不报错也不重复记——对询价者来说「已经在队列里」就是成功
    const dup = await env.HITS.prepare('SELECT id FROM vendor_inquiries WHERE url = ? AND kind = ?')
      .bind(url, kind).first();
    if (dup) return json({ ok: true, code: 'already' });

    const country = (request.cf && request.cf.country) || '';
    const created = new Date().toISOString().slice(0, 10);
    await env.HITS.prepare(
      'INSERT INTO vendor_inquiries (name, url, kind, note, email, country, created, status) VALUES (?,?,?,?,?,?,?,?)'
    ).bind(name, url, kind, note, email, country, created, 'new').run();

    return json({ ok: true, code: 'ok' });
  } catch (e) {
    return json({ ok: false, code: 'error' }, 500);
  }
}
