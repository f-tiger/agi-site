# agi 投资板块:SEO / GEO / 外链 / 分享(2026-09-27)

owner 原话:「基于seo，geo，外链，分享的优化投资板块」。先用 `citation-growth`(本站自研的引用增长打法)逐项体检,
只修有证据的缺口。两条边界来自舰队规矩:**分享按钮在杀单清单上**(只做链接被转发时的预览,不加按钮);
**机器永不外联**(外链只做自有站点之间读者相关的互链,站外只给 owner 手发稿)。

## 体检结果(13 张投资页 + 3 个子站)

| 项 | 结果 | 处置 |
|---|---|---|
| 单 h1、表格、canonical、sitemap、llms.txt | 全部达标 | 不动 |
| 可见 FAQ 与 FAQPage JSON-LD 逐字一致 | 5 页逐题核对全部一致(探测器曾误报 3 页,原因是全角问号) | 不动 |
| 分享预览(og:image / twitter:card) | **5 页缺**:Nvidia、13F(en/zh)、交易台账、AI 交易 | 已补 |
| 最有区分度的一页的内链 | `/does-copying-13f-work` 站内只有 4 页链它、zh 版 2 页;hub 与巴菲特/木头姐档案页都不链 | 已补 4 条 |
| Gushen | 无描述/canonical/预览;`robots.txt`、`sitemap.xml`、`llms.txt` **都被 SPA 兜底回成 HTML**;不跑 JS 的爬虫看到的是空 `#root` | 已修 |
| SunWatch | 十几个模板无一带 og:image | 出口统一补 |
| Compass 战绩页 | 预览与结构化数据齐全;但只链回 agi 首页,不链那套回测的判定页 | 已补 |

## 做了什么

1. **专属分享卡**:`tools/gen_invest_cards.cjs` 生成 `share/copy-13f-{en,zh}.png`,数字全部读 `invest-data.json` 的
   `copyHomework`(与页面同源);另生成 SunWatch 的品牌卡 `share/sunwatch-{en,zh}.png`(不含数字)。
   **13F 卡片进入季度同步清单,成为第七处**:每季重算后跑 `gen_invest_data.py` 再跑本脚本。
2. **预览标签**:13F 两页用专属卡;Nvidia、交易台账、AI 交易三页用站内同类页已在用的 `scorecard-summary.png`(1600×900,按实际尺寸声明)。
   只加 head 里的机器可读标签,正文一字未动(同 09-04 hreflang 的防翻炒例外)。
3. **内链**:`/invest` 与 `/zh/invest` 的成绩单按钮旁各加一条到判定页;巴菲特、木头姐档案页的 Related 各加一条。
   **锚文本里不放数字**,不新增季度同步点。
4. **兄弟站**:gushen `cb9eb6d`(meta、canonical、OG、WebApplication JSON-LD、`#root` 内静态说明、真 robots/sitemap/llms、
   页脚回链、部署后断言三个文件不是兜底页);SunWatch 出口 `addShareTags()`(6 条离线断言 + 部署自检);
   Compass `2b60525`(战绩页方法段链到判定页,按语言)。

## 没做的

- 不加分享按钮(杀单);不自动提交目录、不发帖(机器不外联)。
- 不改投资页标题:需求读数(`agi-invest-demand-1115`)到之前,改标题是猜。
- 站外外链:最适合的素材是 13F 实测(独有方法:按申报日价格),要做就由 owner 手发;需要时另开一轮按反 AI 味规则写稿。

## 判定线

`agi-invest-share-1127`:两张 13F 页 09-28→11-26 外部来源到达 ≥5,或至少 1 次来自兄弟站 → 成立,同法补 Nvidia/capex 专属卡;
否则分享/互链投入在本站量级无效,只维护。
