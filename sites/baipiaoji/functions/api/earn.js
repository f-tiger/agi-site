// Free workflow packs require a real account session. Legacy subscriber emails are not identity.
import {getAccount} from '../../lib/free-account.js';
import { PACKS } from '../../data/earn-packs.generated.js';

export async function onRequestPost({ request, env }) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });

  try {
    if(request.headers.get('Origin')!==new URL(request.url).origin)return json({ok:false,code:'origin'},403);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({ok:false,code:'content_type'},415);
    if(Number(request.headers.get('Content-Length')||0)>4096)return json({ok:false,code:'too_large'},413);
    const raw=await request.text();if(raw.length>4096)return json({ok:false,code:'too_large'},413);
    const b=JSON.parse(raw);if(!b||Array.isArray(b)||typeof b!=='object')return json({ok:false,code:'invalid_request'},400);

    // slug 白名单化：只允许小写字母、数字与连字符，且必须命中已生成的包
    const slug = String(b.slug || '').replace(/[^a-z0-9-]/g, '').slice(0, 80);
    const lang = b.lang === 'en' ? 'en' : 'zh';

    if(request.headers.get('Origin')!==new URL(request.url).origin)return json({ok:false,code:'origin'},403);

    const pack = (PACKS[lang] || {})[slug];
    if (!pack) return json({ ok: false, code: 'unknown' }, 404);

    if (!env.HITS) return json({ ok: false, code: 'unavailable' }, 503);

    const account=await getAccount(request,env);
    if(!account)return json({ok:false,code:'not_registered'},401);

    // 打点只记路径与事件，不记邮箱（公开仓隐私红线）。这条是判定线的读数来源。
    const p = account.qa ? Promise.resolve() : env.HITS
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
