# EcoBack 内容自动化工具

这些脚本把"品类扩张 + 流量增长 + 变现"做成可重复的自动化流程，而不是每篇手写。

## 自动化架构总览

```
数据(JSON) ──► 生成器(gen_*.py) ──► site/guide/*.html(含GA4/联盟链接/结构化数据)
                                          │
site/ 全量扫描 ──► build_sitemap.py ──► site/sitemap.xml(自动同步,无需手改)
                                          │
              git push ──► GitHub Actions ──► Cloudflare 部署
                                          ├─ 部署前自动重建 sitemap
                                          ├─ 部署后健康检查(外部实测关键页 200)
                                          └─ IndexNow 自动推送所有 URL 给 Bing/Yandex/DuckDuckGo
```

- **品类扩张自动化**：改数据 → 跑一条命令 → 新页面出现，自带联盟链接(`tag=getecoback-21`)+点击追踪+三重 JSON-LD。
- **流量增长自动化**：sitemap 每次部署自重建 + IndexNow 即时推送新页(Bing/Yandex/DuckDuckGo 收录不依赖人工)。
- **变现自动化**：模板内置 Amazon 联盟链接与 `affiliate_click` 事件追踪，新页即变现页。

## 命令

### 1. 生成"按房间面积"品类页
```bash
python3 tools/gen_roomsize.py      # 读 tools/content_roomsize.json → 生成 site/guide/klimaanlage-<qm>-qm.html
```
新增一个面积档 = 在 `content_roomsize.json` 的 `entries` 加一条 → 重跑上面命令。

### 2. 重建 sitemap（部署时 CI 会自动跑，也可本地跑）
```bash
python3 tools/build_sitemap.py [YYYY-MM-DD]
```
扫描 `site/` 下所有 `.html`，自动排除 `noindex` 页(Impressum/Datenschutz)，按路径分配 priority/changefreq。**新增任何页面后无需手改 sitemap。**

### 3. 上线
```bash
git add site/ tools/ && git commit -m "..." && git push
```
push 后 GitHub Actions 自动：重建 sitemap → 部署 → 健康检查 → IndexNow 推送。

## 如何新增一个全新品类（复制此模式）

1. 新建 `tools/content_<kategorie>.json`（结构参考 `content_roomsize.json`）。
2. 复制 `gen_roomsize.py` 为 `gen_<kategorie>.py`，改模板文案与 slug 规则、联盟搜索词。
3. 跑 `python3 tools/gen_<kategorie>.py && python3 tools/build_sitemap.py`。
4. 在 `site/index.html` 加一个该品类的入口区块。
5. `git push` 即自动上线 + 收录推送。

## 候选扩张品类（按与品牌"节能/EcoBack"契合度）

- **按房间面积**（已上线）：welche klimaanlage für X qm — 高购买意图程序化页
- **冬季取暖**：Heizlüfter / Infrarotheizung / Wärmepumpe（全年化，反季不空窗）
- **除湿/空气净化**：Luftentfeuchter / Luftreiniger（相邻品类，夏季高需求）
- **节能配件**：Verdunkelungsrollo / Thermovorhang / Zeitschaltuhr / Smart-Home-Steckdose
- **按城市/气候**（谨慎，避免 doorway page，需每页真实差异化内容）

## 诚实与合规约束（务必保留）

- 联盟链接一律用**型号名/关键词搜索**，不伪造 ASIN（抗缺货、抗下架）。
- 型号推荐标注"未自测、汇总公开评测"守 E-E-A-T，不编造测评分数/精确参数。
- 商业页保留 Impressum + Datenschutz（德国法定），且这两页 `noindex`。
