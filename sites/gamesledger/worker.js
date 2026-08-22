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

    const bm = url.pathname.match(/^\/badge\/(\d{1,8})\.svg$/);
    if (bm) {
      const app = bm[1];
      const cache = caches.default;
      const key = new Request(url.origin + "/badge/" + app + ".svg");
      let res = await cache.match(key);
      if (res) return res;
      let label = "no official number";
      try {
        const r = await fetch(STEAM + app, { headers: { "User-Agent": "gamesledger-badge/1.0" } });
        const d = await r.json();
        if (d && d.response && d.response.result === 1) label = d.response.player_count.toLocaleString("en-US") + " in-game";
      } catch (e) {}
      const text = label + " · Steam official";
      const w = 120 + text.length * 7;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="26" role="img" aria-label="${text}">` +
        `<title>live via games.agiscorecard.com</title>` +
        `<rect width="${w}" height="26" rx="5" fill="#0b0c0e"/>` +
        `<circle cx="14" cy="13" r="4" fill="#41d18f"/>` +
        `<text x="26" y="17" font-family="Verdana,sans-serif" font-size="12" fill="#e8e9ec">${text}</text>` +
        `<text x="${w - 8}" y="17" text-anchor="end" font-family="Verdana,sans-serif" font-size="9" fill="#9aa1ad">games ledger</text></svg>`;
      res = new Response(svg, { headers: { "content-type": "image/svg+xml",
        "cache-control": "public, max-age=600" } });
      ctx.waitUntil(cache.put(key, res.clone()));
      return res;
    }
    return env.ASSETS.fetch(request);
  },
};
