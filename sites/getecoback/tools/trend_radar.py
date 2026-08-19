#!/usr/bin/env python3
"""Daily trend radar: condense the site's signals into one judgeable page.

The emergence loop, honestly split: this script only CONDENSES — it pulls the
three signal streams nobody was reading side by side (own funnel acceleration
via /api/trend, the zero-hit search queue, the 7-day weather outlook, the
season calendar) and writes docs/trend-radar.md. It never decides: judgment
(SERP verdicts, cannibalization checks, writing) stays with the hourly agent
routine, which reads this file as its standing source material. Runs from the
daily scheduled deploy and commits the file back only when the substance
changed (the date line alone never triggers a commit).

Anticipation here means three checkable things, not divination:
  weather forecast (open-meteo, keyless) -> demand spikes days ahead,
  week-over-week acceleration in our own funnel -> what is already moving,
  the season calendar -> what starts moving every year at this time.
"""
import json, os, re, sys, urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "trend-radar.md")
BASE = os.environ.get("RADAR_BASE", "https://getecoback.com")

CITIES = [("Berlin", 52.52, 13.41), ("Frankfurt", 50.11, 8.68), ("München", 48.14, 11.58)]

# Season boundaries mirror tools/build_season.py (month-driven).
SEASONS = [(3, "Frühjahr"), (6, "Sommer"), (9, "Herbst"), (11, "Winter")]


def fetch_json(url, timeout=15):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception:
        return None


def weather_outlook(today):
    """Max temperature over the next 7 days across the three cities."""
    peak, peak_city, peak_day = None, "", ""
    for name, lat, lon in CITIES:
        d = fetch_json(
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            "&daily=temperature_2m_max&forecast_days=7&timezone=Europe%2FBerlin")
        try:
            temps = d["daily"]["temperature_2m_max"]
            days = d["daily"]["time"]
            for t, dy in zip(temps, days):
                if t is not None and (peak is None or t > peak):
                    peak, peak_city, peak_day = t, name, dy
        except Exception:
            continue
    return peak, peak_city, peak_day


def season_countdown(today):
    for month, label in SEASONS:
        if today.month < month:
            boundary = date(today.year, month, 1)
            return label, (boundary - today).days
    return "Frühjahr", (date(today.year + 1, 3, 1) - today).days


def render(today, trend, peak, peak_city, peak_day, next_season, days_left):
    lines = ["# 趋势雷达（机器凝练层 · 每日自动生成）", ""]
    lines.append("> 本文件由 `tools/trend_radar.py` 在每日定时部署中生成。它只凝练信号，不做判断——")
    lines.append("> 每小时 Routine 以此为常设选题输入，任何候选仍须过 KGR/SERP 判定与蚕食检查。")
    lines.append("")

    lines.append("## 1. 天气前瞻（需求的领先指标）")
    if peak is not None:
        flag = "🔥 热浪级" if peak >= 32 else ("⚠️ 偏热" if peak >= 28 else "平静")
        lines.append(f"- 未来 7 天最高温：**{peak:.0f} °C**（{peak_city}，{peak_day}）— {flag}")
        if peak >= 32:
            lines.append("- → 行动窗口：分发稿该发了（docs/marketing/），heat 层与 share 按钮将自动激活")
    else:
        lines.append("- 天气数据本轮不可用（open-meteo 未响应）— heat 层自身有独立降级，无需处理")
    lines.append("")

    lines.append(f"## 2. 季节日历：距 **{next_season}** 还有 **{days_left} 天**")
    if days_left <= 28:
        lines.append(f"- → 提前 4 周窗口已开：{next_season} 簇的薄页深化该排上日程")
    lines.append("")

    lines.append("## 3. 自有漏斗：周环比加速中的页面（n7 vs 前 7 天）")
    pages = (trend or {}).get("pages", [])
    accel = [p for p in pages if p.get("n7", 0) >= 2 and p.get("n7", 0) > (p.get("p7") or 0)]
    if accel:
        for p in accel[:10]:
            lines.append(f"- `{p['page']}` — {p.get('p7') or 0} → {p['n7']}")
    else:
        lines.append("- 本周无满足门槛（n7≥2 且增长）的页面")
    lines.append("")

    lines.append("## 4. 未满足需求（站内搜索零命中，28 天）")
    zh = [z for z in (trend or {}).get("zero_hits", []) if z.get("q")]
    if zh:
        for z in zh[:15]:
            lines.append(f"- 「{z['q']}」 × {z['n']}")
        lines.append("- → 这些是候选不是结论：逐条过 KGR/SERP 判定与蚕食检查后才允许成页")
    else:
        lines.append("- 队列为空（搜索功能刚上线或所有查询都有命中）")
    lines.append("")

    lines.append("## 5. 漏斗事件周环比")
    evs = (trend or {}).get("events", [])
    if evs:
        lines.append("| 事件 | 前7天 | 近7天 |")
        lines.append("|---|---|---|")
        for e in evs[:14]:
            lines.append(f"| {e['name']} | {e.get('p7') or 0} | {e.get('n7') or 0} |")
    else:
        lines.append("- /api/trend 本轮无数据")
    lines.append("")

    # Discovery layer (rule 2): being cited and being called are the site's two
    # AI-era channels — the radar measures both daily so the judgment layer can
    # iterate keywords from data instead of registering once and forgetting.
    lines.append("## 6. 发现层：被引用与被调用（规则二监测）")
    refs = (trend or {}).get("refs", [])
    AI_HOSTS = ("chatgpt.com", "perplexity.ai", "copilot.microsoft.com",
                "gemini.google.com", "claude.ai", "chat.deepseek.com")
    total7 = sum(r.get("n7") or 0 for r in refs)
    ai7 = sum(r.get("n7") or 0 for r in refs if any(h in (r.get("ref") or "") for h in AI_HOSTS))
    if total7:
        share = round(100 * ai7 / total7)
        lines.append(f"- AI 助手引荐份额（7天）：**{ai7}/{total7} = {share}%**"
                     + ("　→ **≥20% 连续 4 周则 GEO 深化升为常设优先级**（战略预注册）" if share >= 20 else ""))
        top_ai = [r for r in refs if any(h in (r.get("ref") or "") for h in AI_HOSTS)][:4]
        for r in top_ai:
            lines.append(f"  - {r['ref']}: {r.get('p7') or 0} → {r['n7']}")
    else:
        lines.append("- 本周无带 Referrer 的访问")
    mcp = [m for m in (trend or {}).get("mcp", []) if m.get("tool")]
    if mcp:
        lines.append(f"- **MCP 真实调用（28天，已排除 Registry 健康探针）**：" +
                     "、".join(f"{m['tool']}×{m['n']}" for m in mcp))
        lines.append("  - → 有真实第三方调用即触发预注册判定：扩工具集 + 按被调用的工具迭代 Registry 关键词")
    else:
        lines.append("- MCP 调用（28天）：0 —— Registry 条目在册即可，不扩张（预注册口径）")
    lines.append("")
    body = "\n".join(lines)
    return body + f"\n---\n_生成于 {today.isoformat()}（UTC 日界）_\n"


def main():
    today = date.today()
    trend = fetch_json(f"{BASE}/api/trend")
    peak, peak_city, peak_day = weather_outlook(today)
    next_season, days_left = season_countdown(today)
    out = render(today, trend, peak, peak_city, peak_day, next_season, days_left)

    old = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
    strip = lambda s: re.sub(r"_生成于 .*?_", "", s)
    if strip(old) == strip(out):
        print("trend-radar: substance unchanged, not rewriting")
        return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(out)
    print(f"trend-radar: written ({len(out)} bytes)")


if __name__ == "__main__":
    main()
