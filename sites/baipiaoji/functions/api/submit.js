// 工具提交接口：成熟目录站都有提交入口，而且多数收「加急费」。
// 本站的差异化就写在门脸上：提交免费，但收录不承诺、更不出售——
// 一切以收录标准为准（官方 URL、≥3 项独立数据、limits 只认官方来源）。
//
// 通道走自家 D1 而不是 mailto：站点没有对外邮箱，写一个 mailto 等于给用户一条死胡同，
// 和「随时可退订」却没有退订实现是同一类假话。落进 submissions 表的东西
// 每日循环与人都能直接读，看得见、处理得了，这才算真通道。
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
    let url = String(b.url || '').trim().slice(0, 300);

    if (!name) return json({ ok: false, code: 'noname' }, 400);
    // URL 必须能解析且是 http(s)——这是收录标准的第一道门（官方 URL），提交时就把好
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol)) throw new Error('scheme');
      url = u.href;
    } catch {
      return json({ ok: false, code: 'badurl' }, 400);
    }
    // 留了邮箱就顺手校验；不留完全可以——提交不该强制留联系方式
    if (email && !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) {
      return json({ ok: false, code: 'bademail' }, 400);
    }

    // 表自举：首次请求时建表，省去对部署顺序的依赖（表先于代码还是代码先于表）
    await env.HITS.prepare(
      "CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, url TEXT NOT NULL, note TEXT DEFAULT '', email TEXT DEFAULT '', country TEXT DEFAULT '', created TEXT DEFAULT '', status TEXT DEFAULT 'new')"
    ).run();

    // 同一 URL 重复提交不报错也不重复记——对提交者来说「已经在队列里」就是成功
    const dup = await env.HITS.prepare('SELECT id FROM submissions WHERE url = ?').bind(url).first();
    if (dup) return json({ ok: true, code: 'already' });

    const country = (request.cf && request.cf.country) || '';
    const created = new Date().toISOString().slice(0, 10);
    await env.HITS.prepare(
      'INSERT INTO submissions (name, url, note, email, country, created, status) VALUES (?,?,?,?,?,?,?)'
    ).bind(name, url, note, email, country, created, 'new').run();

    return json({ ok: true, code: 'ok' });
  } catch (e) {
    return json({ ok: false, code: 'error' }, 500);
  }
}
