// A successful URL probe never re-verifies a vendor's policy.
export function toolEvidence(tool, licence) {
  return {
    free_tier_checked: tool.limits?.checked || null,
    paid_tier_checked: tool.limits?.paid?.checked || null,
    commercial_terms_checked: licence?.checked || null,
    link_checked: tool.last_verified || null,
  };
}

export function evidenceSummary(tool, licence, lang = 'en') {
  const d = toolEvidence(tool, licence);
  const zh = lang === 'zh';
  const rows = [
    d.free_tier_checked
      ? (zh ? `免费额度内容核实：${d.free_tier_checked}` : `Free-tier content checked: ${d.free_tier_checked}`)
      : (zh ? '免费额度内容：未记录单独核实日期' : 'Free-tier content: no separate check date recorded'),
    d.paid_tier_checked && (zh ? `付费档内容核实：${d.paid_tier_checked}` : `Paid-tier content checked: ${d.paid_tier_checked}`),
    d.commercial_terms_checked && (zh ? `商用条款核实：${d.commercial_terms_checked}` : `Commercial terms checked: ${d.commercial_terms_checked}`),
    d.link_checked
      ? (zh ? `链接可达检查：${d.link_checked}` : `Link availability checked: ${d.link_checked}`)
      : (zh ? '链接可达检查：尚无记录' : 'Link availability: not checked yet'),
  ].filter(Boolean);
  return rows.join(zh ? '；' : '; ') + (zh
    ? '。链接可达不代表额度、价格或条款已重新核实。请按相应内容日期与来源判断，使用前再确认官方页面。'
    : '. An available link does not re-verify limits, prices or terms. Use the relevant content date and source, and confirm on the vendor page before relying on it.');
}
