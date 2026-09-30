 用 AI 赚钱 / 交付检查 报价前先做一次检查

在本地检查一份小型客户交付

粘贴 SRT 或工作流执行 CSV。原创规则在浏览器内运行，不上传文件、不调用 AI；用于发现结构问题，不能判定翻译含义或业务真实性。

检查任务 字幕时间码与可读性 工作流执行记录 每秒字符数（经验阈值） 单行字符数 默认值是可修改的示例，不是平台标准；语言、受众与屏幕大小会影响可读性。

检查时间（ISO，含时区） 近期窗口（小时） 窗口内预期唯一成功次数 CSV 列：run_id,finished_at,status,output_count。状态：success、failed、running、cancelled。仅检查输入记录，真实目标输出需另外对账。

SRT／CSV 文本 或选择本地文本文件（小于 500 KB） 加载虚构示例 运行本地检查 下载检查结果

网站上线基线检查

下载原创 Playwright 脚本，对最多五个获准页面进行手机与桌面检查，记录截图、溢出、标题、缺少图片 alt 属性和浏览器错误。不运行 Lighthouse／axe、不提交表单、不测安全、不发起支付。运行前请阅读脚本。

下载网站验收脚本 npm install playwright
npx playwright install chromium
node launch-audit.mjs --authorized https://YOUR-STAGING-DOMAIN / /pricing 在单独目录运行。由你提供访问授权和测试站域名，报告与截图保存在本地。加载页面会执行网站自身脚本，三条业务流程与支付需单独在沙箱中验收。



规划工作流维护 规划字幕交付 对比开源工具

Canonical: https://agiscorecard.com/zh/earn/delivery-lab
Generated from the HTML page. Original media belongs to its creators.
