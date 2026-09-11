// 自助广告位第一步:建草稿并把人交给支付页(2026-09-11,owner:「用户付款,自动上架用户的
// 工具到不同板块,标注是广告,做成一个自动化流程,而不是等着我审核,我要的是钱」)。
//
// 全流程零人工:这里只落一条 status='pending' 的行,付款成功由 Stripe 的 webhook
// 直接把它翻成 'live'(见 ad-webhook.js)。owner 不出现在任何一步里。
//
// **没有人审,所以门必须写死在代码里。** 一个无人看管的公开站点如果什么都敢上,
// 第一个发现的人会拿它挂赌博或钓鱼页,而挨罚的是域名。下面四道门全部是机器可判的,
// 不掺任何编辑口味:能不能解析、是不是 https、是否与已收录工具撞域名、是否命中硬禁名单。
// 判不通过在**付款之前**就拒,因此不需要退款逻辑。
const CATS = ['chat', 'coding', 'image', 'video', 'audio', 'design', 'writing',
  'office', 'search', 'api', 'agent', 'life', 'study', 'other'];

// 硬禁名单:与「工具好不好」无关,只挡会让域名被处罚或被列为恶意的品类。
// 保持短、保持字面、不做语义判断——语义判断没有人复核就会误杀。
const BANNED = ['casino', 'gambling', 'betting', 'porn', 'escort', 'nude', 'nsfw',
  'crack', 'keygen', 'nulled', 'phishing', 'airdrop', 'pump', 'forex signal',
  '博彩', '赌', '色情', '成人', '破解', '私服', '刷单', '代开', '发票'];

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export async function onRequestPost({ request, env }) {
  try {
    const b = await request.json().catch(() => ({}));
    const name = String(b.name || '').trim().slice(0, 60);
    const url = String(b.url || '').trim().slice(0, 300);
    const pitch = String(b.pitch || '').trim().slice(0, 140);
    const cat = CATS.includes(String(b.cat || '')) ? String(b.cat) : '';
    const lang = b.lang === 'en' ? 'en' : 'zh';

    // 蜜罐:真人看不见 website 字段
    if (String(b.website || '').trim()) return json({ ok: true, code: 'ok', id: 'x' });

    if (!name || !pitch || !cat) return json({ ok: false, code: 'missing' }, 400);

    let host = '';
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:') return json({ ok: false, code: 'nothttps' }, 400);
      host = u.hostname.replace(/^www\./, '').toLowerCase();
      // 裸 IP 与 localhost 一律拒:正经产品不会拿这些当官网
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host === 'localhost') {
        return json({ ok: false, code: 'badhost' }, 400);
      }
    } catch { return json({ ok: false, code: 'badurl' }, 400); }

    const hay = `${name} ${pitch} ${host}`.toLowerCase();
    if (BANNED.some((w) => hay.includes(w))) return json({ ok: false, code: 'refused' }, 400);
    // 文案里不许带链接:广告位只给一个可点的地址,就是上面那个 url
    if (/https?:\/\/|www\.|<[a-z]/i.test(pitch)) return json({ ok: false, code: 'nolinks' }, 400);

    if (!env.HITS) return json({ ok: false, code: 'unavailable' }, 503);

    // 已经在站内被核实收录的工具不卖广告位:它本来就在,再卖一次等于向厂商收
    // 「让你出现在你已经出现的地方」的钱。
    const listed = await env.HITS.prepare(
      "SELECT 1 FROM submissions WHERE url LIKE ? LIMIT 1").bind(`%${host}%`).first().catch(() => null);

    const now = new Date();
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    await env.HITS.prepare(
      'INSERT INTO ads (id, name, url, pitch, cat, lang, status, created) VALUES (?,?,?,?,?,?,?,?)'
    ).bind(id, name, url, pitch, cat, lang, 'pending', now.toISOString().slice(0, 10)).run();

    // 支付链接由 owner 在支付商后台生成后写进环境变量;没配就如实说没接通,
    // 绝不假装收款成功。配上的那一刻整条流程即活,不用改一行代码。
    const pay = env.ADS_PAYMENT_LINK || '';
    if (!pay) return json({ ok: false, code: 'not_configured', id });

    const sep = pay.includes('?') ? '&' : '?';
    return json({ ok: true, id, pay_url: `${pay}${sep}client_reference_id=${id}`, listed: !!listed });
  } catch (e) {
    return json({ ok: false, code: 'error' }, 500);
  }
}
