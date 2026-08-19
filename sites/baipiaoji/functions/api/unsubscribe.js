// 退订接口。
//
// 存在的理由很直接：站上两处文案都写着「随时可退订」/「unsubscribe any time」，
// 而在这个文件出现之前，退订**根本没有实现**——那两句话是假的。
// 收集邮箱却不给退订路径，既不合规，也不是本站对读者该有的态度。
//
// 两条路径都支持：
//   1. token —— 日后邮件里的一键退订链接带的就是它，订阅时已预先生成；
//   2. email —— 现在还没有发信通道，用户手上不可能有 token，所以必须允许用邮箱退订。
//
// 用邮箱退订意味着别人也能替你退订。这个风险是有意接受的：
// 代价上限是「本该收到的提醒没收到」，而反过来——想退退不掉——才是真正不可接受的那一侧。
export async function onRequestPost({ request, env }) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });

  try {
    const b = await request.json().catch(() => ({}));
    const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
    const token = String(b.token || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);

    if (!token && !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) {
      return json({ ok: false, code: 'invalid' }, 400);
    }

    const res = token
      ? await env.HITS.prepare("UPDATE subs SET status = 'unsub' WHERE token = ?").bind(token).run()
      : await env.HITS.prepare("UPDATE subs SET status = 'unsub' WHERE email = ?").bind(email).run();

    // 查无此人也回 ok：否则这个接口就成了「某个邮箱在不在名单里」的查询器，
    // 等于把订阅者名单暴露给任何人枚举。
    const changed = (res.meta && res.meta.changes) || 0;
    return json({ ok: true, code: changed ? 'done' : 'notfound' });
  } catch (e) {
    return json({ ok: false, code: 'error' }, 500);
  }
}
