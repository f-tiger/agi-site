# 同类站竞品差距扫描(2026-08-30,WebSearch)

内部文档,不发布。owner 指令:「快速再扩展,对比同类型网站要有独特性」。

## 同类站在做什么(具名)

- **labubu.directory**:系列目录/收藏指南,全系列画廊形态。
- **labubucollector.com**:发售历史 checklist(V1/V2/V3 断代)、照片、识别 tips。
- **labubusuperfans.com**:「Labubu Encyclopedia」百科形态。
- **the-monsters.fandom.com**:Fandom wiki,角色/IP 叙事向。
- **各电商博客**(alibaba/aliexpress product-insights、figpalace、tinytoys 等):
  系列 listicle + 静态真伪清单,内容服务于自家卖货。
- 报道类(Prism News 等):一次性 catalog 文章。

## 结构性缺口(= 我们的车道)

同类站清一色是**静态目录/清单**形态。没有一家有:
1. **交互判定工具**——真伪内容全是静态 checklist,没有「逐题回答 → 判定 +
   哪条不过」的向导;概率内容全是转述,没有计算器(我们已有 2 个)。
2. **有源概率轴**——图鉴按系列/角色组织,没人按「盒印概率 × 数学」组织。
3. **开放数据 + 机器可读**——零 CC-BY 数据集、零 llms-full、零 MCP。
4. **诚实预算/心理角度**——电商博客结构上不可能写「怎么不超支」。
5. **双语对**(EN+DE hreflang)——同类站全部单语。

## 扩展原则(据此定,写进站 CLAUDE.md)

**不卷图鉴**:labubucollector 们有 63 系列 ×200 变体的画廊,我们没有图库授权
也不该 churn 目录维护。**每个新增面必须落在上面 5 条缺口之一**,否则不做。

## 本轮出页(过三门)

1. **/checker + /de/checker——交互式 Lafufu 验真向导**(缺口 1):8 信号数据集
   变逐题工具,判定语言诚实(「未发现红旗 ≠ 保真」;卖家渠道检查高于一切
   外观检查——数据集 limitations 原样进结果)。埋点 checker_use。
2. **/finder + /de/finder——系列选择器**(缺口 1 + 年轻受众可分享):按用途/
   审美/追逐意愿三问 → 现行官方系列推荐 + 官方链接;系列特征只用官方在售页
   标题可验证的描述词;Big Into Energy 六角色情绪命名(2025-04,多源)可引。
   埋点 finder_use。

## 拒绝项

- 全系列图鉴/checklist(撞扫描结论:卷不过且无图库);
- 新闻/发售日历(维护 churn + 时效编造风险);
- 点名贬低竞品的 vs 页(只做结构差异,不打击具名站点)。
