// A quota comparison is evidence for a trial, not a cancellation recommendation.
// These same functions run in the generated browser page and the boundary tests.
export function auditQuota(entry, category) {
  if (category === 'chat') {
    // Image boosts are not chat messages, even when the vendor sits in /c/chat.
    return { kind: entry.wall_type === 'none_on_text' ? 'text' : 'unknown' };
  }
  if (entry.kind === 'byo_model') return { kind: 'provider' };
  if (entry.kind === 'trial') return { kind: 'trial', days: entry.trial_days || null };
  if (entry.kind === 'unstated') return { kind: 'unknown' };
  // An unselected model tier cannot be replaced by the smallest tier's limit.
  if (entry.kind === 'rate_tiered') return { kind: 'tiered' };
  const measures = [];
  if (entry.completions_per_month) measures.push({ input: 'completions', unit: 'completions', period: 'month', cap: entry.completions_per_month });
  if (entry.chat_per_month) measures.push({ input: 'chatRequests', unit: 'chatRequests', period: 'month', cap: entry.chat_per_month });
  if (entry.requests_per_day) measures.push({ input: 'requests', unit: 'requests', period: 'day', cap: entry.requests_per_day });
  return measures.length ? { kind: 'count', measures } : { kind: 'other-unit', unit: entry.meter || '' };
}

export function assessAudit(quota, usage) {
  if (quota.kind !== 'count') return { status: quota.kind, comparisons: [] };
  const missing = [], comparisons = [];
  for (const measure of quota.measures) {
    const raw = usage[measure.input];
    const value = typeof raw === 'number' ? raw : (typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN);
    if (!Number.isFinite(value) || value < 0) { missing.push(measure.input); continue; }
    const need = value * (measure.period === 'month' ? 30 : 1);
    comparisons.push({ ...measure, need });
  }
  const over = comparisons.some(x => x.need > x.cap);
  return { status: missing.length ? 'missing' : over ? 'over' : 'within', comparisons, missing };
}

export function auditAdvice(status, zh) {
  const texts = {
    within: [
      ['数量在已记录额度内', '这只比较数量；月度值按每日用量 × 30 估算，没有证明免费档能替代你的付费工作流。', '用免费档完成一个代表性任务，核对需要的模型、功能、导出和实际额度，再决定是否调整订阅。'],
      ['Within the recorded allowance', 'This compares quantity only. Monthly usage is daily usage × 30; it does not establish that the free tier can replace your paid workflow.', 'Complete one representative task on the free tier; check the required model, features, export and actual allowance before changing a subscription.'],
    ],
    over: [
      ['超过已记录的某项额度', '这不说明当前付费套餐值得买，也没有比较其它方案。', '在账户中确认触顶的是同一功能与计量单位，再比较减少用量、其它工具或现有套餐的实际费用。'],
      ['Above a recorded allowance', 'This does not establish that the paid plan is worth its price, or compare alternative plans.', 'Confirm the same feature and meter in your account, then compare lower usage, other tools and the actual cost of your current plan.'],
    ],
    missing: [
      ['缺少可比较的用量', '空白和无效用量不会按零处理；需要的字段尚未填写完整。', '填写所选工具实际使用的补全或模型请求数；不知道时先查账户记录，不要用提问轮数代替模型请求。'],
      ['Comparable usage is missing', 'Blank or invalid usage is not treated as zero; a required field is incomplete.', 'Enter the completions or model requests actually used in this tool. Check account records if unknown; conversation turns are not model requests.'],
    ],
    unknown: [
      ['没有可比较的公开数字', '记录中没有适用于该聊天或编程功能的固定免费额度。图片 boosts 等其它功能的数字不用于推算聊天用量。', '查看账户当前额度与重置时间，用同一个小任务观察实际限制；不能据此估算节省或判断该买哪档。'],
      ['No comparable published figure', 'The record has no fixed free allowance for this chat or coding feature. Figures for other features, such as image boosts, do not measure chat usage.', 'Check the current allowance and reset time in your account, then observe one small task. This cannot establish savings or which paid tier to buy.'],
    ],
    trial: [
      ['试用与长期免费档要分开', '记录描述的是限时试用；试用后的免费额度未公布，不等于免费档不存在或额度为零。', '在试用结束后的账户或官方方案页确认保留的功能和额度；不要把试用能力作为长期免费替代方案。'],
      ['Separate the trial from the ongoing free tier', 'The record describes a limited trial. An unpublished post-trial allowance does not mean the free tier is absent or has zero allowance.', 'Check the retained features and allowance after the trial, in your account or the official plan page; do not treat trial access as an ongoing free replacement.'],
    ],
    provider: [
      ['工具与模型账单分开核对', '免费工具仍可能调用付费模型；本机运行也不证明数据不离开设备。', '核对实际模型端点、API 账单、遥测和本地配置，再判断有无可调整的支出。'],
      ['Review tool and model bills separately', 'A free tool can still call a paid model. Running the tool locally does not establish that data stays on the device.', 'Check the actual model endpoint, API bill, telemetry and local configuration before deciding whether any spending can change.'],
    ],
    text: [
      ['文本额度不能代表整个套餐', '记录中的文本无上限声明不等于所有模型、文件、图片或工具调用无上限，也没有比较付费功能。', '列出你实际使用的付费功能，用当前免费账户逐项检查可用性与限制，保留未确认项。'],
      ['Text allowance does not cover the whole plan', 'An uncapped-text statement does not establish unlimited access to every model, file, image or tool, or compare paid features.', 'List the paid features you actually use, check their availability and limits in your current free account, and leave unresolved items marked unknown.'],
    ],
    'other-unit': [
      ['计量单位不能直接换算', '记录按 credits 或 tokens 等单位计量；没有可靠的换算率，不能由每天提问次数推算。', '从账户记录同一个代表性任务前后的实际用量，再按官方计量单位比较。'],
      ['The units cannot be directly converted', 'The record uses credits, tokens or another meter. Without a supported conversion, daily question counts cannot establish usage.', 'Record actual account usage before and after the same representative task, then compare using the vendor’s meter.'],
    ],
    tiered: [
      ['先确认模型对应的档位', '不同模型有不同上限；没有选定模型，不能用最低档额度判断你的用量是否超出。', '在官方限额表中找到实际使用的模型，同时核对每分钟、每天、单次 tokens 与并发限制。'],
      ['Identify the actual model tier first', 'Different models have different limits. Without the actual model, the smallest allowance cannot establish that your usage is over its limit.', 'Find the actual model in the official rate-limit table and check requests per minute/day, tokens per call and concurrency together.'],
    ],
  };
  const [title, limitation, next] = texts[status][zh ? 0 : 1];
  return { title, limitation, next };
}
