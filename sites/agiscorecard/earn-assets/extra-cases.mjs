export const extraCases=[
  {
    "id": "workflow-maintenance",
    "category": "automation",
    "platform": "github",
    "video": null,
    "creator": "healthchecks/healthchecks",
    "source": "https://github.com/healthchecks/healthchecks",
    "original": "Healthchecks: scheduled-job monitoring",
    "tool": "https://github.com/healthchecks/healthchecks",
    "level": "intermediate",
    "price": 99,
    "reviewed": "2026-10-01",
    "en": {
      "title": "Find silent failures in an existing workflow",
      "summary": "Use job monitoring and output reconciliation to scope a bounded maintenance service. HTTP uptime alone cannot prove a business job completed.",
      "buyer": "An operations team already running a recurring workflow with measurable outputs.",
      "deliverable": "One workflow diagnosis, a run/output register, alert ownership and a separately agreed repair scope.",
      "edge": "Compare expected runs and actual records; check empty outputs and duplicates even when the job reports success.",
      "risk": "Customer access, integration licenses and unknown failure modes can consume hours. Do not promise 24/7 response or resell hosted n8n without a suitable license.",
      "test": "Ask an owner for a sanitized failed-run sample and the cost of a missed task. Test willingness to pay for one diagnosis before offering monthly maintenance.",
      "steps": [
        "Agree one workflow, expected schedule, output definition and permitted access.",
        "Use the local CSV checker below; compare flags with the actual destination records.",
        "Use Healthchecks or Uptime Kuma for an agreed signal; prove an intentional test failure triggers the alert.",
        "Deliver the failure evidence, recovery steps and a capped repair/support proposal."
      ],
      "gate": "Owner confirms the test alert and output reconciliation. A green heartbeat does not establish output correctness."
    },
    "zh": {
      "title": "检查已有自动化流程中的静默失败",
      "summary": "从任务监控和输出对账出发，设计范围明确的维护服务；网址在线不能证明业务任务完成。",
      "buyer": "已经运行周期工作流、且能定义实际输出的运营团队。",
      "deliverable": "一个工作流诊断、执行与输出记录、告警责任，以及另行确认的修复范围。",
      "edge": "对照预期次数与实际记录；即使状态成功，也检查空输出与重复处理。",
      "risk": "客户权限、集成许可证与未知故障可能耗掉工时。不承诺全天响应，不无许可转售托管 n8n。",
      "test": "请负责人提供脱敏失败记录和漏任务成本，先验证一个诊断的付费意愿，再考虑包月维护。",
      "steps": [
        "约定一个工作流、执行周期、输出定义与访问权限。",
        "用下方本地 CSV 检查器，再与真实目标记录对账。",
        "选择 Healthchecks 或 Uptime Kuma 的合适信号，故意制造测试失败验证告警。",
        "交付故障证据、恢复步骤和有工时上限的修复维护方案。"
      ],
      "gate": "负责人确认测试告警与输出对账。绿色心跳不代表业务输出正确。"
    }
  },
  {
    "id": "launch-acceptance",
    "category": "automation",
    "platform": "github",
    "video": null,
    "creator": "microsoft/playwright",
    "source": "https://github.com/microsoft/playwright",
    "original": "Playwright: browser testing and automation",
    "tool": "https://github.com/microsoft/playwright",
    "level": "intermediate",
    "price": 149,
    "reviewed": "2026-10-01",
    "en": {
      "title": "Check an AI-built website before launch",
      "summary": "Run a small browser baseline, then review three customer journeys. Sell reproducible findings and agreed fixes, not a universal quality score.",
      "buyer": "A founder with a working staging site and a defined launch task.",
      "deliverable": "Up to five pages, three manually agreed journeys, screenshots, reproducible defects and one retest.",
      "edge": "Verify the user can finish the intended task; Lighthouse and axe-core cover different subsets and cannot certify security or accessibility.",
      "risk": "Login, third-party widgets and payment sandboxes complicate tests. Our starter checks do not submit forms or create purchases.",
      "test": "Show a sample report from an authorized demo site. Ask a buyer to name one blocked launch flow and fund a small fixed-scope review.",
      "steps": [
        "Confirm authorization, staging origin, five pages and three journeys.",
        "Run the downloadable Playwright baseline and retain environment/time evidence.",
        "Manually review agreed tasks, keyboard navigation and error recovery; quote security work separately.",
        "Retest fixed defects and hand over unresolved items with owner and severity."
      ],
      "gate": "The three agreed journeys have recorded results and remaining defects are accepted. Automatic checks alone do not mean launch approval."
    },
    "zh": {
      "title": "为 AI 生成的网站做上线前验收",
      "summary": "先做小范围浏览器基线检查，再核验三条客户流程；交付可复现缺陷与约定修复。",
      "buyer": "已有测试站、能明确上线任务的创业者。",
      "deliverable": "最多五页、三条人工约定流程、截图、可复现缺陷和一次复测。",
      "edge": "检查用户能否完成真实任务；Lighthouse 与 axe-core 覆盖不同子集，不能认证安全或无障碍合规。",
      "risk": "登录、第三方组件与支付沙箱会增加复杂度。本页基础脚本不提交表单、不创建支付订单。",
      "test": "用获准演示站展示报告，请买家指出一条阻碍上线的流程，验证固定范围检查的付费意愿。",
      "steps": [
        "确认授权、测试站域名、五个页面与三条任务流程。",
        "运行可下载的 Playwright 基线脚本，保存环境与时间证据。",
        "人工核验约定任务、键盘操作和错误恢复，安全检查另行约定。",
        "复测修复项，交接未解决问题、责任人与严重程度。"
      ],
      "gate": "三条约定流程均有结果记录，遗留问题经负责人确认。自动检查不能单独批准上线。"
    }
  },
  {
    "id": "subtitle-localization",
    "category": "video",
    "platform": "github",
    "video": null,
    "creator": "SubtitleEdit/subtitleedit",
    "source": "https://github.com/SubtitleEdit/subtitleedit",
    "original": "Subtitle Edit: subtitle editing toolkit",
    "tool": "https://github.com/SubtitleEdit/subtitleedit",
    "level": "intermediate",
    "price": 199,
    "reviewed": "2026-10-01",
    "en": {
      "title": "Deliver reviewed subtitles for one product tutorial",
      "summary": "Start with a client-owned SRT and one target language. Check timing locally, then review names, numbers and meaning with a qualified reader.",
      "buyer": "A software team publishing a short tutorial in another language.",
      "deliverable": "One video up to five minutes, one corrected SRT, terminology sheet and one revision. Dubbing is quoted separately.",
      "edge": "Track subtitle timing, terms and product-version changes. Machine transcription or a clean SRT does not prove translation accuracy.",
      "risk": "Target-language expertise, names and UI changes determine rework. Model, voice and dependency licenses are separate from a repository license.",
      "test": "Use permissioned material to review a short sample. Have the buyer accept terminology and scope before processing the full tutorial.",
      "steps": [
        "Confirm source/media rights, language, product version and terminology.",
        "Use Subtitle Edit or Whisper to prepare source captions; translate only with approved tools.",
        "Run the local SRT check; verify meaning, names and numbers against the media.",
        "Test captions on a phone, record reviewer corrections and deliver versioned files."
      ],
      "gate": "A target-language reviewer checks meaning and key facts; playback confirms synchronization. No machine-quality or revenue guarantee."
    },
    "zh": {
      "title": "交付一条产品教程的审核字幕",
      "summary": "从客户自有 SRT 和一个目标语言开始；本地检查时间码，再由合适的审核者校对专名、数字与含义。",
      "buyer": "需要用另一种语言发布短教程的软件团队。",
      "deliverable": "一条五分钟以内视频、一份校对 SRT、术语表和一次修改；配音单独报价。",
      "edge": "记录时间码、术语与产品版本变化。机器转录或结构无误的 SRT 不代表翻译正确。",
      "risk": "目标语言水平、专名和界面更新决定返工量。模型、声音和依赖许可证需单独核验。",
      "test": "用获准素材审核一个短样本，先让买家确认术语和范围，再处理完整教程。",
      "steps": [
        "确认素材权利、语言、产品版本和术语。",
        "用 Subtitle Edit 或 Whisper 准备原字幕，仅使用获准工具翻译。",
        "运行本地 SRT 检查，再对照媒体校对含义、专名和数字。",
        "在手机上测试字幕，记录人工修订并交付带版本的文件。"
      ],
      "gate": "目标语言审核者检查含义与关键事实，播放确认同步。不承诺机器翻译质量或收入。"
    }
  }
];
