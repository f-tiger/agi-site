// Reuse the planner's exact calculator and client, without its account/site shell.
export function publisherKit(BASE, zh, esc) {
  const src = `${BASE}/embed/work-plan`;
  const snippet = `<iframe src="${src}" title="BPJ AI work planner" loading="lazy" width="100%" height="780" style="border:1px solid #d6ddd7;border-radius:16px" referrerpolicy="origin" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>`;
  return `<section class="limits-table" id="embed"><h2>${zh?'把规划器放进你的教程或网站':'Put the planner in your tutorial or website'}</h2>
  <p>${zh?'让读者在文章里填写工作量，核对免费额度。免费嵌入，无需账号；保留 BPJ 来源与完整工具入口。':'Let readers enter their workload and check free allowances inside your article. Free to embed, with no account; keep the BPJ credit and full-tool link.'}</p>
  <p><a href="${src}?preview=1" target="_blank" rel="noopener">${zh?'打开组件预览 ↗':'Preview the widget ↗'}</a> · <a href="${zh?'https://baipiaoji.com/en':'https://baipiaoji.com'}/work-plan#embed">${zh?'English embed':'Chinese embed'}</a></p>
  <label for="wpEmbedCode">${zh?'粘贴到网站的 HTML 区块':'Paste into an HTML block on your website'}</label><textarea id="wpEmbedCode" readonly rows="5" style="width:100%;box-sizing:border-box;font:13px/1.6 monospace;padding:12px">${esc(snippet)}</textarea>
  <p><button type="button" id="wpEmbedCopy" class="wp-go">${zh?'复制嵌入代码':'Copy embed code'}</button> <span id="wpEmbedStatus" role="status"></span></p>
  <p class="sub-note">${zh?'组件从示例量开始，不包含你当前填写的任务。计算在读者浏览器内完成。只记录动作类别、语言和来源域，不发送工作量；尊重 DNT/GPC，不加载第三方统计。发布后请修改一个数字并计算，再打开完整规划器核对。':'The widget starts with example inputs, never your current tasks. Calculations stay in the reader’s browser. Only action category, language and referring domain are measured, with no workload values; DNT/GPC are respected and no third-party analytics load. After publishing, change a value, calculate, then open the full planner to check the handoff.'}</p>
  <p>${zh?'读者继续使用：计算和导出免费；云端保存、最近 10 个版本和跨设备恢复为 9 USDT / 30 天，不自动续费。':'For readers: calculation and export are free; cloud saving, the last 10 versions and cross-device restore cost 9 USDT / 30 days, with no auto-renewal.'} <a href="${BASE}/members">${zh?'查看会员交付':'See membership delivery'}</a></p></section>`;
}

export function plannerWidget({BASE, zh, calculator, client}) {
  return `<!doctype html><html lang="${zh?'zh-CN':'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><meta name="referrer" content="no-referrer"><title>BPJ · ${zh?'AI 工作量规划器':'AI work planner'}</title><base target="_blank"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/work-plan-embed.css"></head>
  <body data-work-plan-embed="1"><main class="wp-widget"><header><p class="wp-widget-brand">BPJ / FREE AI WORK PLANNER</p><h1>${zh?'免费额度，够完成工作吗？':'Will free tiers cover your work?'}</h1><p>${zh?'先选岗位，再把示例量改成你的工作量。只使用有来源和核实日期的同单位额度。':'Pick a role, then replace the example inputs with your workload. Only sourced, dated allowances in the same unit count.'}</p></header>
  ${calculator}
  <div id="wpCardPreview" hidden><canvas id="wpCardCanvas"></canvas><button id="wpCardDownload" type="button" hidden></button></div>
  <footer><p><a id="wpFull" class="wp-go" href="${BASE}/work-plan?via=embed" target="_blank" rel="noopener noreferrer">${zh?'打开完整方案与导出 ↗':'Open full plan & export ↗'}</a></p><p>${zh?'打开时携带你填写的任务参数。计算与导出免费；云端保存 9 USDT / 30 天。':'Opening the full planner carries your task settings. Calculation and export are free; cloud saving is 9 USDT / 30 days.'}</p><p class="sub-note">${zh?'由白嫖计提供 · 工作量留在浏览器内。只统计动作类别与来源域；不使用 Cookie 或第三方统计，尊重 DNT/GPC。':'By Baipiaoji · Workloads stay in your browser. Only action category and referring domain are measured; no cookies or third-party analytics, with DNT/GPC respected.'}</p></footer></main>
  <script src="/work-plan-distribution.js"></script>${client}</body></html>`;
}
