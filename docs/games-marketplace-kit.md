# 游戏市场提交包(2026-08-24,owner「加入游戏市场」)

机器侧已备齐:11 款游戏全部支持 `?embed=1` 无壳嵌入与 `?clean=1`;PWA 可安装;
「每题唯一解机器验证」是所有商店文案的差异化第一句。以下提交需要 owner 开户/
点击(烧号红线:机器不代注册不代提交),每家 15-30 分钟:

| 平台 | 模式 | 要求 | 建议提交物 |
|---|---|---|---|
| **itch.io** | 免费展示+可选打赏 | 账号+项目页;HTML5 zip 或外链 | 外链模式指到 play.agiscorecard.com(零打包);标签 puzzle/daily/logic |
| **CrazyGames** | 分成 | 开发者账号;审核 | 「11 合 1 每日逻辑合集」提交(launch-kit ③ 原案);接受外部托管链接起审 |
| **Poki** | 分成 | 申请制,审核最严 | 等 itch/CrazyGames 有数据再申请 |
| **GameDistribution** | 分成+SDK | 必须集成其广告 SDK | **不做**:广告 SDK 与「无广告」承诺冲突 |
| **Newgrounds** | 免费+打赏 | 账号+HTML5 上传 | 低优先;流量偏动作向 |

注意:CrazyGames/Poki 分成按其站内托管流量计——被收录≠本站获得流量,主要价值
是品牌曝光与反链。优先级:itch.io(最快、零改动)→ CrazyGames(合集)→ Poki。
提交文案见 docs/gridlings-launch-kit.md(Show HN 稿 + 门户三连稿)。

## 自动化边界(2026-08-24,owner「你可以自动化完成，不需要我?」的回答)

**已全自动(零 owner 依赖,今日上线)**:
- `/download` 页 + 12 个 HTML5 独立包(每款一个 + 全集),CI 每次部署自动重建
  (`tools/build_packages.py`,zip 不进仓库),浏览器实测可玩。这些 zip 就是
  itch/CrazyGames 要的标准上传物——打包环节永久归零。
- PWA 安装、iframe 嵌入、自托管许可(带回链要求 = 第二条反链引擎)。

**不可全自动(平台强制人身认证,机器代办即烧号)**:各门户的开发者账号注册与
首次提交。**最短 owner 路径 = itch.io 一次 15 分钟**:注册 → 新建项目 → 上传
gridlings-all-11.zip(或逐款)→ 生成 API key 存进 agi-site repo secret
`BUTLER_API_KEY` → 之后每次游戏更新由 CI 用 butler 自动推送,owner 终身不再动手。
CrazyGames/Poki 无上传 API,每次都要人。

## 平台规则适配(2026-08-24,owner「按照平台规则优化好」)

**两套构建,按平台选**:
- `/downloads/*.zip`(标准包):含回流链接与胜利 CTA——**itch.io / Newgrounds 用**
  (允许外链)。
- `/downloads/strict/*.zip`(门户严格包):**零外链**(CrazyGames 类门户 QA 会因
  外链拒稿),纯文本署名保留,挑战/分享复制的是站点 URL 文本(剪贴板文本不是
  链接元素,合规)。标题带 "(portal build)" 便于区分。

**itch.io 上传参数(每款相同)**:Kind = HTML;Viewport **700 × 1000**;
☑ Mobile friendly(四向)☑ Fullscreen button ☐ Click to launch(留默认自动加载);
标签:puzzle, daily, logic, minimalist + 各款家族词(nonogram/sudoku/binary 等);
描述与截图文案:store-assets 节的每款三行卖点直接粘贴。

**病毒环在门户沙箱内已实测存活(2026-08-24)**:跨域 iframe 中
clipboard.writeText 常被拒、prompt() 被沙箱静默屏蔽——旧兜底在门户上等于把
分享做成无声空操作。现为四级链:原生分享面板(移动)→ 异步剪贴板 → execCommand
→ 可见选择框(copy.js,九引擎共用)。在 sandbox="allow-scripts allow-same-origin"
的 iframe 内驱动真实胜利验证:分享显示 Copied!、挑战复制正常、零异常。
