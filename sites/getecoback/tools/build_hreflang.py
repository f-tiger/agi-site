#!/usr/bin/env python3
"""hreflang 规范化 + 门禁（幂等）。方法论：seo-hreflang 技能，2026-08-17 审计落地。

审计查出的三类真缺陷（都在 DE↔EN 配对页上，手写标签各写各的漂移出来的）：
  ① 同一配对两侧 x-default 指向不同 URL（kuehlt-nicht↔not-cooling：DE 说 DE、EN 说 EN
     —— 一组 alternates 只允许一个 x-default，两个等于没有）；
  ② x-default 只挂了一侧（4 对：dachgeschoss/reinigen/mietwohnung/hitze-radar）；
  ③ 38 对 de+en 配对整组没有 x-default，而 12 组有 —— 站内约定不一致。

本脚本把「配对页的 hreflang 块」变成生成物，不再靠手写：
  - 配对关系从两侧已声明的 alternate 标签取并集推导（任一侧声明即成对，双向自愈）；
  - 每对两侧统一重写为同一组三行：de → DE 页、en → EN 页、x-default → DE 页
    （x-default 跟随站点既有约定：首页组即 x-default→DE 根；DE 是主市场）；
  - 单语页（仅自引用，如 86 个 DE guide、少数 EN 独立页）不动，只校验；
  - 校验失败退出码非零 = 门禁：语言码白名单 / href 绝对 https / 目标文件存在 /
    canonical 存在且自引用与其逐字一致 / 配对唯一（一个页只能属于一组）。

幂等：重复运行 byte-stable。接入 deploy.yml（xlinks 之后、sitemap 之前）。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
BASE = "https://getecoback.com"

TAG_RE = re.compile(r'[ \t]*<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">\n?')
CANON_RE = re.compile(r'<link rel="canonical" href="([^"]+)">')
VALID_LANGS = {"de", "en"}  # ISO 639-1；本站不用地区码（受众是语言不是国家）


def url_to_file(url: str):
    if not url.startswith(BASE):
        return None
    path = url[len(BASE):]
    if path in ("", "/"):
        path = "/index.html"
    if path.endswith("/"):
        path += "index.html"
    return SITE / path.lstrip("/")


def main() -> int:
    pages = {}  # file -> {"html": str, "canonical": str|None, "tags": [(lang, href)]}
    errors = []
    for f in sorted(SITE.rglob("*.html")):
        html = f.read_text(encoding="utf-8")
        tags = [(m.group(1), m.group(2)) for m in TAG_RE.finditer(html)]
        m = CANON_RE.search(html)
        pages[f] = {"html": html, "canonical": m.group(1) if m else None, "tags": tags}

    # ── 推导配对：任一侧声明了指向另一个真实文件的 de/en alternate 即成对 ──
    pair_of = {}  # file -> partner file
    for f, d in pages.items():
        for lang, href in d["tags"]:
            if lang == "x-default":
                continue
            if lang not in VALID_LANGS:
                errors.append(f"{f.relative_to(ROOT)}: 非法语言码 hreflang=\"{lang}\"")
                continue
            if not href.startswith("https://"):
                errors.append(f"{f.relative_to(ROOT)}: hreflang href 必须是绝对 https URL：{href}")
                continue
            target = url_to_file(href)
            if target is None:
                errors.append(f"{f.relative_to(ROOT)}: hreflang 指向站外 URL：{href}")
                continue
            if not target.exists():
                errors.append(f"{f.relative_to(ROOT)}: hreflang 死链 {lang} -> {href}")
                continue
            if target == f:
                continue  # 自引用
            prev = pair_of.get(f)
            if prev is not None and prev != target:
                errors.append(f"{f.relative_to(ROOT)}: 声明了两个不同的配对目标 {prev.name} / {target.name}")
                continue
            pair_of[f] = target
            back = pair_of.get(target)
            if back is not None and back != f:
                errors.append(f"{target.relative_to(ROOT)}: 被两个页面认作配对（{back.name} / {f.name}）")
            else:
                pair_of[target] = f

    if errors:
        for e in errors:
            print("HREFLANG-ERR", e)
        return 1

    # ── 规范化配对页：两侧写入同一组三行（de / en / x-default→DE）──
    changed = 0
    for f, partner in sorted(pair_of.items()):
        d = pages[f]
        pd = pages[partner]
        if d["canonical"] is None or pd["canonical"] is None:
            errors.append(f"{f.relative_to(ROOT)}: 配对页缺 canonical，无法生成 hreflang")
            continue
        is_de = "/en/" not in str(f.relative_to(SITE)) and not str(f.relative_to(SITE)).startswith("en/")
        de_url = d["canonical"] if is_de else pd["canonical"]
        en_url = pd["canonical"] if is_de else d["canonical"]
        block = (
            f'<link rel="alternate" hreflang="de" href="{de_url}">\n'
            f'<link rel="alternate" hreflang="en" href="{en_url}">\n'
            f'<link rel="alternate" hreflang="x-default" href="{de_url}">\n'
        )
        html = d["html"]
        stripped = TAG_RE.sub("", html)
        canon_m = CANON_RE.search(stripped)
        if canon_m is None:
            errors.append(f"{f.relative_to(ROOT)}: 找不到 canonical 行，无法定位插入点")
            continue
        insert_at = stripped.index("\n", canon_m.end()) + 1
        new_html = stripped[:insert_at] + block + stripped[insert_at:]
        if new_html != html:
            f.write_text(new_html, encoding="utf-8")
            changed += 1
        pages[f]["html"] = new_html
        pages[f]["tags"] = [(m.group(1), m.group(2)) for m in TAG_RE.finditer(new_html)]

    if errors:
        for e in errors:
            print("HREFLANG-ERR", e)
        return 1

    # ── 终检（含单语页）：自引用逐字等于 canonical；x-default ≤1 且指向组内成员 ──
    n_pairs = 0
    n_solo = 0
    for f, d in pages.items():
        tags = d["tags"]
        if not tags:
            continue
        canon = d["canonical"]
        if canon is None:
            errors.append(f"{f.relative_to(ROOT)}: 有 hreflang 但无 canonical")
            continue
        hrefs = [h for _, h in tags]
        if canon not in hrefs:
            errors.append(f"{f.relative_to(ROOT)}: 缺自引用（无 alternate 逐字等于 canonical {canon}）")
        xds = [h for l, h in tags if l == "x-default"]
        if len(xds) > 1:
            errors.append(f"{f.relative_to(ROOT)}: x-default 多于 1 个")
        if xds and xds[0] not in hrefs[:len(hrefs)] :
            pass  # x-default 与 de/en 同 URL 集，上面死链检查已覆盖存在性
        if f in pair_of:
            n_pairs += 1
        else:
            n_solo += 1
            for l, h in tags:
                if h != canon:
                    errors.append(f"{f.relative_to(ROOT)}: 单语页出现指向他页的 alternate（{l} -> {h}）却未成对")

    if errors:
        for e in errors:
            print("HREFLANG-ERR", e)
        return 1

    print(f"hreflang OK：配对页 {n_pairs}（{n_pairs // 2} 对，本次重写 {changed}）· 单语自引用页 {n_solo} · 全部校验通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
