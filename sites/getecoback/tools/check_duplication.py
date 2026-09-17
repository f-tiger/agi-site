#!/usr/bin/env python3
"""页族近重复度量（2026-09-17，owner:「Google没有排名，做一次深度的谷歌优化」）。

为什么存在
----------
本站 2026-09-17 的 D1 读数:DACH 28 天真人 pv 里 Google 引荐 **0**,而同期 googlebot
爬了 249 次/7 天(bingbot 314)。技术面逐项排除干净(robots 全放行、canonical 正确、
无 noindex、hreflang 在位、sitemap 209 条、IndexNow 已接、Googlebot 与真人拿到逐字节
相同的 HTML)。剩下的唯一有证据的解释是**内容重复度**:

    剔掉全站样板后,兄弟页之间的 8-gram Jaccard 相似度(2026-09-17 首测)
      heizung-N-qm          7 页   54.0%   → 同日改写后 **19.5%**
      luftentfeuchter-N-qm  6 页   52.4%
      klimaanlage-N-qm      7 页   32.1%
      对照(随机两页,不同主题)      1.3%

兄弟页共享的独有正文是无关页面的 **40 倍**。这正是 Google 压制、Bing 容忍的门页形态,
与「爬得勤但零排名 / Bing 却收了约 50 条」完全吻合。

同日第二个发现:这个度量当时只看 `site/guide/*.html`,于是**英语与意语的同形页族从来
没被测过**。收进来之后,舰队里最像门页的其实是英语的 `dehumidifier-N-sqm`(6 页 61.4%),
比任何德语页族都高。先修德语只是因为判定线押在那儿,不是因为它最坏。

这个脚本把那句判断变成一个**每次部署都会重算的数字**,这样:
  ① 谁去改写正文都有客观靶子,不靠感觉;
  ② 改完能证明确实降下来了,而不是「感觉不那么像了」;
  ③ 以后新增页族时,重复度回升会立刻被看见。

**它不改任何内容,只报数。** 阈值默认只警告不拦部署——今天的读数本来就超标,
上线即红会把一个待办变成一条坏掉的流水线。要强制时加 --gate。

用法
----
    python3 tools/check_duplication.py                 # 报数,写 data/duplication.json
    python3 tools/check_duplication.py --gate --max 40 # 超过 40% 即退出码 1
    python3 tools/check_duplication.py --selftest      # 零 IO 夹具自测
"""
import argparse, glob, html, itertools, json, os, re, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = 8                     # shingle 长度:8 个词足够长到不会偶然撞上,短到能抓住改写不彻底
BOILER_SHARE = 0.25       # 出现在 ≥25% 页面上的 n-gram 视为全站样板,先剔除
MIN_FAMILY = 3            # 少于 3 页不成族,两页雷同可能只是正当的对照写法

# 已经改写过的页族的回归天花板(--regress 时生效,超过即退出码 1)。
# 报数默认不拦部署——今天多数页族本来就超标,上线即红会把待办变成坏掉的流水线。
# 但**已经修好的**页族回升是另一回事:那意味着有人重跑了 gen_heizung_qm.py 这类
# 一次性脚手架,或者把差异化注入器从部署链里拿掉了。那是事故,不是待办。
# 每族两个天花板:平均值 + **最差的一对**。平均值一个人扛不动——实测把 7 页里的 2 页
# 还原回旧版,平均只从 19,5% 升到 21,6%,而那两页彼此的相似度是 54,8%。真正的事故形态
# (重跑脚手架、注入器被拿出部署链)会把两个数都顶穿,只盯平均会漏掉一半。
CEILINGS = {"heizung-N-qm": (25.0, 30.0)}   # 2026-09-17 改写后 19,5% / 最差 20,4%(改写前 54,0% / 55,3%)


def visible(path_or_html, is_html_text=False):
    """HTML → 可见文本。script/style 必须先去掉:内联 JSON-LD 与行为脚本全站一致,
    留着会把相似度整体抬高,让真正的正文重复被稀释掉。"""
    s = path_or_html if is_html_text else open(path_or_html, encoding="utf-8").read()
    s = re.sub(r"<script[^>]*>.*?</script>", " ", s, flags=re.S)
    s = re.sub(r"<style[^>]*>.*?</style>", " ", s, flags=re.S)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html.unescape(s))).strip()


def shingles(text, n=N):
    w = text.split()
    return {tuple(w[i:i + n]) for i in range(max(0, len(w) - n))}


# 2026-09-17:原来只认德语的 `-<数字>-qm`,于是英语 electric-heater-N-sqm(7 页)、
# dehumidifier-N-sqm(6 页)与意语 condizionatore-portatile-N-mq(3 页)**从来没被测过**。
# 「把测量到的那一半修好、另一半没人看」正是本仓反复踩的形态,所以单位一并收进来。
UNITS = ("qm", "sqm", "mq")


def family_of(slug):
    """页族键:把结尾的「-<数字>-<单位>」抽掉。这是本站唯一的批量页形态;
    其余页各写各的,不该被硬凑成族。返回 None = 不属于任何族。"""
    m = re.match(r"^(.*)-\d+-(%s)$" % "|".join(UNITS), slug)
    return f"{m.group(1)}-N-{m.group(2)}" if m else None


def analyse(pages):
    """pages: {slug: html_text} → {family: {...}}。样板以**全站**为基准剔除,
    因为 Google 看到的重复是相对整站而言的。"""
    sh = {s: shingles(visible(h, True)) for s, h in pages.items()}
    cnt = Counter()
    for s in sh.values():
        cnt.update(s)
    thr = max(2, int(len(pages) * BOILER_SHARE))
    boiler = {g for g, c in cnt.items() if c >= thr}

    fams = {}
    for slug in pages:
        f = family_of(slug)
        if f:
            fams.setdefault(f, []).append(slug)

    out = {}
    for f, members in sorted(fams.items()):
        if len(members) < MIN_FAMILY:
            continue
        # 页族大到占语料 ≥BOILER_SHARE 时,它自己的重复会被当成全站样板剔掉,
        # 读数会假性偏低。宁可大声说不知道,也不要报一个骗人的低数字。
        if len(members) >= max(2, int(len(pages) * BOILER_SHARE)):
            out[f] = {"pages": len(members), "avg_similarity": None,
                      "note": "页族规模已达样板阈值,本方法在此语料下测不准(会把自身重复当样板剔除)"}
            continue
        core = {m: sh[m] - boiler for m in members}
        sims = []
        for a, b in itertools.combinations(sorted(members), 2):
            u = len(core[a] | core[b])
            sims.append((len(core[a] & core[b]) / u if u else 0.0, a, b))
        avg = sum(s[0] for s in sims) / len(sims)
        worst = max(sims)
        out[f] = {
            "pages": len(members),
            "avg_similarity": round(avg, 4),
            "worst_similarity": round(worst[0], 4),
            "worst_pair": [worst[1], worst[2]],
            "median_unique_shingles": sorted(len(c) for c in core.values())[len(members) // 2],
        }
    return out, len(boiler)


def baseline_control(pages, sample=40):
    """对照组:随机的不同主题两页。没有它,「54%」是个没有意义的数字——
    读者无法判断它算高还是算正常。"""
    import random
    random.seed(7)
    slugs = [s for s in pages if not family_of(s)]
    if len(slugs) < 4:
        return None
    sh = {s: shingles(visible(pages[s], True)) for s in slugs}
    cnt = Counter()
    for s in sh.values():
        cnt.update(s)
    thr = max(2, int(len(slugs) * BOILER_SHARE))
    boiler = {g for g, c in cnt.items() if c >= thr}
    vals = []
    for _ in range(sample):
        a, b = random.sample(slugs, 2)
        ca, cb = sh[a] - boiler, sh[b] - boiler
        u = len(ca | cb)
        vals.append(len(ca & cb) / u if u else 0.0)
    return round(sum(vals) / len(vals), 4)


def selftest():
    ok = True
    def ck(cond, msg):
        nonlocal ok
        if not cond:
            print(f"❌ selftest: {msg}")
            ok = False

    ck(family_of("heizung-20-qm") == "heizung-N-qm", "页族键应抽掉平米数")
    ck(family_of("luftentfeuchter-40-qm") == "luftentfeuchter-N-qm", "页族键(除湿机)")
    ck(family_of("schimmel-am-fenster") is None, "非批量页不该被凑成族")
    ck(family_of("electric-heater-40-sqm") == "electric-heater-N-sqm", "英语页族(sqm)也要被认出来")
    ck(family_of("condizionatore-portatile-25-mq") == "condizionatore-portatile-N-mq", "意语页族(mq)")
    ck(family_of("heizung-20-qm") != family_of("electric-heater-20-sqm"), "不同语言不共用页族键")
    ck(visible("<script>var x='dup dup dup'</script><p>echt</p>", True) == "echt",
       "script 内容必须剔除,否则全站一致的 JSON-LD 会稀释真实重复")

    body = " ".join(f"satz {i} ueber das heizen im raum" for i in range(60))
    # 语料里必须有足够多的无关页,否则样板阈值 = max(2, 25%×页数) 会把兄弟页共享的正文
    # 当成「全站样板」剔掉,相似度算出来是 0——首次自测就踩中了这个,所以夹具照真实语料建。
    filler = {f"thema-{k}": "<p>" + " ".join(f"f{k}w{i} eigener text" for i in range(60)) + "</p>"
              for k in range(20)}
    # 三页近乎相同、只差一个数字 → 必须被判成高重复
    dup = dict(filler)
    dup.update({f"heizung-{n}-qm": f"<p>{body} fuer {n} quadratmeter</p>" for n in (10, 20, 30)})
    r, _ = analyse(dup)
    ck("heizung-N-qm" in r, "三页成族")
    ck(r["heizung-N-qm"]["avg_similarity"] > 0.8,
       f"近重复页应判高相似,实得 {r.get('heizung-N-qm',{}).get('avg_similarity')}")
    # 三页各写各的 → 必须被判成低重复。判错这个方向会让人去改写本来就没问题的页
    uniq = dict(filler)
    uniq.update({f"heizung-{n}-qm": "<p>" + " ".join(f"w{n}x{i} thema {n}" for i in range(60)) + "</p>"
                 for n in (10, 20, 30)})
    r2, _ = analyse(uniq)
    ck(r2["heizung-N-qm"]["avg_similarity"] < 0.1,
       f"各写各的不该被判重复,实得 {r2['heizung-N-qm']['avg_similarity']}")
    ck(set(CEILINGS) <= {"heizung-N-qm", "luftentfeuchter-N-qm", "klimaanlage-N-qm",
                         "en:electric-heater-N-sqm", "en:dehumidifier-N-sqm"},
       "CEILINGS 只能写真实存在的页族键,写错的键会静默永不触发")
    ck(all(isinstance(v, tuple) and len(v) == 2 for v in CEILINGS.values()),
       "CEILINGS 每项是 (平均上限, 最差一对上限) 两个数")
    two = dict(filler); two.update({f"heizung-{n}-qm": "<p>x</p>" for n in (10, 20)})
    ck(analyse(two)[0] == {}, "两页不成族(MIN_FAMILY=3)")
    print("✅ check_duplication selftest 通过（页族识别 / script 剔除 / 高低重复两个方向）" if ok else "")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gate", action="store_true", help="超阈值时退出码 1（默认只报数）")
    ap.add_argument("--max", type=float, default=40.0, help="平均相似度上限（百分比）")
    ap.add_argument("--regress", action="store_true",
                    help="已改写页族回升到 CEILINGS 之上时退出码 1（事故，不是待办）")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        sys.exit(selftest())

    # 每种语言单独成语料。混在一起算样板会出错:阈值是「整个语料的 25%」,
    # 德语页占 74% 时德语样板照样被剔除,英语页只占 22% 时英语样板留在里面,
    # 英语页族的相似度会被系统性抬高——那是方法的假象,不是真实重复。
    corpora = [("de", "site/guide/*.html"), ("en", "site/en/guide/*.html"),
               ("it", "site/it/guide/*.html")]
    fams, controls, n_boiler, n_pages = {}, {}, 0, 0
    for lang, pattern in corpora:
        files = sorted(glob.glob(os.path.join(ROOT, pattern)))
        if not files:
            continue
        pages = {os.path.basename(f)[:-5]: open(f, encoding="utf-8").read() for f in files}
        part, boiler = analyse(pages)
        for k, v in part.items():
            v["lang"], v["pages_in_corpus"] = lang, len(pages)
            fams[k if lang == "de" else f"{lang}:{k}"] = v
        controls[lang] = baseline_control(pages)
        n_boiler += boiler
        n_pages += len(pages)
        ctl = controls[lang]
        print(f"{lang} guide 页 {len(pages)} 张 · 样板 {boiler} 条 8-gram 已剔除"
              + (f" · 对照组（随机两页，不同主题）{ctl:.1%}" if ctl is not None else " · 对照组页数不足"))
    if not fams:
        print("找不到任何 guide 页,跳过")
        sys.exit(0)
    control = controls.get("de")
    print("← 对照组是「正常」的样子；兄弟页远高于它 = Google 眼中的门页形态\n")
    over = []
    for f, d in sorted(fams.items(), key=lambda kv: -(kv[1]["avg_similarity"] or 0)):
        if d["avg_similarity"] is None:
            print(f"   {f:26} {d['pages']} 页  测不准：{d['note']}")
            continue
        flag = "⚠️ " if d["avg_similarity"] * 100 > a.max else "   "
        print(f"{flag}{f:26} {d['pages']} 页  平均 {d['avg_similarity']:.1%}  "
              f"最高 {d['worst_similarity']:.1%}（{' ↔ '.join(x.split('/')[-1] for x in d['worst_pair'])}）")
        if d["avg_similarity"] * 100 > a.max:
            over.append(f)

    out = {"checked": __import__("datetime").date.today().isoformat(),
           "pages": n_pages, "control_by_lang": controls,
           "note": ("剔除全站样板后的兄弟页 8-gram Jaccard 相似度。对照组是随机的不同主题两页；"
                    "兄弟页远高于对照组 = Google 眼中的门页形态。本文件只报数，不改内容。"),
           "shingle_n": N, "boilerplate_shingles": n_boiler,
           "control_similarity": control, "threshold_pct": a.max, "families": fams}
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    with open(os.path.join(ROOT, "data/duplication.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
        fh.write("\n")

    regressed, held = [], []
    for f, (avg_max, worst_max) in CEILINGS.items():
        d = fams.get(f)
        if not d or d.get("avg_similarity") is None:
            regressed.append((f, "页族不见了或测不准", "", ""))
            continue
        avg, worst = d["avg_similarity"] * 100, d["worst_similarity"] * 100
        if avg > avg_max or worst > worst_max:
            regressed.append((f, f"平均 {avg:.1f}%/{avg_max:.0f}%", f"最差 {worst:.1f}%/{worst_max:.0f}%",
                              " ↔ ".join(d["worst_pair"])))
        else:
            held.append(f"{f} 平均 {avg:.1f}%/{avg_max:.0f}% · 最差 {worst:.1f}%/{worst_max:.0f}%")
    if regressed:
        print("\n🔴 已改写的页族又变回去了：")
        for f, avg_s, worst_s, pair in regressed:
            print(f"   {f}: {avg_s} {worst_s} {pair}")
        print("   查两件事：tools/differentiate_heizung.py 还在部署链里吗，"
              "有没有人重跑过 tools/gen_heizung_qm.py（那是一次性脚手架）。")
        if a.regress:
            sys.exit(1)
    elif held:
        print("\n已改写页族仍在天花板以下：" + "；".join(held))

    if over:
        print(f"\n{len(over)} 个页族超过 {a.max:.0f}%：{'、'.join(over)}")
        print("修的方向不是删页（Bing 收录与现有营收都在这些页上），是让每页的正文各写各的。")
        if a.gate:
            sys.exit(1)
    else:
        print(f"\n全部页族在 {a.max:.0f}% 以下 ✅")


if __name__ == "__main__":
    main()
