#!/usr/bin/env python3
"""一次 heartbeat 只打每个端点一次:GET 响应落盘备忘(2026-09-26,D1 读预算事故)。

2026-09-25 免费档 D1 每日 500 万行读取被打满,全舰队 /api/pulse 从 10:30 起 500 到午夜。
分子里有我们自己:五个读数脚本(ai_referrals / traffic_sources / money_line / mcp_usage /
backlinks)各自 urlopen 同一批端点,一次 heartbeat ≈36 次请求,每次都让 worker 重跑全部扫描。
这里把 GET 记在 `${RUNNER_TEMP or /tmp}/fleet-endpoint-cache/<sha1(url)>.json`
(status + body,TTL 6 小时),同一 run 里后来的读者直接读盘 —— 请求数降到端点数(≈15)。

纪律:
  * 只备忘 2xx。非 2xx 照旧抛 HTTPError,调用方原有的 keep-last-good 路径一字不改;
    错误永不入备忘(否则一次瞬时 500 会让五个读者六小时都读到它)。
  * 键 = URL(sha1),所以 bpj 的 reach 各处必须写成同一串 `https://baipiaoji.com/api/reach?days=28`。
  * 备忘读写全部 try/except:盘不可写就退化成普通 GET,读数永不因备忘而失败。
  * `tries` 缺省 1(读者此前不重试,不加负载);>1 时只在网络错误 / 5xx 上重试,上限 3,
    200 永不重取(内容断言失败是调用方的事,不是网络的事)。

用法: from endpoint_cache import fetch_url, fetch_json
      python3 tools/fleet/endpoint_cache.py --selftest
"""
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request

TTL_SECONDS = 6 * 3600
MAX_TRIES = 3
_SLEEP = time.sleep  # 自检里换成空操作
DEFAULT_UA = "fleet-heartbeat/endpoint_cache (+https://github.com/f-tiger/agi-site)"


def cache_dir():
    return os.path.join(os.environ.get("RUNNER_TEMP") or "/tmp", "fleet-endpoint-cache")


def cache_path(url):
    return os.path.join(cache_dir(), hashlib.sha1(url.encode("utf-8")).hexdigest() + ".json")


def _read_memo(url, now):
    try:
        with open(cache_path(url), encoding="utf-8") as f:
            m = json.load(f)
        if m.get("url") == url and now - float(m.get("fetched", 0)) <= TTL_SECONDS and 200 <= int(m.get("status", 0)) < 300:
            return m
    except Exception:
        pass
    return None


def _write_memo(url, status, body, now):
    try:
        os.makedirs(cache_dir(), exist_ok=True)
        tmp = cache_path(url) + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({"url": url, "status": status, "body": body, "fetched": now}, f, ensure_ascii=False)
        os.replace(tmp, cache_path(url))
    except Exception:
        pass


def _open(url, timeout, headers):
    """真正的 GET → (status, body)。非 2xx 由 urllib 抛 HTTPError。自检时被替换。"""
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", "replace")


def fetch_url(url, timeout=20, ua=DEFAULT_UA, accept="application/json", tries=1, opener=None, now=None):
    """GET url → (status, body_text)。同一 run 内命中备忘就不出网。

    非 2xx 抛 urllib.error.HTTPError(与 urlopen 相同),网络错误抛 URLError —— 调用方的
    异常路径与改造前一致。"""
    now = time.time() if now is None else now
    hit = _read_memo(url, now)
    if hit is not None:
        return int(hit["status"]), hit["body"]
    headers = {"User-Agent": ua, "Accept": accept}
    tries = max(1, min(int(tries), MAX_TRIES))
    last = None
    for attempt in range(tries):
        try:
            status, body = (opener or _open)(url, timeout, headers)
            _write_memo(url, status, body, now)
            return status, body
        except urllib.error.HTTPError as e:
            last = e
            if e.code < 500:
                raise
        except (urllib.error.URLError, OSError, TimeoutError) as e:
            last = e
        if attempt + 1 < tries:
            _SLEEP(2 * (attempt + 1))
    raise last


def fetch_json(url, timeout=20, ua=DEFAULT_UA, tries=1, opener=None, now=None):
    _, body = fetch_url(url, timeout=timeout, ua=ua, accept="application/json", tries=tries, opener=opener, now=now)
    return json.loads(body)


def selftest():
    import tempfile
    global _SLEEP
    _SLEEP = lambda s: None
    calls = []
    memo = {}

    def fake(url, timeout, headers):
        calls.append(url)
        if url.endswith("/500"):
            raise urllib.error.HTTPError(url, 500, "boom", {}, None)
        if url.endswith("/404"):
            raise urllib.error.HTTPError(url, 404, "nope", {}, None)
        if url.endswith("/net"):
            raise urllib.error.URLError("unreachable")
        return 200, json.dumps({"ok": True, "n": len(calls)})

    old = os.environ.get("RUNNER_TEMP")
    tmp = tempfile.mkdtemp()
    os.environ["RUNNER_TEMP"] = tmp
    try:
        u = "https://example.test/api/pulse"
        a = fetch_url(u, opener=fake, now=1000.0)
        n_a = calls.count(u)
        b = fetch_url(u, opener=fake, now=1000.0 + 5 * 3600)
        n_b = calls.count(u)
        c = fetch_url(u, opener=fake, now=1000.0 + 7 * 3600)
        n_c = calls.count(u)
        j = fetch_json(u, opener=fake, now=1000.0 + 7 * 3600 + 60)
        n_j = calls.count(u)
        checks = [
            ("第一次真的出网", n_a == 1 and calls[0] == u),
            ("6h 内第二次读盘,不出网", a == b and n_b == 1),
            ("超过 TTL 重取", c != b and n_c == 2),
            ("fetch_json 命中备忘并解析", j["ok"] is True and j["n"] == 2 and n_j == 2),
            ("键是 URL:不同 query 不同备忘", cache_path(u) != cache_path(u + "?days=28")),
            ("5xx 不入备忘且抛 HTTPError", _raises(lambda: fetch_url(u + "/500", opener=fake), urllib.error.HTTPError)
             and not os.path.exists(cache_path(u + "/500"))),
            ("4xx 不重试(tries=3 仍只打一次)", (lambda n0: _raises(lambda: fetch_url(u + "/404", opener=fake, tries=3), urllib.error.HTTPError)
                                                and calls.count(u + "/404") == 1)(0)),
            ("5xx tries=3 最多三次", _raises(lambda: fetch_url(u + "/500", opener=fake, tries=3), urllib.error.HTTPError)
             and calls.count(u + "/500") == 1 + 3),
            ("tries 上限 3", _raises(lambda: fetch_url(u + "/net", opener=fake, tries=9), urllib.error.URLError)
             and calls.count(u + "/net") == 3),
            ("备忘目录在 RUNNER_TEMP 下", cache_dir().startswith(tmp)),
        ]
    finally:
        if old is None:
            os.environ.pop("RUNNER_TEMP", None)
        else:
            os.environ["RUNNER_TEMP"] = old
    ok = True
    for label, cond in checks:
        print(("ok   " if cond else "FAIL ") + label)
        ok = ok and bool(cond)
    print("selftest:", "ok" if ok else "FAILED")
    return 0 if ok else 1


def _raises(fn, exc=Exception):
    try:
        fn()
    except exc:
        return True
    except Exception:
        return False
    return False


if __name__ == "__main__":
    sys.exit(selftest() if "--selftest" in sys.argv else 0)
