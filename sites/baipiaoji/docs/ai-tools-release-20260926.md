# BPJ AI 工作工具首发

Owner 要求将任务回溯与预测纳入 BPJ 自研工具，建立可持续录入新工具的 AI 板块，并支持免费和付费 MCP。沿用中英样式和原部署渠道。

入口：/studio/ai/、/en/studio/ai/；首工具：/studio/task-loop、/en/studio/task-loop。lib/ai-tool-registry.mjs 为网页目录、JSON、MCP目录的共同注册源；添加项不自动产生执行能力，须补页面、执行函数和测试。

免费网页：目标状态、事前预测、事后结果、目标变更依据、JSON备份与导入，200条记录上限。免费MCP /api/ai-mcp：list_bpj_ai_tools、review_task_state。显式规则，不自动读聊天、不调用模型、不执行工作、不提供校准成功概率。网页任务不上传；主动调用MCP时输入发送到服务器，应用不保存任务历史。浏览器记录非防篡改审计，用户证据非独立核验。

付费 /api/ai-mcp-pro：compare_task_runs 分组统计最多100条。默认关闭，AI_MCP_PAID_ENABLED 未设置时503。启用后服务端校验Bearer会员密钥、有效期、暂停状态，60请求/分钟限额。密钥只放Authorization头，不放URL；当前支持显式header客户端，不宣称完整OAuth自动授权。不得为尚未开放的MCP购买会员。没有新增收费或改变原价格。

开关启用前必须验证生产D1容量、真实会员有效/过期/暂停/密钥轮换与限额的端到端结果，并同步页面权益和价格说明。付费保持关闭不会阻断免费网页或免费MCP。没有模型效果、客户支付或节省成本证据。

发现入口：首页自研区、顶栏/移动菜单、页脚、功能地图、搜索、sitemap、canonical/hreflang、JSON-LD、llms.txt、双语ai-tools.json。分享只包含公共页面，不包含任务内容。

验证：核心与接口测试；双语320–1440px浏览器实际任务、刷新、导出、目标变更与文本安全；全站门禁。CI新增免费功能上线检查，位于账户检查之前，分别报告公开工具和账户故障。
