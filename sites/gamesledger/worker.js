// gamesledger worker:静态资产 + /api/live(Steam 官方并发数实时代理)。
// 代理只透传 Valve 官方 API 的一个数字,边缘缓存 120s 防滥用;appid 强校验。
const STEAM = "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/live") {
      const app = url.searchParams.get("app") || "";
      if (!/^\d{1,8}$/.test(app)) {
        return new Response(JSON.stringify({ ok: false, error: "bad appid" }),
          { status: 400, headers: { "content-type": "application/json" } });
      }
      const cache = caches.default;
      const key = new Request(url.origin + "/api/live?app=" + app);
      let res = await cache.match(key);
      if (res) return res;
      try {
        const r = await fetch(STEAM + app, { headers: { "User-Agent": "gamesledger-live/1.0" } });
        const d = await r.json();
        const resp = d && d.response;
        const body = (resp && resp.result === 1)
          ? { ok: true, appid: +app, n: resp.player_count, t: new Date().toISOString().slice(0, 16) + "Z" }
          : { ok: false, error: "no official number for this appid" };
        res = new Response(JSON.stringify(body), {
          status: body.ok ? 200 : 404,
          headers: { "content-type": "application/json", "cache-control": "public, max-age=120" },
        });
        ctx.waitUntil(cache.put(key, res.clone()));
        return res;
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "steam unreachable" }),
          { status: 502, headers: { "content-type": "application/json" } });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
