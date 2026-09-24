#!/usr/bin/env python3
"""舰队级引荐来源分类器一致性检查(2026-09-15「舰队相互学习」)。

起因:14 个站每一次 page_view 都存了 `ref`,但读侧工具(ai_referrals.py)只数 AI 主机——
**除 eco 外没有任何一个站知道自己的读者从哪来**。09-15 手查 bpj 得到的答案直接推翻了舰队
当时的推论:bpj 第一大来源是 Google(157/305),而 eco 的 Google 是 0。同一支舰队,两个
相反的渠道。谁都不知道自己属于哪一种,就没法互相学。

规矩(与 bot_ua.txt 同源,那次的教训是六份分歧正则让各站台账不可比):
  * `tools/fleet/ref_sources.txt` 是唯一权威;每个 worker 里的字面量必须与它逐字相同。
  * 匹配是**标签对齐**的(`"." + host` 里找 `"." + token`),不是裸 includes ——
    裸 includes 会把 netflix.com 判成 x.com(social)。
  * 分类逻辑不在这里重写一遍:本脚本把 worker 里**真正那段代码**抠出来交给 node 跑,
    所以测的是线上跑的那一份,不是一个平行实现。
  * 两个方向都测:该命中的必须命中,不该命中的必须落进 other/self/direct。任一失败 → 退出 1。
挂在 fleet-heartbeat 里跑,漂了就走 GitHub 失败邮件(唯一不经过 AI 会话的告警通道)。
"""
import json, pathlib, re, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
CANON = (ROOT / "tools/fleet/ref_sources.txt").read_text(encoding="utf-8").strip()

FILES = [
    "sites/agiscorecard/tools/analytics-worker/index.js",
    "sites/getecoback/src/worker.js",
    "sites/goldrush/worker.js",
    "sites/gridlings/worker.js",
    "sites/buysomething/worker.js",
    "sites/gamesledger/worker.js",
    "sites/after35/worker.js",
    "sites/learn/worker.js",
    "sites/fanzha/worker.js",
    "sites/firstjob/worker.js",
    "sites/codeword/worker.js",
    "sites/powerbill/worker.js",
    "sites/thedollscout/functions/api/pulse.js",
]
# bpj 不在此列:它的 /api/reach 本来就返回来源域名榜,读侧 traffic_sources.py 在自己那边分桶。

SELF = "agiscorecard.com"
CASES = [
    ("", "direct"), (None, "direct"),
    ("https://www.google.com/search?q=agi+timeline", "search"),
    ("cn.bing.com", "search"), ("www.bing.com", "search"), ("duckduckgo.com", "search"),
    ("m.baidu.com", "search"), ("yandex.com.tr", "search"), ("search.yahoo.com", "search"),
    ("www.ecosia.org", "search"), ("news.google.com", "search"),
    ("chatgpt.com", "ai"), ("www.perplexity.ai", "ai"), ("claude.ai", "ai"),
    ("gemini.google.com", "ai"), ("copilot.microsoft.com", "ai"), ("kagi.com", "ai"),
    ("agiscorecard.com", "self"), ("www.agiscorecard.com", "self"),
    # 2026-09-24:Cloudflare 预览/部署主机(*.pages.dev / *.workers.dev)是本站自己的构建,不是外链。
    # 不这样分,tds 09-23 一次预览环境 QA 就会在 by_other 里记 71 次「挣到的外链」,把 fleet-backlinks-1116 推过线。
    ("dollscout.pages.dev", "self"), ("https://aiyangmao.pages.dev/en/", "self"), ("preview.x.workers.dev", "self"),
    ("play.agiscorecard.com", "fleet"), ("getecoback.com", "fleet"),
    ("baipiaoji.com", "fleet"), ("thedollscout.com", "fleet"),
    ("t.co", "social"), ("m.facebook.com", "social"), ("news.ycombinator.com", "social"),
    ("www.reddit.com", "social"), ("x.com", "social"),
    # 下面这些必须 NOT 被误分类 —— 裸 includes 时代它们全是误判
    ("netflix.com", "other"), ("mybing.example.org", "other"), ("notgoogle.org", "other"),
    ("someblog.example.com", "other"), ("agiscorecard.com.evil.example", "other"),
    ("pages.dev.evil.example", "other"),
]

BLOCK = re.compile(r"(const REF_SRC = .*?^const srcBucket = .*?^\};)", re.M | re.S)


def sync() -> int:
    """把 ref_sources.txt 的新内容写回 13 份字面量。改权威文件之后跑这个,别手改 worker。"""
    changed = 0
    lit = re.compile(r"const REF_SRC = (['\"])(.*?)\1;")
    for rel in FILES:
        p = ROOT / rel
        text = p.read_text(encoding="utf-8")
        m = lit.search(text)
        if not m:
            print(f"::error::{rel}: 找不到 const REF_SRC 字面量")
            return 1
        if m.group(2) == CANON:
            continue
        q = m.group(1)
        p.write_text(text.replace(m.group(0), f"const REF_SRC = {q}{CANON}{q};"), encoding="utf-8")
        changed += 1
    print(f"ref sources: synced {changed} file(s) from tools/fleet/ref_sources.txt")
    return 0


def main() -> int:
    bad = 0
    for rel in FILES:
        p = ROOT / rel
        text = p.read_text(encoding="utf-8")
        for q in ('"', "'"):
            if (q + CANON + q) in text:
                hits = text.count(q + CANON + q)
                break
        else:
            print(f"::error::{rel}: 没有与 tools/fleet/ref_sources.txt 逐字相同的分类表字面量")
            bad = 1
            continue
        if hits != 1:
            print(f"::error::{rel}: 分类表字面量出现 {hits} 次(应为 1 次)")
            bad = 1
        m = BLOCK.search(text)
        if not m:
            print(f"::error::{rel}: 抠不出 REF_SRC/srcHost/srcBucket 代码块")
            bad = 1
            continue
        harness = m.group(1) + "\nconst CASES = " + json.dumps(CASES) + ";\n" + f"""
const SELF = srcHost({json.dumps(SELF)});
let fail = 0;
for (const [ref, want] of CASES) {{
  const got = srcBucket(srcHost(ref), SELF);
  if (got !== want) {{ console.log(`  ${{JSON.stringify(ref)}} -> ${{got}} (expected ${{want}})`); fail++; }}
}}
process.exit(fail ? 1 : 0);
"""
        with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False, encoding="utf-8") as fh:
            fh.write(harness)
            tmp = fh.name
        r = subprocess.run(["node", tmp], capture_output=True, text=True)
        pathlib.Path(tmp).unlink(missing_ok=True)
        if r.returncode != 0:
            print(f"::error::{rel}: 分类结果与预期不符")
            print(r.stdout.rstrip() or r.stderr.rstrip())
            bad = 1
    print(f"ref sources: {len(FILES)} files checked, {'FAILED' if bad else 'all identical and correct'}")
    return bad


if __name__ == "__main__":
    if "--sync" in sys.argv:
        rc = sync()
        sys.exit(rc or main())
    sys.exit(main())
