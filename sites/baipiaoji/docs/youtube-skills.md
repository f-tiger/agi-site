# YouTube 相关 skills：安装与环境实测状态

安装日期：2026-08-15 ｜ 装入 `.claude/skills/`（git 跟踪，跨会话持久，不再像上次那样随容器丢失）

## 装了什么

| Skill | 来源 | 作用 |
|---|---|---|
| `youtube-full` | [ZeroPointRepo/youtube-skills](https://github.com/ZeroPointRepo/youtube-skills) | 转录、视频/频道搜索、播放列表，一个 skill 全覆盖（上游 12 个 skill 里其余 11 个是它的子集/别名，只装这一个，避免技能路由被同质描述污染；要补装：`cp -r <clone>/skills/<name> .claude/skills/`） |
| `last30days` | [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) | 近 30 天多源社区调研（Reddit/X/YouTube/HN/GitHub/Polymarket…）。已删除 14MB 演示媒体 `assets/`（运行时零引用）。**需 Python ≥3.12**，本环境用 `LAST30DAYS_PYTHON=python3.12` |

## 环境实测（2026-08-15，逐端点探测 + last30days doctor --probe）

| 端点/数据源 | 状态 | 影响 |
|---|---|---|
| `www.googleapis.com` / `youtube.googleapis.com` | ✅ **代理放行**（403 是 Google 层"缺 key"，非封锁） | 配 `YOUTUBE_API_KEY` 后官方 Data API 即可用 → `scripts/yt-ingest.mjs` 直接复活；元数据/搜索/频道都通 |
| `api.github.com` | ✅ 放行（且环境自带 GITHUB_TOKEN） | last30days 的 GitHub 源可用 |
| 宿主 WebSearch | ✅ 可用 | last30days 的 web 源走宿主搜索 |
| `transcriptapi.com` | ❌ CONNECT 403 | **youtube-full 全部功能被挡**（12 个上游 skill 同一后端） |
| `youtube.com` / Invidious 镜像 | ❌ CONNECT 403 | yt-dlp 路线不通（装了也没用，未装） |
| `reddit.com` / `hn.algolia.com` / `polymarket` / `arxiv.org` / `api.scrapecreators.com` | ❌ CONNECT 403 | last30days 这些源在本环境不可用 |

**当前净效果**：last30days 可用（GitHub + WebSearch 两源，doctor 会如实标注 partial coverage）；
youtube-full 已就位但被网络策略挡住，等解锁。

## Owner 解锁清单（按性价比排序）

1. **设 `YOUTUBE_API_KEY`**（Claude Code on the web → 环境设置 → 环境变量）。
   googleapis 已放行，这一步零网络改动就让元数据/搜索通了，`yt-ingest.mjs` 立即可用。
   key 申请：console.cloud.google.com → YouTube Data API v3。
2. **网络策略放行 `transcriptapi.com` + 设 `TRANSCRIPT_API_KEY`**
   （环境设置 → 网络策略加域名；key 在 transcriptapi.com 免费注册，100 credits）。
   这一步解锁 youtube-full 的**转录**——看一条视频到底讲了什么，只有这条路
   （Data API 拿不到第三方视频字幕）。文档：https://code.claude.com/docs/en/claude-code-on-the-web
3. 可选：放行 `www.reddit.com`、`hn.algolia.com` → last30days 的社区原声源打开，
   对本站"需求调研先行"的流程价值很大。

## 纪律不变

skills 只解决"拿得到数据"；`competitor-research-money.md` §6 的规矩照旧：
**候选选题可以自动拉，作业/审计正文必须人工核实后才发布。**
