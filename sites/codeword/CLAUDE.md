# codeword.agiscorecard.com — Code Word 操作手册(2026-09-15 建站)

**缘起(owner 原话)**:「扩展几个适配欧洲、美国的站点」(2026-09-15)。调研 `docs/research-2026-09-15.md`。
本站是中文站 `sites/fanzha`(识骗)的**英文姊妹站,不是翻译**——法源、举报渠道、读者处境全部换成
美国与欧盟,页面各自独立撰写。

## 定位
面向美国(兼顾欧盟/英国)的**反诈判定站**。核心主张是一句可被引用的判断:
**「靠耳朵识别克隆语音」这条建议本身是错的**——它随每一代模型失效;不会失效的是**核实**
(挂断 → 用早就存着的号码回拨 → 问家庭暗号),这也正是执法机构公开建议的做法。
**不卖任何东西、不收录任何付费「资金追回」服务、不推荐安全产品、不用注册。**

判定页六件套(标题即问题 / 首屏一句结论 / 一张表 / 可见 FAQ 与 FAQPage JSON-LD 逐字一致 /
带日期的一手依据 + 外链 / 翻转条件)。

## 机器结构
- 纯静态 `site/`,`worker.js` = 资产透传 + `/e` 白名单事件 + 服务端 page_view + ua_audit + `/api/pulse`。
- **D1 复用** `after35-events`(6109b81e-…),表名前缀 c:`cev`、`cua_audit`。六站永不共用表。
- 部署 `deploy-codeword.yml`(每日 08:50Z 兜底);闸门 = 文件齐 + `node --check` + 单测 + gen_md 四张
  .md 孪生 + 零编造 grep + **出处锚点断言**(FCC 2024-02-08、FTC 2024-04-01、Reg (EU) 2026/1744、
  IC3 2025 报告名)+ **`/code-word` 页禁止出现任何网络调用**(fetch/sendBeacon/XHR/WebSocket)+ 两页 FAQ 一致;
  冒烟 15 路径 + `/api/pulse`。
- 一键停止:`sites/codeword/KILLED`。IndexNow 密钥已放 site/,host 在 `tools/indexnow-subdomains.mjs`。
- 事件白名单:`page_view`、`tool_result`、`bridge_click`、`resource_click`、`share_click`、`faq_open`、
  `card_print`。工具只回传形状(`scamcheck:red:9`、`beforepay:all6`、`codeword:generated`)。

## 已上线(v1)
判定:`/ai-voice-clone-detection`(不能靠耳朵;核实才是防线)· `/are-ai-robocalls-illegal`
(美国是,但不是因为「声音是合成的」;FCC 24-17 把 AI 语音归入 TCPA 的 artificial/prerecorded voice)·
`/already-paid-what-now`(第一小时定胜负;按支付通道给可回收性)。
工具:`/code-word`(家庭暗号卡,可打印)· `/before-you-pay`(六问 + 60 秒倒计时)· `/scam-check`(12 问判定)。
清单:`/resources`(IC3、FTC、欧盟各国警方、四条法源原文),另有 `/about`。

## 内容硬约束
1. 一手依据只认四类:①FCC Declaratory Ruling FCC 24-17(2024-02-08 通过,即时生效)
   ②FTC Impersonation of Government and Businesses Rule(2024-04-01 生效)
   ③EU AI Act 第 50 条(2026-08-02 适用)与 Digital Omnibus on AI, Regulation (EU) 2026/1744
   (2026-07-27 生效;2026-12-02 机器可读标记 + 两项新禁令;高风险义务递延至 2027-12-02 / 2028-08-02)
   ④FBI IC3 2025 Internet Crime Report 的**标题级**数字(>100 万投诉、损失 >$200 亿、同比 +26%;
   60 岁以上 $77.5 亿 / 201,266 件)。
2. **不引任何追不到发布机构原始报告的损失/增长百分比**。IC3 的分项(如「提及 AI 的投诉金额」)
   目前只见于二手转述,**不上页**。部署闸门 grep 这一类写法。
3. **「没有任何一条规则能阻止电话打进来」这句话不许删**——它是本站与法律科普文的分界线,
   也是把读者推向工具而不是推向诉讼的那一句。
4. **`/code-word` 永不上传、永不进链接、永不进 D1**,该页不得有任何网络调用(闸门强制)。
5. 举报渠道:美国给 IC3 + FTC;欧盟/英国**只说「你所在国家的警方/反诈举报服务」,绝不编造
   某个泛欧消费者举报热线**——它不存在。
6. 永不收录付费追款、安全软件、身份保护订阅、课程;不接联盟链接。理由写在 `/resources`:
   刚被骗的人正是二次诈骗的目标名单。

## 判定线(预登记 2026-09-15,按原文结算)
- **2026-11-15**:`cev` 真人 page_view ≥ 200/28d 且 `tool_result`+`card_print` ≥ 40 → 继续维护并加第二批
  判定页(候选见调研 §五);<50 pv → 降为月度维护。英文站阈值高于中文站,因为英文搜索池大得多,
  起不来说明不是流量问题而是定位问题。
- **2026-12-31**:任一判定页在 Bing AI Performance 明细出现 ≥1 次引用 → 英文判定页在主站之外也吃引用,
  按引用量补页;0 → 反面发现,英文新站策略回到「主站加页」而不是「另开站」。
- 分母:`cev.page_view` `ua_class='human'`,`?ci=1` 已排除。

## 每日块(舰队总任务 H)
只报数不动:`cev` 真人 pv、`tool_result`/`card_print`、`resource_click`。
优化只在有真人信号或一手依据变更(FCC/FTC 新规、AI Act 日期变动、IC3 年报更新)时做一件。
**2026-12-02 是硬日程**:欧盟机器可读标记与两项新禁令生效当天,本站三页与 `/resources` 的日期表
必须同一次运行内复核。与主站 `eu-ai-act-what-applies-now` 保持一致——**那一页是舰队的 AI Act 真源,
本站只引用不另立台账**。
