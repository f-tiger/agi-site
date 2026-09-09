#!/usr/bin/env python3
"""舰队 GEO 台账 —— 把「被 AI 引用」翻译成欧元,而不是翻译成引用数。

存在的理由(2026-09-09,owner 问「ai 最终导流 geo,这块如何利用突破 geo,实现创造营收?」):
舰队关于 GEO 的全部读数,过去三个月只有两个来源——① Bing AI Performance 的截图
(564 次引用 / 30 天,2026-08-16,owner 手动提供,Bing 自注抽样);② 各站 D1 里
零散的 ref_host。两个都回答不了唯一重要的问题:**一次引用值多少钱。**

本脚本回答它,口径全部第一方:

  供给面  哪些 AI 爬虫在抓、抓了多少、多久没来过（沉默 = 引用管道在断供）
  需求面  AI 助手送回来多少真人 pv
  转化面  AI 来的真人 vs 搜索来的真人,谁更会点联盟链接(**这一栏推翻了行业说法**)
  钱      AI 引荐带来的联盟点击 × €0,085/点击 = 这条渠道的真实周期收入
  天花板  按爬虫抓取次数计价(pay-per-crawl)最多能收到多少 —— 用来永久关掉这个选项

三条纪律,与舰队其它取数脚本一致:
  * **零编造**:某站取不到数就写 ok:false + 原因,绝不用旧值冒充,也不进聚合。
  * **能红**:引用爬虫集体沉默是事故,退出码 2 → heartbeat 把 run 打红 → owner 收到
    GitHub 失败邮件(全链上唯一不经过 AI 会话的告警通道)。
  * **单位要带出处**:€0,085/点击 不是估计,是 PartnerNet 截图 €10,26 / 121 点击
    (30 天窗至 2026-08-30)算出来的,写进 JSON 的 assumptions 里,过期由 owner 的
    下一张截图刷新。

用法:
    python3 tools/geo_ledger.py --write data/geo-ledger.json
    python3 tools/geo_ledger.py --selftest      # 离线,零网络,~0.1 秒
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone

# ── 常量 ───────────────────────────────────────────────────────────────────────

CF_API = "https://api.cloudflare.com/client/v4"

# 本仓 workflow 历史上踩过的坑(tds-traffic.yml 的注释有全程):账号里有三个不同
# 名字的 token secret,只试一个会在别的 secret 才有权限时静默失败。按顺序全试。
TOKEN_ENVS = ("CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_TOKEN_ZONE", "CF_API_TOKEN")

# 站 → D1 database_id。只列**有 GEO 遥测**的站:其余站要么没有 ref 列,
# 要么没有可计价的动作,进来只会稀释表格。
SITES = {
    "agiscorecard": "f84f9d29-3ad9-4b37-b28e-3a78027d2f22",
    "baipiaoji": "1ee08cb8-a174-4ec3-8dbc-89ef5d28aa05",
    "getecoback": "75e45e05-44b5-4c56-9a3b-dd504b5c53f1",
}

# 引用型爬虫:这五家是「答案里出现本站」的供给侧。Googlebot/Bingbot 也记,但它们
# 同时服务传统搜索,沉默的含义不一样,所以不进熔断。
CITATION_CRAWLERS = ("GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot")
OTHER_CRAWLERS = ("Googlebot", "Bingbot", "Applebot", "Amazonbot", "Bytespider", "Meta-ExternalAgent")
KNOWN_CRAWLERS = CITATION_CRAWLERS + OTHER_CRAWLERS

# AI 助手引荐来源。注意 `www.bing.com` **不在**这里:Bing 网页搜索的点击与 Copilot
# 的引用是两套东西(agi 的 analytics-notes 2026-08-16 明确写过不可互相印证),
# 把它算成 AI 会把这一栏做成假的。
AI_REF_HOSTS = frozenset({
    "chatgpt.com", "chat.openai.com",
    "perplexity.ai", "www.perplexity.ai",
    "copilot.microsoft.com",
    "claude.ai",
    "gemini.google.com",
})

SEARCH_REF_MARKERS = (
    "google.", "bing.com", "duckduckgo.com", "ecosia.org", "yahoo.com", "yandex.",
    "brave.com", "startpage.com", "qwant.com", "kagi.com", "baidu.com", "mojeek.com",
    "seznam.cz", "naver.com",
)

# 单位经济。**不是估计**——PartnerNet 后台截图,30 天窗至 2026-08-30:
# 佣金 €10,26 / 121 次点击 = €0,0848/点击。过期后由 owner 下一张截图刷新。
EUR_PER_AFFILIATE_CLICK = 0.085
EUR_PER_CLICK_SOURCE = "PartnerNet 截图 €10,26 / 121 clicks, 30d window to 2026-08-30"

# 引用爬虫沉默多少天算事故。bpj 在 28 天里被这五家抓了上千次,正常间隔以小时计;
# 10 天是给「Cloudflare 2026-09-15 默认拦截」这类外部变更留的宽限,不是给抖动留的。
FUSE_SILENCE_DAYS = 10

# pay-per-crawl 价格网格(USD/次)。Cloudflare 的 pay per crawl 由站长自己定价,
# 所以这里不猜市场价,直接把三个量级摆出来,让读者看到分子有多小。
PPC_PRICE_GRID = (0.01, 0.05, 0.10)


# ── 纯函数(selftest 全部打这一层,不需要网络) ──────────────────────────────────

def classify_ref(host: str | None) -> str:
    """把 referrer host 归到一个渠道类。未知一律 'other',绝不猜成 AI。"""
    h = (host or "").strip().lower()
    if not h:
        return "direct"
    if h in AI_REF_HOSTS:
        return "ai"
    # noai.duckduckgo.com 这种明确声明「不走 AI」的镜像算搜索,不算 AI。
    if any(m in h for m in SEARCH_REF_MARKERS):
        return "search"
    return "other"


def crawler_name(raw: str | None) -> str | None:
    """从 UA 字符串或 bot 名里认出已知爬虫;认不出返回 None(计入 unidentified)。

    大小写不敏感。**只认自报家门的名字**,绝不按「看起来像爬虫」猜——猜错的方向
    是把真人抹掉,那个错误比漏记一个爬虫贵得多(worker 注释里有这条教训的出处)。
    """
    s = (raw or "").lower()
    if not s:
        return None
    for name in KNOWN_CRAWLERS:
        if name.lower() in s:
            return name
    return None


def summarise_crawlers(rows: list[dict], today: date) -> dict:
    """rows: [{'key': UA或bot名, 'hits': int, 'last_day': 'YYYY-MM-DD'}]

    返回 {'named': {爬虫: {...}}, 'unidentified_hits': int, 'unidentified_top': [...]}。

    `unidentified` 不是噪音,是**仪表的盲区大小**:agiscorecard 的 ua_audit 只存 48 字符
    UA 前缀,而 GPTBot 的 UA 前 48 字符与另外几个 bot 完全相同,所以在 2026-09-09 之前
    「GPTBot 抓了多少」在这个站上根本不可知。这一栏把盲区显式记账,修好之后它应该塌下去。
    """
    named: dict[str, dict] = {}
    unidentified = 0
    unnamed_rows: list[tuple[int, str]] = []
    for row in rows:
        key = row.get("key") or ""
        hits = int(row.get("hits") or 0)
        last = row.get("last_day") or ""
        name = crawler_name(key)
        if name is None:
            unidentified += hits
            unnamed_rows.append((hits, key[:60]))
            continue
        slot = named.setdefault(name, {"hits": 0, "last_day": ""})
        slot["hits"] += hits
        if last > slot["last_day"]:
            slot["last_day"] = last
    for name, slot in named.items():
        slot["days_since_last"] = _days_since(slot["last_day"], today)
    unnamed_rows.sort(reverse=True)
    return {
        "named": named,
        "unidentified_hits": unidentified,
        "unidentified_top": [{"ua_prefix": k, "hits": h} for h, k in unnamed_rows[:5]],
    }


def _days_since(day: str, today: date) -> int | None:
    if not day:
        return None
    try:
        return (today - date.fromisoformat(day)).days
    except ValueError:
        return None


def fuse_alerts(crawlers: dict, site: str) -> list[str]:
    """引用爬虫断供检测。返回人话告警列表,空 = 一切正常。

    只在**本来看得见这些爬虫的站**上生效:一个从来没记录过某爬虫的站,沉默是常态,
    报警就是狼来了。所以判据是「曾经出现过 + 现在超过 FUSE_SILENCE_DAYS 天没来」。
    """
    out = []
    named = crawlers.get("named", {})
    for bot in CITATION_CRAWLERS:
        slot = named.get(bot)
        if not slot:
            continue
        gap = slot.get("days_since_last")
        if gap is not None and gap > FUSE_SILENCE_DAYS:
            out.append(f"{site}: {bot} 已 {gap} 天没有抓取(上次 {slot['last_day']})——引用管道可能被拦")
    return out


def conversion_table(rows: list[dict]) -> dict:
    """rows: [{'cls': 'ai'|'search'|..., 'pv': int, 'clicks': int}] → 每类的转化率。

    分母为 0 时 rate 写 None 而不是 0.0 —— 「没人来」和「来了不点」是两件事,
    合并成 0% 会让下一次读表的人得出相反的结论。
    """
    out = {}
    for row in rows:
        pv = int(row.get("pv") or 0)
        clicks = int(row.get("clicks") or 0)
        out[row["cls"]] = {
            "pv": pv,
            "clicks": clicks,
            "rate_pct": round(100.0 * clicks / pv, 1) if pv else None,
        }
    return out


def ppc_ceiling(total_crawls: int, grid=PPC_PRICE_GRID) -> dict:
    """按抓取次数计价的收入天花板。这个函数存在的意义是让「给爬虫收费」这个提案
    每次都被自己的算术当场杀死,而不是每季度重新讨论一遍。"""
    return {f"usd_at_{p:.2f}_per_crawl": round(total_crawls * p, 2) for p in grid}


def money_from_ai(conv: dict, eur_per_click: float = EUR_PER_AFFILIATE_CLICK) -> dict:
    ai = conv.get("ai") or {}
    clicks = int(ai.get("clicks") or 0)
    pv = int(ai.get("pv") or 0)
    return {
        "ai_referred_pv": pv,
        "ai_referred_clicks": clicks,
        "eur": round(clicks * eur_per_click, 4),
        "eur_per_ai_pv": round(clicks * eur_per_click / pv, 4) if pv else None,
        "eur_per_click_assumption": eur_per_click,
        "eur_per_click_source": EUR_PER_CLICK_SOURCE,
    }


# ── D1 取数 ────────────────────────────────────────────────────────────────────

def d1_query(account: str, database: str, sql: str, timeout: int = 30) -> list[dict]:
    body = json.dumps({"sql": sql}).encode()
    last_err = "no token env set (" + ", ".join(TOKEN_ENVS) + ")"
    for env_name in TOKEN_ENVS:
        token = os.environ.get(env_name)
        if not token:
            continue
        req = urllib.request.Request(
            f"{CF_API}/accounts/{account}/d1/database/{database}/query",
            data=body,
            headers={"authorization": f"Bearer {token}", "content-type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                payload = json.loads(resp.read().decode())
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            last_err = f"{env_name}: {type(exc).__name__}"
            continue
        if payload.get("success"):
            return payload["result"][0]["results"]
        errs = "; ".join(str(e.get("message", e)) for e in payload.get("errors") or [])
        last_err = f"{env_name}: {errs or 'success=false'}"
    raise RuntimeError(last_err)


def collect_agiscorecard(account: str, db: str, today: date) -> dict:
    """agi 的 UA 存在 ua_audit(前缀),引荐存在 events.page_view(JS 口径 = 真人)。"""
    crawl_rows = d1_query(account, db, """
        SELECT ua_prefix AS key, SUM(hits) AS hits, MAX(day) AS last_day
        FROM ua_audit WHERE day >= date('now','-28 day') AND ua_class='bot'
        GROUP BY ua_prefix
    """)
    ref_rows = d1_query(account, db, """
        SELECT COALESCE(ref_host,'') AS host, COUNT(*) AS pv
        FROM events WHERE name='page_view' AND day >= date('now','-28 day')
        GROUP BY ref_host
    """)
    return {
        "crawlers": summarise_crawlers(crawl_rows, today),
        "referrals": _fold_refs(ref_rows),
        "conversion": None,  # 本站没有可计价动作:affiliate_click 长期为 0,不假装有分母
    }


def collect_baipiaoji(account: str, db: str, today: date) -> dict:
    """bpj 的 worker 把爬虫名直接写进 hits.ref —— 全舰队最好的 GEO 供给侧遥测。"""
    rows = d1_query(account, db, """
        SELECT ref AS key, COUNT(*) AS hits, MAX(d) AS last_day
        FROM hits WHERE d >= date('now','-28 day') GROUP BY ref
    """)
    crawl_rows = [r for r in rows if crawler_name(r.get("key"))]
    human_rows = [
        {"host": r["key"], "pv": r["hits"]}
        for r in rows if not crawler_name(r.get("key"))
    ]
    return {
        "crawlers": summarise_crawlers(crawl_rows, today),
        "referrals": _fold_refs(human_rows),
        "conversion": None,  # bpj 无联盟账号,go 出站不是营收(根 CLAUDE.md 2026-09-08 口径)
    }


def collect_getecoback(account: str, db: str, today: date) -> dict:
    """eco 是舰队**唯一**有真实单价的站,所以转化面只有它算得出钱。"""
    conv_rows = d1_query(account, db, """
        SELECT COALESCE(ref,'') AS host,
               SUM(name='page_view') AS pv,
               SUM(name='affiliate_click') AS clicks
        FROM ev WHERE day >= date('now','-28 day')
          AND (ua_class IS NULL OR ua_class != 'bot')
        GROUP BY ref
    """)
    conv90 = d1_query(account, db, """
        SELECT COALESCE(ref,'') AS host,
               SUM(name='page_view') AS pv,
               SUM(name='affiliate_click') AS clicks
        FROM ev WHERE day >= date('now','-90 day')
          AND (ua_class IS NULL OR ua_class != 'bot')
        GROUP BY ref
    """)
    return {
        "crawlers": None,  # eco 的 worker 不做服务端 UA 审计,这里如实留空而不是填 0
        "referrals": _fold_refs([{"host": r["host"], "pv": r["pv"]} for r in conv_rows]),
        "conversion": {
            "d28": conversion_table(_fold_conv(conv_rows)),
            "d90": conversion_table(_fold_conv(conv90)),
        },
    }


def _fold_refs(rows: list[dict]) -> dict:
    out = {"ai": 0, "search": 0, "direct": 0, "other": 0}
    ai_detail: dict[str, int] = {}
    for r in rows:
        host = r.get("host") or ""
        pv = int(r.get("pv") or 0)
        cls = classify_ref(host)
        out[cls] += pv
        if cls == "ai":
            ai_detail[host] = ai_detail.get(host, 0) + pv
    out["ai_by_host"] = dict(sorted(ai_detail.items(), key=lambda kv: -kv[1]))
    return out


def _fold_conv(rows: list[dict]) -> list[dict]:
    buckets: dict[str, dict] = {}
    for r in rows:
        cls = classify_ref(r.get("host"))
        slot = buckets.setdefault(cls, {"cls": cls, "pv": 0, "clicks": 0})
        slot["pv"] += int(r.get("pv") or 0)
        slot["clicks"] += int(r.get("clicks") or 0)
    return list(buckets.values())


COLLECTORS = {
    "agiscorecard": collect_agiscorecard,
    "baipiaoji": collect_baipiaoji,
    "getecoback": collect_getecoback,
}


# ── 组装 ───────────────────────────────────────────────────────────────────────

def build(account: str, today: date) -> tuple[dict, list[str]]:
    out = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "window_days": 28,
        "assumptions": {
            "eur_per_affiliate_click": EUR_PER_AFFILIATE_CLICK,
            "source": EUR_PER_CLICK_SOURCE,
            "note": "AI 引荐口径不含 www.bing.com —— Bing 网页搜索点击与 Copilot 引用是两套数据",
        },
        "sites": {},
    }
    alerts: list[str] = []
    total_ai_crawls = 0
    for site, db in SITES.items():
        try:
            data = COLLECTORS[site](account, db, today)
        except Exception as exc:                       # noqa: BLE001 — 原因要落库
            out["sites"][site] = {"ok": False, "reason": f"{type(exc).__name__}: {exc}"[:200]}
            continue
        data["ok"] = True
        if data.get("crawlers"):
            alerts.extend(fuse_alerts(data["crawlers"], site))
            total_ai_crawls += sum(
                slot["hits"] for bot, slot in data["crawlers"]["named"].items()
                if bot in CITATION_CRAWLERS
            )
        if data.get("conversion"):
            data["money_28d"] = money_from_ai(data["conversion"]["d28"])
            data["money_90d"] = money_from_ai(data["conversion"]["d90"])
        out["sites"][site] = data

    ok_sites = [s for s, d in out["sites"].items() if d.get("ok")]
    out["fleet"] = {
        "sites_ok": ok_sites,
        "citation_crawls_28d": total_ai_crawls,
        "pay_per_crawl_ceiling_28d": ppc_ceiling(total_ai_crawls),
        "ai_referred_eur_28d": round(sum(
            (d.get("money_28d") or {}).get("eur", 0.0) for d in out["sites"].values()
            if isinstance(d, dict)
        ), 4),
    }
    out["alerts"] = alerts
    return out, alerts


# ── selftest(离线) ───────────────────────────────────────────────────────────

def selftest() -> int:
    fails: list[str] = []

    def check(cond, msg):
        if not cond:
            fails.append(msg)

    # 渠道分类:AI 只认名单,搜索不许漏进 AI,空 referrer 是 direct 不是 other。
    check(classify_ref("chatgpt.com") == "ai", "chatgpt.com 应归 ai")
    check(classify_ref("www.perplexity.ai") == "ai", "perplexity 应归 ai")
    check(classify_ref("www.bing.com") == "search", "bing 网页搜索不能算 AI")
    check(classify_ref("noai.duckduckgo.com") == "search", "noai 镜像应归 search")
    check(classify_ref("") == "direct", "空 referrer 应归 direct")
    check(classify_ref(None) == "direct", "None referrer 应归 direct")
    check(classify_ref("betwinnermirror.com") == "other", "未知站不许归 AI")

    # 爬虫识别:必须认出被截断前也能认出的名字,认不出的绝不硬猜。
    check(crawler_name("Mozilla/5.0 (compatible; OAI-SearchBot/1.3; +http") == "OAI-SearchBot", "OAI 识别")
    check(crawler_name("ClaudeBot") == "ClaudeBot", "裸 bot 名识别")
    check(crawler_name("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Geck") is None,
          "48 字符截断前缀必须落进 unidentified,不许猜成任何一家")
    check(crawler_name("") is None and crawler_name(None) is None, "空 UA 不许识别成爬虫")

    # 盲区记账:未识别的量必须被显式统计出来,否则仪表会假装自己看得见。
    summ = summarise_crawlers([
        {"key": "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai", "hits": 7, "last_day": "2026-09-08"},
        {"key": "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai", "hits": 3, "last_day": "2026-09-09"},
        {"key": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Geck", "hits": 4114, "last_day": "2026-09-09"},
    ], date(2026, 9, 9))
    check(summ["named"]["GPTBot"]["hits"] == 10, "同一爬虫的多行必须合并")
    check(summ["named"]["GPTBot"]["last_day"] == "2026-09-09", "last_day 取最大值")
    check(summ["named"]["GPTBot"]["days_since_last"] == 0, "days_since_last 应为 0")
    check(summ["unidentified_hits"] == 4114, "盲区必须显式计数")
    check(summ["unidentified_top"][0]["hits"] == 4114, "盲区要按量排序给出证据")

    # 熔断:只对「曾经出现过」的爬虫报警;沉默超过阈值必须报,阈值内不许报。
    quiet = summarise_crawlers(
        [{"key": "PerplexityBot", "hits": 5, "last_day": "2026-08-20"}], date(2026, 9, 9))
    check(len(fuse_alerts(quiet, "bpj")) == 1, "沉默 20 天必须报警")
    fresh = summarise_crawlers(
        [{"key": "PerplexityBot", "hits": 5, "last_day": "2026-09-08"}], date(2026, 9, 9))
    check(fuse_alerts(fresh, "bpj") == [], "昨天还在抓不许报警")
    check(fuse_alerts(summarise_crawlers([], date(2026, 9, 9)), "x") == [],
          "从没出现过的爬虫沉默不报警(否则是狼来了)")

    # 转化表:0 分母写 None,不写 0% —— 这是「没人来」与「来了不点」的区别。
    conv = conversion_table([
        {"cls": "ai", "pv": 33, "clicks": 2},
        {"cls": "search", "pv": 339, "clicks": 74},
        {"cls": "internal", "pv": 0, "clicks": 0},
    ])
    check(conv["ai"]["rate_pct"] == 6.1, f"ai 转化率算错:{conv['ai']['rate_pct']}")
    check(conv["search"]["rate_pct"] == 21.8, f"search 转化率算错:{conv['search']['rate_pct']}")
    check(conv["internal"]["rate_pct"] is None, "0 分母必须是 None 不是 0.0")

    # 钱:2 次点击 × €0,085 = €0,17。这就是 GEO 这条渠道 90 天的全部收入。
    money = money_from_ai(conv)
    check(money["eur"] == 0.17, f"AI 渠道收入算错:{money['eur']}")
    check(money["eur_per_ai_pv"] == 0.0052, f"每次 AI 访问价值算错:{money['eur_per_ai_pv']}")
    check(money_from_ai({})["eur_per_ai_pv"] is None, "无数据时不许编造单位价值")

    # pay-per-crawl 天花板:让这个提案每次都被算术当场杀死。
    ceil = ppc_ceiling(1067)
    check(ceil["usd_at_0.10_per_crawl"] == 106.7, "天花板算错")
    check(ppc_ceiling(0)["usd_at_0.10_per_crawl"] == 0.0, "零抓取的天花板必须是 0")

    # 渠道折叠:AI 明细要留,便于下一期对比是哪家助手在送人。
    folded = _fold_refs([
        {"host": "chatgpt.com", "pv": 19}, {"host": "www.perplexity.ai", "pv": 5},
        {"host": "duckduckgo.com", "pv": 123}, {"host": "", "pv": 405},
    ])
    check(folded["ai"] == 24 and folded["search"] == 123 and folded["direct"] == 405, "渠道折叠算错")
    check(folded["ai_by_host"]["chatgpt.com"] == 19, "AI 明细必须逐 host 留底")

    for f in fails:
        print(f"FAIL: {f}")
    print(f"selftest: {'PASS' if not fails else str(len(fails)) + ' FAILED'}")
    return 1 if fails else 0


# ── main ───────────────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", metavar="PATH", help="写 JSON 到这个路径")
    ap.add_argument("--selftest", action="store_true", help="离线自检,不碰网络")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    if not account:
        print("CLOUDFLARE_ACCOUNT_ID 未设置", file=sys.stderr)
        return 1

    today = datetime.now(timezone.utc).date()
    ledger, alerts = build(account, today)

    ok = ledger["fleet"]["sites_ok"]
    if args.write:
        os.makedirs(os.path.dirname(args.write) or ".", exist_ok=True)
        with open(args.write, "w", encoding="utf-8") as fh:
            json.dump(ledger, fh, ensure_ascii=False, indent=2, sort_keys=True)
            fh.write("\n")
    print(json.dumps(ledger["fleet"], ensure_ascii=False, indent=2))
    for site, data in ledger["sites"].items():
        if not data.get("ok"):
            print(f"::warning::geo-ledger {site} 取数失败:{data.get('reason')}")

    if not ok:
        # 一个站都取不到 = 仪表坏了。这只是 warning:D1 抖动不该烧掉 heartbeat
        # 那条「唯一不经过 AI 的告警通道」。真正的事故是下面的熔断。
        print("::warning::geo-ledger 所有站取数失败,本次不产出可信读数", file=sys.stderr)
        return 1

    for a in alerts:
        print(f"::error::{a}")
    return 2 if alerts else 0


if __name__ == "__main__":
    raise SystemExit(main())
