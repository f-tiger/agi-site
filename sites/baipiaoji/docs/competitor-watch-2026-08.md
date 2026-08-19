# 竞对观察与需求简报（2026-08-17）

调研方法：WebSearch（沙箱出口代理封锁厂商域名，凡未直抓均在 source 里注明「经搜索索引
引文核实」——沿用 DeepSeek 条目先例）。背景：`user-research.md` 08-16（四补）已核实
「至少 6 个站在做同样的目录、抓取成本 $1.20/1000 页——带出处带日期是入场券不是护城河」。
本轮的问题是：**入场券之上，兑现缺口在哪**——219 个工具只有 121 个带 limits（55%），
差异化承诺（每条额度都核实过）有 45% 没兑现。

---

## 一、竞对对比表（本轮实测样本）

| 竞对 | 形态 | 覆盖 | 带出处？ | 带核实日期？ | 与本站的差距点 |
|---|---|---|---|---|---|
| DataCamp「40 Best Free AI Tools」 | 编辑部榜单 | 广而浅 | 少量官方链接 | 无 | 无额度数字，只有推荐语 |
| daily.dev / NxCode / akoode 等编程榜单 | листicle | coding 一类 | 部分 | 无 | **仍在推荐已死的 Cody Free**（2025-07 停服） |
| pricepertoken / freellm.net / free-model.com | API 免费档结构化站 | api 一类，较深 | 指向官方 | 部分有更新时间 | **最接近本站的一类**；但只做 API，不做中文、不做 chat/office 等品类 |
| cheahjs/free-llm-api-resources（GitHub） | 开源清单 | api 一类 | 是（社区维护） | commit 历史即日期 | 无判定、无墙描述、无中文 |
| ShaikhWarsi/free-ai-tools（GitHub） | 开源清单 | 广 | 链接为主 | 无 | 无额度核实 |
| aitooldiscovery / aitoolnavs / vellum「Reddit's top picks」 | 挖 Reddit 原声的榜单 | 广 | 无官方出处 | 无 | 转述 Reddit 数字（如 Claude free 50–100 条/天）**不查官方** |
| costbench / grizzlypeaksoftware | 「is X free?」问题页 | 单工具 | 部分 | 有月份 | **URL 即问题**——与 08-16（六补）的问题页判断互相印证 |
| 知乎/AIGC 导航（aigc.cn 等） | 中文导航 | 中文工具广 | 无 | 无 | 数字多为转述（如「即梦每天 5 次」无官方引文） |

**三条竞对结论：**
1. **「带出处+带日期」在英文 API 细分已有 3-4 家在做**（pricepertoken/freellm 等），
   该格子不再空白；但**跨品类（chat/office/writing/safety）+ 中英双语 + 拒绝清单**
   仍无人同时做到——no-source.json（拒绝编数）没有任何竞对有对应物。
2. **竞对的系统性错误就是本站的选题来源**：listicle 界至今在推荐 Cody Free（已死 13 个月）、
   转述 Character.AI「每日 400 swipe」（官方从未公布）、给 ChatPDF 三种互相矛盾的价格。
   **纠错型条目（"X 已死/这数字是编的"）是竞对结构上做不出来的**——他们不复查存量。
3. costbench 的 `…/free-plan/` 问题页形态再次印证 08-16（六补）「URL 是问题不是词条」
   的判断——他们已经在用这个形态收 AI 引用。

## 二、用户高频问题（本轮搜索可见的需求原声）

- Reddit 免费助手贴的固定分歧：**「真免费档」vs「7 天试用/freemium 门」**——用户要的
  正是本站 wall 字段回答的问题（墙在哪、什么时候撞）。
- 高频具体问法：Claude/ChatGPT 免费一天几条；Gemini/Mistral API 免费档还有多少；
  Copilot/Cursor 免费还能用吗（Cody 之死属同簇）；「不花钱剪视频」（剪映/CapCut）；
  「免费 PDF 问答」（ChatPDF 簇）；AI 检测免费多少词（GPTZero 簇）。
- 中文侧（知乎/V2EX）：免费 AI 视频工具（即梦/通义/腾讯智影 配额数字满天飞但无引文）、
  文心一言免费后现状（入口迁移造成困惑——旧链接 yiyan.baidu.com 打不开被当成「产品没了」）。

## 三、本轮核实结果（121 → 128，7 核实 + 1 拒绝）

| slug | 结论 | 出处 |
|---|---|---|
| wenxin | 2025-04-01 起全面免费（官方公告）；网页入口已迁 wenxin.baidu.com | 百度公告经新华网 news.cn 转载 |
| cody | **免费档已死**：Free/Pro 2025-07-23 停服，仅存企业版；个人被导向 Amp（$10 一次性） | Sourcegraph 官方博客 |
| character-ai | 免费无限量聊天；墙是高峰排队不是条数；c.ai+ $9.99/月 | 官方 FAQ + 官方博客 |
| languagetool | 编辑器免费单次 10,000 字符；公开 API 20 次/分/IP、75K 字符/分、20K/次 | 官方 API 文档 + Premium 页 |
| gptzero | 免费 10,000 词/月、10,000 字符/次；付费价第三方口径矛盾，不采信 | 官方定价页（交叉印证） |
| mistral | Experiment 免费档存在；两道门=手机验证+数据训练同意；官方不再公布数字，典型 1 RPS/500K TPM/1B 月 | 官方文档+帮助中心 |
| duckduckgo-ai | 免注册匿名免费；每日上限官方刻意不公布具体条数 | 官方帮助页 + spreadprivacy |
| chatpdf | **拒绝**：官方页取不到原文，第三方数字互相矛盾（提问数 20/50，Plus $5/$9.99/$19.99） | 记入 no-source.json |

附带修正：cody 的 `free` 散文（中英）原文「免费档提供补全与对话」已过时 13 个月，同步改写。

## 四、给每日循环的后续核实队列（按「用户常问 × 本站缺 limits」排序）

1. **jianying（剪映）/ capcut**——中文侧最高频；会员制数字（如导出限制）需找官方帮助中心口径，
   知乎流传的「完全免费无限量」与会员体系矛盾，大概率是纠错型条目。
2. **tabnine**——竞对榜单常推；官方 Basic 免费档口径待查（Dev 档 90 天试用与免费档常被混写）。
3. **monica / sider**——浏览器助手高频；免费查询次数第三方满天飞（40/天等），需官方引文。
4. **replicate / modal / novita / hyperbolic**——api 类补齐（free-model.com 等竞对已覆盖，
   本站 api 类是竞争最激烈的一格，缺口最不该留在这里）。
5. **speechify / murf**——audio 高频，免费字符数需官方口径。
6. **wolframalpha / semantic-scholar**——study 类；Semantic Scholar API 有官方公布的速率限制，易核实。
7. **you-chat / lmarena**——chat 类剩余高热度项。
8. 拒绝清单复查节奏不变：官方口径一旦出现即转正（PixVerse 先例）。

**不做**：为凑覆盖率给 local 类（open-webui/comfyui/jan/gpt4all 等 8 个）编「额度」——
本地开源工具没有厂商额度，它们缺 limits 是**正确的**；覆盖率的诚实分母应把这类剔除
（98 缺项里约 12 个属此类 + 8 个已在拒绝清单）。

## 五、付费 listing 需求探针判定线（2026-08-17 上线，owner 当日指令提前执行）

冻结令预告的「解冻后第一件事」，owner 2026-08-17 直接要求营收导向功能扩展，提前执行。
这是唯一不受 Bing 索引闸门约束的营收面：厂商通过 AI 爬虫与既有引用发现本站，不依赖搜索流量。

- **形态**：`/for-vendors.html`（+ `/en/for-vendors.html`）三段式——① 免费收录（走既有
  收录标准与 /api/submit 队列）② 加急审核 ③ 首页推荐位。②③ **不标价格**（没有成交数据
  做定价依据就不编数字，零编造规则），只开询价表单 → D1 `vendor_inquiries` 表
  （/api/vendor，蜜罐+意向白名单 expedite/feature/other+邮箱必填，模式照抄 submissions）。
- **硬约束（与页面同屏明示）**：付费买不到收录资格、任何数字、排序、拒绝清单的撤销；
  推荐位一律明示「推广」标注；达不到收录标准，付钱也不收录。
- **埋点**：事件 `biz`（hit.js 白名单），路径区分动作——CTA 点击 `/biz/inquiry/<kind>`、
  表单提交 `/biz/submit/<kind>`、成功 `/biz/ok/<kind>`；入口页浏览由全局 beacon 自动记
  （path=/for-vendors.html）。真实询价的唯一口径 = `vendor_inquiries` 表里能回溯到
  真实厂商与工具的行（蜜罐拦不住的手填垃圾按行内容人工判）。
- **判定线**：至 **2026-11-15**（90 天）累计 **0 条真实询价** → 探针死，撤入口页、表单与
  页脚链接；**≥1 条真实询价** → 通知 owner 定价，并按仓库固定流程（需求→洞察→PRD→执行）
  把它建成产品。期间不加面、不扩功能——探针只回答「有没有人问」这一个问题。
