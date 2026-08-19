// 第一方访问打点：无 Cookie、无 IP、无指纹——只存 日期/路径/语言/国家/外部来源域/事件名。
// 比 GA4 干净，且不依赖任何外部账号；查询走 Cloudflare D1（会话内 MCP 可直读）。
// 任何异常都吞掉并返回 204：统计永远不能影响正常访问。
//
// 2026-08-06 增加 ev（事件名）这一列，起因是一次审计：注册功能上线以来真实注册数为 0，
// 而我们**无法说出是哪一步丢的人**——订阅区有没有被看到、星标有没有被点、
// 表单提交后是成功还是报错、清单文件到底有没有下载成功，一律没有记录。
// 出站点击此前只报给 GA4，而 GA4 的读取通道尚未打通，等于也读不到。
// 不能测量的漏斗没法优化，所以先把眼睛装上，再谈提高转化。
//
// 事件名走白名单：打点接口是公开的，不限制取值就等于给了任何人一个往自家库里写任意字符串的口子。
const EVENTS = new Set([
  'sub_view',    // 订阅区进入视口（曝光，漏斗分母）
  'star',        // 点了「关注额度变化」
  'sub_submit',  // 提交了邮箱
  'sub_ok',      // 新订阅成功
  'sub_dup',     // 已在名单里（含退订后重订）
  'sub_err',     // 提交失败（校验不过或服务端出错）
  'sheet_dl',    // 清单文件已生成并触发下载 —— 钩子真正兑现的那一刻
  'sheet_err',   // 邮箱存下了但清单没给出去 —— 承诺落空，必须能看见
  'unsub_ok',    // 退订成功
  'go',          // 出站点击（离营收最近的动作，此前只有 GA4 记录）
  'calc',        // 自建计算器被真实使用——自建工具战略的核心度量，投入是否加码由它决定
  'audit',       // 订阅体检的判定结果档位。上线时忘了进白名单，事件被静默丢弃——
                 // 一个靠度量决定投入的战略，度量通道自己是坏的，这一课记在这
  'biz',         // 付费 listing 需求探针（/for-vendors.html）：询价按钮与表单结果，
                 // 路径区分动作（/biz/inquiry/<kind>、/biz/ok/<kind>）。90 天 0 询价即撤
]);

export async function onRequestPost({ request, env }) {
  try {
    const b = await request.json().catch(() => ({}));
    const path = String(b.p || '').slice(0, 200);
    if (!path.startsWith('/')) return new Response(null, { status: 204 });
    const lang = String(b.l || '').slice(0, 10);
    const ev = EVENTS.has(b.e) ? b.e : '';
    let ref = '';
    try { if (b.r) ref = new URL(b.r).hostname.slice(0, 100); } catch {}
    // 站内跳转不算来源
    if (ref.endsWith('baipiaoji.com') || ref.endsWith('.pages.dev')) ref = '';
    const country = (request.cf && request.cf.country) || '';
    const d = new Date().toISOString().slice(0, 10);
    await env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
      .bind(d, path, lang, country, ref, ev).run();
  } catch (e) { /* 打点失败静默 */ }
  return new Response(null, { status: 204 });
}
