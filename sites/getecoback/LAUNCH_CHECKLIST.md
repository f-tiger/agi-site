# EcoBack 上线执行清单（按天排序，照着做就能上线，不是抽象阶段划分）

> 配套文件：`site/index.html`（可直接部署的落地页）。本清单遵循"先手动、后自动化"（Wizard of Oz MVP）原则——第一批用户先手动处理返现发放，不要在验证需求之前花时间搭建自动化支付后台。

---

## Day 0（今天，2-3小时）：把落地页挂上网

1. **部署 `site/index.html`（用 Cloudflare Workers + GitHub Actions 自动部署，已经帮你搭好了大部分）**：
   - 仓库里已经有 `wrangler.jsonc`（Cloudflare Workers静态资源配置，指向 `site` 目录）和 `.github/workflows/deploy.yml`（GitHub Actions工作流，每次push自动部署）
   - **唯一需要你手动做的一步**（我这边没有你的Cloudflare账号凭证，没法代劳，只能到这一步）：
     1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com) → 右上角头像 → My Profile → API Tokens → Create Token，选择"Edit Cloudflare Workers"模板，生成一个API Token
     2. 记下你的 Account ID（Cloudflare Dashboard右侧栏能看到）
     3. 打开 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret，依次添加两个：`CLOUDFLARE_API_TOKEN`（刚才生成的token）和 `CLOUDFLARE_ACCOUNT_ID`（你的account id）
   - 加完这两个secret后，**以后每次 `git push` 到这个分支，网站会自动重新部署到Cloudflare**，不需要再手动操作。可以去仓库的 Actions 标签页看部署日志，成功后网址是 `ecoback.<你的账号subdomain>.workers.dev`（首次部署后能在Cloudflare Dashboard里查到具体地址）
   - 后续如果买了自己的域名，在 Cloudflare Dashboard 里把这个 Worker 绑定自定义域名即可（Cloudflare同时管DNS，操作在同一个后台完成）
2. **注册 Formspree**（[formspree.io](https://formspree.io)，免费额度够用）：创建一个表单，拿到形如 `https://formspree.io/f/xxxxxxx` 的地址，替换 `site/index.html` 里 `<form class="cta-form" action="https://formspree.io/f/YOUR_FORM_ID">` 中的 `YOUR_FORM_ID`。之后每个邮箱订阅都会发到你的邮箱/Formspree后台。
3. **（可选）买域名**：先不买也行，用平台给的免费子域名验证需求；等第一批转化数据出来再决定值不值得投入域名+品牌成本。

**今天结束时你应该有**：一个真实可访问的网址，任何人打开都能看到落地页并留邮箱。

---

## Day 1-2：申请联盟网络账号（不需要人脉，自助流程）

按顺序申请（至少两个，避免单点依赖）：

1. **Awin**：[awin.com](https://www.awin.com) → 找"Become a Publisher / Publisher sign up"入口，用你的落地页网址申请。审核通常几天内。
2. **CJ Affiliate（Commission Junction）**：[cj.com](https://www.cj.com) → 找"Publisher sign up"入口，同样用落地页网址申请。
3. **Rakuten Advertising**：[rakutenadvertising.com](https://rakutenadvertising.com) → 找"Publisher"入口申请。
4. **Amazon Associates（按国家分别申请，操作最简单、审核最快）**：
   - 德国：[affiliate-program.amazon.de](https://affiliate-program.amazon.de)
   - 法国：[affiliate-program.amazon.fr](https://affiliate-program.amazon.fr)
   - 西班牙：[affiliate-program.amazon.es](https://affiliate-program.amazon.es)

**申请通过后**：登录后台搜索"air conditioner / Klimaanlage / climatiseur / heat pump / Wärmepumpe / pompe à chaleur"，找到MediaMarkt、Otto、Conrad等零售商在网络里挂的具体联盟计划，逐个申请加入（不是加入网络就自动能推广所有商家，每个商家的联盟计划通常还需要单独申请）。

**记录每个商家的实际佣金率**，填进下面这张表（先用Excel/Notion，不需要开发数据库）：

| 商家 | 网络 | 品类佣金率 | 联盟链接 |
|---|---|---|---|
| MediaMarkt.de | Awin | 待填 | 待填 |
| Amazon.de | Amazon Associates | 待填 | 待填 |
| Otto.de | Awin/CJ | 待填 | 待填 |

---

## Day 3-5：发布内容（草稿已经写好，见下方"配套内容"）

1. 把下方两篇文章草稿翻译/润色成目标语言（先英语，验证后再做德语/法语），发布到：
   - 落地页同域名下的简单 `/blog/` 静态页（最省事，不需要CMS）
   - 或先发在 Medium/dev.to 这类免费平台上，用来快速验证内容能不能带来流量，之后再考虑自建博客
2. 文章末尾都要带落地页链接和"加入waitlist领返现"的行动号召。

---

## Day 5-7：去真实人群聚集的地方发（不花钱投广告）

按优先级去发（发之前先看每个社区的自我推广规则，多数社区要求先"贡献价值"再放链接，不要一上来就发广告贴）：

- Reddit：r/eupersonalfinance、r/germany、r/france（对应国家板块）、r/HVAC
- Facebook：搜索"[城市名] Expats"、"[城市名] homeowners"类群组
- 德国本地论坛：heizungsforum.de 这类暖通论坛
- 比价网站：可以尝试联系 idealo.de、Check24 看是否有内容合作/互相引流空间（不强求，能谈成是加分项）

---

## Week 2：处理第一批真实用户（手动，先不要自动化）

**不要在这个阶段开发自动化的稳定币发放系统**——按Lean Startup"先手动验证需求"的原则：

1. 用户在Formspree/落地页留下邮箱+（购买后）钱包地址
2. 你在联盟网络后台手动核对：这个用户是否真的通过你的链接完成了购买（联盟网络后台能看到点击和转化记录）
3. 联盟网络的佣金确认通常要等30-90天，这段时间可以先给用户发邮件说明"你的返现正在处理中，预计X月X日到账"（管理预期，减少投诉）
4. 佣金确认到账后，用任意钱包（Coinbase Wallet、MetaMask等）手动转USDC给用户填写的地址，在Excel里记账
5. 目标：手动处理完前20-30个真实转化，验证"用户真的会为了返现而通过你的链接购买"这个核心假设

**只有验证了这个假设、且单量开始让手动处理吃力时**，才值得投入开发自动化发放系统（用Coinbase Commerce或Circle API）。

---

## Week 3-4：如果Day1-Week2的数据说得通，开始做轨道B

1. 找2-3家你所在目标市场的中小型热泵/太阳能安装商（搜索本地黄页/Google Maps，不需要认识人，直接邮件/电话联系，说明"我能帮你带来精准的安装咨询线索，先免费试用N条线索看效果"）
2. 用一个简单的Google表单/Typeform收集"想装热泵/太阳能"的用户信息，人工转发给安装商
3. 验证安装商愿意为线索付费之后，再考虑要不要开发自动化的线索分发系统

---

## 配套内容草稿（可直接发布，需要你按实际情况核实价格和链接后再发）

### 文章1：How to Buy a Portable AC in Europe During a Heatwave — Without Overpaying

Europe just went through one of its most brutal heatwaves on record, and portable AC units like the Midea PortaSplit are selling out across Germany, France and Spain — with some resellers marking up prices 2-3x. Here's how to actually get one without getting ripped off:

1. **Check multiple retailers, not just one.** MediaMarkt, Amazon, Otto and Conrad often have different stock levels and prices for the same model. Prices can swing by €100+ between retailers during a shortage.
2. **Don't buy from unofficial resellers at 2-3x markup unless you truly can't wait** — official restocks happen weekly, and paying €2,000+ for a €900 unit rarely makes sense unless it's a genuine emergency (elderly relative, medical need, etc.).
3. **Factor in cash back.** Sites like EcoBack give you a percentage back in crypto (USDC) on top of whatever price you pay — on a €900-1200 unit that's real money back in your pocket, paid out instantly instead of a mail-in rebate form.
4. **Consider whether a permanent split-system AC or heat pump makes more sense long-term** — portable units solve the "no installation" problem this summer, but installed systems are more efficient if you're staying in your home for years. [See our heat pump cost breakdown →]

*[CTA: Join the EcoBack waitlist to get notified when your local retailer's cash back offer goes live.]*

---

### 文章2：Heat Pump Installation Costs in Europe 2026 — What It Actually Costs After Subsidies

If this summer's heatwave has you thinking about installing a heat pump instead of relying on portable AC every year, here's the real cost picture for 2026:

- **Sticker price**: €27,000-50,000 for a single-family home installation before subsidies.
- **After government grants**: typically €12,000-22,000 out of pocket, depending on your country's subsidy program.
- **Payback period**: for households that qualify for subsidies and run the system efficiently, the extra cost versus a gas system is typically recovered within 5-8 years through lower energy bills.
- **Why installation costs so much**: labor, electrical upgrades, and (in older housing stock common across Western Europe) structural modifications needed to accommodate the system.

This is exactly why so many households are opting for portable AC units instead of a full heat pump — the upfront cost gap is enormous. If you do decide to move forward with a heat pump, getting quotes from 2-3 verified local installers (rather than the first one you find) can meaningfully change your total cost. [Get free quotes + a small cash reward just for requesting them →]

*[CTA: Request heat pump quotes through EcoBack and get an instant reward, plus a bonus if you go ahead with installation.]*

---

## 这份清单和策略文档的关系

`web3-product-plan-eu-cooling-cashback.md` 是完整的商业逻辑（为什么做、JTBD、竞对、商业模型、财务推演）。这份 `LAUNCH_CHECKLIST.md` 是把那份逻辑拆解成"今天具体做什么"的可执行动作清单，配合 `site/index.html` 这个真实可部署的落地页，是你现在就能开始执行的部分，不需要再等更多调研或规划。
