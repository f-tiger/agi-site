#!/usr/bin/env python3
"""D1 读预算护栏(2026-09-26;事故 2026-09-25)。stdlib only。

2026-09-25 账号打满 Workers Free 的 D1 上限:**每日 500 万行读取,全部数据库合计,00:00 UTC 重置**
(rows_read = 扫描过的行,不是返回的行)。10:30 起到午夜所有 D1 读失败:13 个站 /api/pulse 500、
bpj 广告位停售、先 SELECT 再 INSERT 的写入丢失。没有任何仪器在看这个数,是事后从 500 里推出来的。

本工具每日随 heartbeat 向 Cloudflare GraphQL 问一次 `d1AnalyticsAdaptiveGroups`(昨天..今天 UTC),
写 `data/fleet-d1-budget.json`:逐库与合计、昨天全天、今天到现在、今天的**节奏**
(rows_so_far ÷ 已过小时 × 24)、前三名。判定:昨天合计或今天节奏 **>40%** 上限 → ::warning::;
**>60%** → ::error:: + exit 1(heartbeat 变红 = GitHub 邮件,唯一不经 AI 的告警通道)。

token 缺 Analytics 权限(GraphQL 回鉴权错误)时 **不红**:打 ::warning:: 写明所需 scope
「Account Analytics: Read」,JSON 里 `"status":"unreadable"` —— 让它不可能被误读成绿。
keep-last-good 同其他读数:网络类失败保留上一份,连续 >3 天读不到才红。永不打印 token / 账号 id。

用法: python3 tools/fleet/d1_budget.py [--selftest]
"""
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "fleet-d1-budget.json")
GQL = "https://api.cloudflare.com/client/v4/graphql"
QUERY = ("query($a:String!,$s:Date!,$e:Date!){viewer{accounts(filter:{accountTag:$a})"
         "{d1AnalyticsAdaptiveGroups(limit:10000,filter:{date_geq:$s,date_leq:$e})"
         "{sum{rowsRead rowsWritten readQueries} dimensions{date databaseId}}}}}")
LIMIT = 5_000_000
PLAN = "workers-free"
WARN_PCT, RED_PCT = 40, 60
GRACE_DAYS = 3
TOKEN_ENVS = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_TOKEN_ZONE", "CF_API_TOKEN"]
SCOPE_NEEDED = "Account Analytics: Read"

DB_NAMES = {
    "f84f9d29-3ad9-4b37-b28e-3a78027d2f22": "agiscorecard-events",
    "1ee08cb8-a174-4ec3-8dbc-89ef5d28aa05": "baipiaoji-hits",
    "75e45e05-44b5-4c56-9a3b-dd504b5c53f1": "ecoback-events",
    "bd3b1ca9-e9cb-4b71-9834-df3d67b39504": "gridlings-events",
    "6109b81e-c970-47d7-b7fc-3a2a15f68ed2": "after35-events",
    "6e71ddc6-b58c-49f4-b6f5-207f3778133f": "dollscout-events",
    "2bebbaef-aa46-4b75-89ca-77920ad4f863": "gamesledger-events",
    "f92b6207-90bf-46f6-97c7-cc88195b2ec7": "sourceradar-events",
    "77a0a152-6345-450e-83eb-6f26f246c0b8": "goldrush-events",
    "71f9d85f-1363-48f4-85ee-a445fb9dd203": "agimatch-events",
}


def db_name(dbid):
    return DB_NAMES.get(dbid) or ("unknown:" + str(dbid)[:8])


def aggregate(groups, yday, today):
    """Pure: GraphQL groups → {date: {"rows_read", "rows_written", "read_queries", "by_db"}} for the two days."""
    out = {d: {"rows_read": 0, "rows_written": 0, "read_queries": 0, "by_db": {}} for d in (yday, today)}
    unknown = set()
    for g in groups or []:
        dim, s = g.get("dimensions") or {}, g.get("sum") or {}
        day = dim.get("date")
        if day not in out:
            continue
        name = db_name(dim.get("databaseId"))
        if name.startswith("unknown:"):
            unknown.add(dim.get("databaseId"))
        row = out[day]["by_db"].setdefault(name, {"rows_read": 0, "rows_written": 0, "read_queries": 0})
        for k, src in (("rows_read", "rowsRead"), ("rows_written", "rowsWritten"), ("read_queries", "readQueries")):
            v = int(s.get(src) or 0)
            row[k] += v
            out[day][k] += v
    for d in out:
        out[d]["by_db"] = dict(sorted(out[d]["by_db"].items(), key=lambda kv: -kv[1]["rows_read"]))
    return out, sorted(x for x in unknown if x)


def pace(rows_so_far, hours_elapsed):
    """今天的节奏:到现在的行数 ÷ 已过小时 × 24。不足 15 分钟按 15 分钟算,避免除零把节奏吹上天。"""
    return int(round(rows_so_far / max(float(hours_elapsed), 0.25) * 24))


def verdict(yesterday_rows, pace_rows, limit=LIMIT):
    """Pure: → ("ok"|"warning"|"error", pct_yesterday, pct_pace)。>40% 警告,>60% 红。"""
    fy = 100.0 * yesterday_rows / limit
    fp = 100.0 * pace_rows / limit
    # 比较用未取整的比例:3,000,001 行取整后是 60.0%,本该是红,取整会把它判成警告。
    worst = max(fy, fp)
    return ("error" if worst > RED_PCT else "warning" if worst > WARN_PCT else "ok"), round(fy, 1), round(fp, 1)


_AUTH_RE = re.compile(r"auth|permission|not allowed|denied|forbidden|token", re.I)


def is_auth_error(status, body):
    """HTTP 401/403,或 GraphQL errors[] 里的鉴权类信息(code authz/authn 或 message 提到 auth/permission…)。"""
    if status in (401, 403):
        return True
    for e in (body or {}).get("errors") or []:
        code = str(((e.get("extensions") or {}).get("code") or "")).lower()
        if code in ("authz", "authn", "unauthorized", "forbidden") or _AUTH_RE.search(str(e.get("message") or "")):
            return True
    return False


def top3(days, yday, today):
    names = set(days[yday]["by_db"]) | set(days[today]["by_db"])
    rows = [{"db": n,
             "rows_read_yesterday": days[yday]["by_db"].get(n, {}).get("rows_read", 0),
             "rows_read_today": days[today]["by_db"].get(n, {}).get("rows_read", 0)} for n in names]
    rows.sort(key=lambda r: (-r["rows_read_yesterday"], -r["rows_read_today"], r["db"]))
    return rows[:3]


def gql(token, acct, start, end, timeout=30):
    """→ (http_status, body_dict)。非 JSON 抛。永不打印 token。"""
    data = json.dumps({"query": QUERY, "variables": {"a": acct, "s": start, "e": end}}).encode()
    req = urllib.request.Request(GQL, data=data, method="POST",
                                 headers={"Authorization": "Bearer " + token, "Content-Type": "application/json",
                                          "User-Agent": "fleet-heartbeat/d1_budget (+https://github.com/f-tiger/agi-site)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8", "replace"))
        except Exception:
            body = {"errors": [{"message": "HTTP %d" % e.code}]}
        return e.code, body


def load_last():
    try:
        with open(OUT, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def age_days(snap, today):
    try:
        return (today - dt.date.fromisoformat(snap["generated"][:10])).days
    except Exception:
        return 10 ** 6


def write(doc):
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("wrote " + os.path.relpath(OUT, ROOT))


def build(days, unknown, yday, today, now, token_env):
    hours = now.hour + now.minute / 60.0 + now.second / 3600.0
    y, t = days[yday], days[today]
    p = pace(t["rows_read"], hours)
    v, py, pp = verdict(y["rows_read"], p)
    return {
        "generated": now.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "status": "ok", "plan": PLAN, "limit": LIMIT,
        "metric": "rows_read = rows scanned by D1, summed over every database in the account, per UTC day (resets 00:00 UTC)",
        "thresholds_pct": {"warning": WARN_PCT, "error": RED_PCT},
        "token_env": token_env,
        "yesterday": {"date": yday, "rows_read": y["rows_read"], "rows_written": y["rows_written"],
                      "read_queries": y["read_queries"], "pct_of_limit": py, "by_db": y["by_db"]},
        "today": {"date": today, "hours_elapsed": round(hours, 2), "rows_read_so_far": t["rows_read"],
                  "rows_written_so_far": t["rows_written"], "read_queries_so_far": t["read_queries"],
                  "pace_rows_read": p, "pct_of_limit_at_pace": pp, "by_db": t["by_db"]},
        "top3": top3(days, yday, today),
        "unknown_database_ids": unknown,
        "verdict": v,
    }


def selftest():
    yday, today = "2026-09-25", "2026-09-26"
    groups = [
        {"sum": {"rowsRead": 3_000_000, "rowsWritten": 10, "readQueries": 200}, "dimensions": {"date": yday, "databaseId": "1ee08cb8-a174-4ec3-8dbc-89ef5d28aa05"}},
        {"sum": {"rowsRead": 1_500_000, "rowsWritten": 5, "readQueries": 100}, "dimensions": {"date": yday, "databaseId": "f84f9d29-3ad9-4b37-b28e-3a78027d2f22"}},
        {"sum": {"rowsRead": 700_000, "rowsWritten": 1, "readQueries": 9}, "dimensions": {"date": yday, "databaseId": "1ee08cb8-a174-4ec3-8dbc-89ef5d28aa05"}},
        {"sum": {"rowsRead": 400_000, "rowsWritten": 0, "readQueries": 4}, "dimensions": {"date": today, "databaseId": "75e45e05-44b5-4c56-9a3b-dd504b5c53f1"}},
        {"sum": {"rowsRead": 12, "rowsWritten": 0, "readQueries": 1}, "dimensions": {"date": today, "databaseId": "deadbeef-0000-0000-0000-000000000000"}},
        {"sum": {"rowsRead": 999, "rowsWritten": 0, "readQueries": 1}, "dimensions": {"date": "2026-09-01", "databaseId": "f84f9d29-3ad9-4b37-b28e-3a78027d2f22"}},
    ]
    days, unknown = aggregate(groups, yday, today)
    now = dt.datetime(2026, 9, 26, 8, 0, 0, tzinfo=dt.timezone.utc)
    doc = build(days, unknown, yday, today, now, "CLOUDFLARE_API_TOKEN")
    checks = [
        ("query string is the spec's, verbatim", QUERY == "query($a:String!,$s:Date!,$e:Date!){viewer{accounts(filter:{accountTag:$a}){d1AnalyticsAdaptiveGroups(limit:10000,filter:{date_geq:$s,date_leq:$e}){sum{rowsRead rowsWritten readQueries} dimensions{date databaseId}}}}}"),
        ("10 databases, ids unique, names unique", len(DB_NAMES) == 10 and len(set(DB_NAMES.values())) == 10),
        ("same db on one day is summed", days[yday]["by_db"]["baipiaoji-hits"]["rows_read"] == 3_700_000),
        ("yesterday total", days[yday]["rows_read"] == 5_200_000 and days[yday]["read_queries"] == 309),
        ("rows outside the window are ignored", days[today]["rows_read"] == 400_012),
        ("unknown id is named, not hidden", unknown == ["deadbeef-0000-0000-0000-000000000000"] and "unknown:deadbeef" in days[today]["by_db"]),
        ("pace: 400,012 rows in 8 h → 1,200,036/day", doc["today"]["pace_rows_read"] == 1_200_036),
        ("pace guards a near-zero elapsed time", pace(100, 0.01) == pace(100, 0.25)),
        ("verdict: >60% is error", verdict(3_000_001, 0)[0] == "error"),
        ("verdict: exactly 60% is warning, not error", verdict(3_000_000, 0)[0] == "warning"),
        ("verdict: >40% via pace is warning", verdict(0, 2_000_001)[0] == "warning"),
        ("verdict: exactly 40% is ok", verdict(2_000_000, 0)[0] == "ok"),
        ("sample doc is error (yesterday 104%)", doc["verdict"] == "error" and doc["yesterday"]["pct_of_limit"] == 104.0),
        ("top3 ordered by yesterday then today", [r["db"] for r in doc["top3"]] == ["baipiaoji-hits", "agiscorecard-events", "ecoback-events"]),
        ("doc carries plan/limit/status/generated", doc["plan"] == PLAN and doc["limit"] == 5_000_000 and doc["status"] == "ok" and doc["generated"] == "2026-09-26T08:00:00Z"),
        ("auth: HTTP 403", is_auth_error(403, {})),
        ("auth: GraphQL authz code", is_auth_error(200, {"data": None, "errors": [{"message": "x", "extensions": {"code": "authz"}}]})),
        ("auth: message mentions permission", is_auth_error(200, {"errors": [{"message": "user does not have permission to access account analytics"}]})),
        ("auth: a plain 5xx is not an auth error", not is_auth_error(502, {"errors": [{"message": "upstream timeout"}]})),
        ("auth: an ok body is not an auth error", not is_auth_error(200, {"data": {"viewer": {"accounts": []}}, "errors": None})),
    ]
    ok = True
    for label, cond in checks:
        print(("ok   " if cond else "FAIL ") + label)
        ok = ok and bool(cond)
    print("selftest:", "ok" if ok else "FAILED")
    return 0 if ok else 1


def unreadable(reason, last, now, exit_code=0, scope=False):
    """写一份不可能被当成绿的文件:status=unreadable,上一份的读数放进 last_good(如有)。"""
    doc = {"generated": now.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
           "status": "unreadable", "plan": PLAN, "limit": LIMIT, "reason": reason,
           "scope_needed": SCOPE_NEEDED if scope else None,
           "last_good": {k: last.get(k) for k in ("generated", "yesterday", "today", "verdict")} if last and last.get("status") == "ok" else None}
    write(doc)
    return exit_code


def main(argv):
    if "--selftest" in argv:
        return selftest()
    now = dt.datetime.now(dt.timezone.utc)
    today = now.date()
    yday = (today - dt.timedelta(days=1)).isoformat()
    last = load_last()
    acct = (os.environ.get("CLOUDFLARE_ACCOUNT_ID") or "").strip()
    if not acct:
        print("::warning::D1 budget: CLOUDFLARE_ACCOUNT_ID unset — cannot query analytics; writing status=unreadable")
        return unreadable("CLOUDFLARE_ACCOUNT_ID unset", last, now)
    seen, auth_failed, net_failed = set(), [], []
    for name in TOKEN_ENVS:
        tok = (os.environ.get(name) or "").strip()
        if not tok or tok in seen:
            print(f"  {name}: {'unset' if not tok else 'same value as an earlier one, skipped'}")
            continue
        seen.add(tok)
        try:
            status, body = gql(tok, acct, yday, today.isoformat())
        except Exception as e:
            net_failed.append(f"{name}: {type(e).__name__} {str(e)[:80]}")
            print(f"  {name}: request failed ({type(e).__name__})")
            continue
        if is_auth_error(status, body):
            msg = "; ".join(str(e.get("message") or "")[:80] for e in (body.get("errors") or [])) or f"HTTP {status}"
            auth_failed.append(f"{name}: {msg}")
            print(f"  {name}: no analytics scope ({msg[:80]})")
            continue
        if status != 200 or body.get("errors"):
            msg = "; ".join(str(e.get("message") or "")[:80] for e in (body.get("errors") or [])) or f"HTTP {status}"
            net_failed.append(f"{name}: {msg}")
            print(f"  {name}: GraphQL error ({msg[:80]})")
            continue
        accounts = (((body.get("data") or {}).get("viewer") or {}).get("accounts")) or []
        groups = (accounts[0] if accounts else {}).get("d1AnalyticsAdaptiveGroups") or []
        days, unknown = aggregate(groups, yday, today.isoformat())
        doc = build(days, unknown, yday, today.isoformat(), now, name)
        write(doc)
        y, t = doc["yesterday"], doc["today"]
        print(f"D1 rows_read: yesterday {y['rows_read']:,} ({y['pct_of_limit']}% of {LIMIT:,}); "
              f"today {t['rows_read_so_far']:,} in {t['hours_elapsed']} h → pace {t['pace_rows_read']:,} ({t['pct_of_limit_at_pace']}%)")
        for r in doc["top3"]:
            print(f"  {r['db']:<22} yesterday {r['rows_read_yesterday']:>10,}  today {r['rows_read_today']:>10,}")
        if unknown:
            print("::warning::D1 budget: database ids not in the name table: " + ", ".join(unknown))
        if doc["verdict"] == "error":
            print(f"::error::D1 read budget over {RED_PCT}% of the {PLAN} limit ({LIMIT:,} rows/day): "
                  f"yesterday {y['pct_of_limit']}%, today's pace {t['pct_of_limit_at_pace']}%. "
                  "Above 100% every D1 read in the account fails until 00:00 UTC (2026-09-25 outage).")
            return 1
        if doc["verdict"] == "warning":
            print(f"::warning::D1 read budget over {WARN_PCT}% of the {PLAN} limit: "
                  f"yesterday {y['pct_of_limit']}%, today's pace {t['pct_of_limit_at_pace']}%")
        return 0
    if auth_failed and not net_failed:
        print(f"::warning::D1 budget unreadable: no token has the GraphQL analytics scope. "
              f"Add \"{SCOPE_NEEDED}\" to one of {' / '.join(TOKEN_ENVS)}. "
              "Not failing the heartbeat for a missing scope; data/fleet-d1-budget.json says status=unreadable.")
        return unreadable("no token with the analytics scope: " + " | ".join(auth_failed), last, now, 0, scope=True)
    why = " | ".join(net_failed + auth_failed) or "no token set"
    if not seen:
        print(f"::warning::D1 budget: none of {' / '.join(TOKEN_ENVS)} is set; writing status=unreadable")
        return unreadable(why, last, now)
    # 网络类失败:keep-last-good,连续 >3 天读不到才红。
    age = age_days(last, today) if last else 10 ** 6
    if last and last.get("status") == "ok" and age <= GRACE_DAYS:
        print(f"::warning::D1 budget read failed ({why[:160]}); last good snapshot is {age} d old, keeping it")
        return 0
    if last and last.get("status") == "ok":
        print(f"::error::D1 budget read has failed for {age} days ({why[:160]})")
        return 1
    print(f"::warning::D1 budget read failed ({why[:160]}); no good snapshot yet, writing status=unreadable")
    return unreadable(why, last, now)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
