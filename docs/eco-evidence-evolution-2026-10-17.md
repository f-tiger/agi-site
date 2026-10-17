# EcoBack 维护工具与证据采集：发布、运维说明

状态：2026-10-17 发布候选的实现说明。本文描述代码和验收要求，不代表 GitHub Actions、线上部署、搜索收录或收入已经验证成功。

## 三个既有页面

| 路由与工具标识 | 用途 | 证据边界 |
| --- | --- | --- |
| `/guide/tineco-saugt-nicht-mehr.html#upkeep-check` · `tineco-care` | 按型号、症状和已做的维护，选择清洁、查说明书或联系售后。 | S5 FAQ 与 S7 FlashDry 异味说明的适用范围分别保留；S7 异味资料不能证明吸力、停机或水箱故障原因。不认证配件兼容性，不建议内部拆修或盲目换电池。 |
| `/guide/thermovorhang-ratgeber.html#upkeep-check` · `curtain-fit` | 检查窗帘或门帘是否遮住暖气、妨碍开闭，决定是否继续测量选型。 | 消费者机构资料支持保持暖气畅通；不能由三个选择得出安装适配保证、节能百分比或具体尺寸。论坛只提供问题背景。 |
| `/en/guide/12l-vs-20l-dehumidifier-uk.html#meaco-care` · `meaco-filter` | 核对 Meaco 滤芯适配、是否需要附加 HEPA，并解释耗材费用。 | 仅核验 Arete One/Two 10L/12L；20L/25L 和其他型号明确未核验。£29.99 三片是 2026-10-17 读取的价格；约三个月更换是厂家参考，不是寿命保证。年耗用 £39.99 与从零库存购买整包装 £59.98 分开；当次缺货不作为当前库存承诺。 |

没有新增工具 URL。德国首页、英文首页、既有工具页和 UK hub 承接发现入口。工具保留无需购买的结果、无 JavaScript 可读说明和用户主动复制；不自动发布分享内容。英国商家/联盟资格尚未核验，没有新增英国购物 CTA。公开联盟招募条款不等于本站已经获批。

## 沿用既有两条日程

- **04:30 UTC：**`.github/workflows/eco-trends.yml` 沿用原日程，新增 `tools/eco_evolution.py` 的 DE/GB 公开趋势证据采集和既有页面匹配。Google RSS 是热搜出现记录；related queries 是来源窗口内的相对变化；autocomplete 仅为词汇线索。它们都不是搜索量、销量或收入。
- **03:17 UTC：**`.github/workflows/deploy-getecoback.yml` 沿用原日程，运行既有页面生成器与技术检查，维护 canonical、真实对应页面的 hreflang、sitemap、`llms.txt`、Markdown 镜像、搜索索引、内链和共享统计。新模块接入同一条发布链，不另建发布任务。

本次没有新增 cron、付费接口、支出或恢复 ECO Growth Loop。趋势采集器不调用 AI，不请求联盟目的地址，不发送外联/社交消息，不自行改写或发布页面。原趋势步骤仍可提交其既有趋势快照；新的采集回执和机会清单只输出到运行 artifact，不提交公开网站。

### 来源有效期与失败处理

`data/evolution/getecoback-catalog.json` 记录人工核验的本地用户问题、厂家/消费者资料、核验日期及适用范围。

- 趋势信号须在 **7 日**有效期内；缺日期、未来日期、抓取失败、污染和过期记录不能当作新的增长证据。保留旧快照不等于本次抓取成功。
- 目录的本地问题与一手资料均须在 **90 日**内人工核验，才可将匹配项标为 `deepen_existing`。超期或证据不足进入研究状态；程序不会自行延长核验日期。
- RSS/来源缺失记录为未知或部分覆盖，不解释为零需求。退役品类、无关新闻及可疑源文本被过滤；德国信号不直接推断奥地利或瑞士需求。
- `receipts.json` 保存来源状态，`opportunities.json` 保存候选及只读技术审查。artifact 名为 `eco-evolution-<run_id>`，保留 **14 日**；这是运行产物保存期，不是增长观察期或持久证据仓库。
- 即使证据齐全，候选仍保持 `auto_publish: false`、`new_page_allowed: false`、`product_link_allowed: false`。先检查既有页面意图重叠，再做具体编辑和发布验收。

只读技术审查检查标题、描述、canonical、结构化数据、一手来源链接及从首页/工具页三跳内可达性；hreflang 作为审查信息输出。静态通过不证明 Google 索引、富结果资格或 AI 引用。

## 发布和回归检查

发布工作流在内容生成之后重建索引与镜像，运行 UK、维护工具、FAQ/结构化数据一致性、联盟披露及共享 GA4 检查；所有页面生成后再运行统计 coverage 写入及只读校验。浏览器检查覆盖手机布局、无 JavaScript、示例/真实选择、复制回退及隐私排除。发布后还需核验线上资产、页面及 GA4 coverage；前端通过不证明 GA4 后台已经收到真实用户事件。

IndexNow 继续使用原发布流程的变更 URL 差集和既有日程规则，不为本模块新建每次 push 的单独提交动作，不重复提交生成器重写但内容未变化的 URL。IndexNow 接收成功也不等于收录或排名提升。

维护入口与 UK 内容的幂等、逻辑和浏览器检查分别位于 `sites/getecoback/tools/test_upkeep_decisions.*`、`test_meaco_care.mjs`、`test_meaco_generator.py`、`browser_upkeep_decisions.cjs`、`browser_meaco_care.cjs`；`check_upkeep_release.py` 检查三个既有 URL 的发布发现面。

## 事件和观察窗口

工具派发固定 `eco_upkeep_*` 动作；共享 normalizer 只接受三个允许路由，并转换为下面四个 GA4 事件，附固定 `tool_id`。不传型号、症状、选择值、价格输入或分享文本。

| GA4 事件 | 含义 |
| --- | --- |
| `upkeep_view` | 工具进入可见区域。 |
| `upkeep_example` | 德国工具的虚构示例展示；不是个人完成。Meaco 静态费用示例不会自动触发它。 |
| `upkeep_decision` | 完成要求的明确选择并得到下一步。Meaco 全默认或部分选择不计；三项明确选择后得到“未核验”仍可计为检查完成。 |
| `upkeep_share` | 复制操作成功；失败后展示可手动复制文本不计成功。它不证明内容已发到社交平台。 |

保留已有统计拒绝/撤回、DNT/GPC、自动化浏览器和 probe/QA 排除。示例、检查完成、分享、联盟点击、订单和佣金分别解释；不得将事件数除以用户数当作购买转化率。实际佣金仍未知，须以成功可读的订单/佣金报表核验发货、退款、币种和归因窗口。

本轮新工具从**实际发布次日**开始观察完整 14 个属性日。若于 2026-10-17 属性日发布，窗口为 **10 月 18–31 日**；发布跨日则顺延，并等待统计处理完成。此前 **10 月 12–25 日**的干衣改动观察保持独立，不混成同一实验。部署、测试事件、趋势信号或短期自然波动都不是增长证明。
