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

    # A failed fetch / 503 / incomplete payload is unknown, never evidence of no
    # visits, no searches or no MCP use. The old `trend or {}` hid this distinction.
    required = ("pages", "zero_hits", "events", "refs", "mcp")
    available = (isinstance(trend, dict) and trend.get("ok") is not False
                 and all(isinstance(trend.get(k), list) for k in required))
    if not available:
        lines.extend([
            "## 3–6. 自有漏斗、搜索需求与发现层", "",
            "- 数据状态：**不可用 / 未知**（/api/trend 取数失败或返回不完整）。",
            "- 本轮不能判断访问、联盟点击、搜索零命中、AI 引荐或 MCP 调用是否为零，也不能判断增长或下滑。",
            "- 保留既有实验状态；恢复有效数据后再作判断，不因这次缺数停掉渠道或内容。",
        ])
        return "\n".join(lines) + f"\n\n---\n_生成于 {today.isoformat()}（UTC 日界）_\n"

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
    zh = [z for z in (trend or {}).get("zero_hits", []) if isinstance(z, dict) and z.get("q")]
    if zh:
        lines.append(f"- 本轮有 {len(zh)} 条零命中聚合记录；原始搜索词不写入公开报告。")
        lines.append("- 仅作为发现缺口的线索；不能由条数推断独立用户、搜索量或购买需求。")
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

    # The raw refs list is capped and has a different bot/window policy. Never
    # use its sum as a site-wide denominator or hostname substrings as proof.
    lines.append("## 6. 发现层：AI 引荐事件与未经验证的 MCP 请求")
    audit = trend.get("affiliate_audit")
    week = None
    if isinstance(audit, dict) and audit.get("metric") == "recorded_events_not_users_or_orders":
        weeks = audit.get("weeks")
        if isinstance(weeks, list) and weeks and isinstance(weeks[-1], dict):
            candidate = weeks[-1]
            try:
                start = date.fromisoformat(candidate["start"])
                end = date.fromisoformat(candidate["end_exclusive"])
                total = candidate["page_views"]
                channels = candidate["channels"]
                ai = channels.get("ai", {}).get("page_views", 0)
                valid_count = lambda n: type(n) is int and n >= 0
                counts = [v["page_views"] for v in channels.values()]
                if (audit.get("timezone") == "UTC" and end <= today
                        and candidate["end_exclusive"] == audit.get("end_exclusive")
                        and (end-start).days == 7 and valid_count(total)
                        and valid_count(ai) and ai <= total
                        and all(valid_count(n) for n in counts) and sum(counts) == total):
                    week = (candidate, total, ai)
            except (KeyError, TypeError, ValueError, AttributeError):
                pass
    if week:
        row, total, ai = week
        lines.append(f"- 完整 UTC 窗口：{row['start']} 至 {row['end_exclusive']}（不含结束日）。")
        if total:
            lines.append(f"- 可识别 AI 引荐的页面浏览事件：**{ai}/{total} = {100*ai/total:.1f}%**。分母含直接与站内引荐；不是独立用户或会话份额。")
        else:
            lines.append("- 完整窗口记录 0 次页面浏览事件；AI 份额不可计算，不能解释为没有引用。")
        lines.append("- 已剔除标记为机器人及 CI 路径；历史未知 UA 仍保留，不能认定全是真人。")
    else:
        lines.append("- AI 引荐份额：**不可用 / 未知**。缺少有效完整周审计，不能用截断的 refs 列表补算。")
    lines.append("- 引荐不是引用覆盖率；无 Referrer 的 AI 到访可能无法识别，Google AI 搜索无法由此单独拆分。")
    lines.append("- 不以低基数的百分比触发 GEO 扩张；先核查落地页、任务完成及商家点击，再决定投入。")
    mcp = [m for m in trend.get("mcp", []) if isinstance(m, dict) and m.get("tool")]
    if mcp:
        lines.append("- MCP 请求计数（接口的近28天窗口，未验证独立采用）：" +
                     "、".join(f"{m['tool']}×{m['n']}" for m in mcp))
    else:
        lines.append("- MCP 请求列表为空；不据此推断真实第三方采用为零。")
    lines.append("- 请求数不等于真实客户、AI 引用或到站访问；探针/自动化/重复调用仍需独立核验，不能据此触发扩工具集。")
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
