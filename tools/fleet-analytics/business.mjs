// Public route + fixed action only. Never accept labels, values or customer data.
const workbench = {
  'agiscorecard.com': ['evidencewatch','agentfit','filinglens-workspace','tradecheck-team','localebatch-qa','rfq-roundbook','evidencebrief','modelmeter-reconcile','workflowcost','job-evidence','scamchecklist'],
  'baipiaoji.com': ['launchdesk','quotawatch-pro','creatorops'],
  'getecoback.com': ['billlens','appliancepayback','homeenergy-log'],
  'thedollscout.com': ['collectorledger','dropcalendar','displayfit']
};
const documents = {
  'verify-file': ['doc_verify_create','doc_verify_match','doc_verify_mismatch','doc_verify_sample'],
  'pdf-accessibility-checker': ['doc_start','doc_complete','doc_export','doc_sample'],
  'pdf-batch-audit': ['doc_start','doc_complete','doc_export','doc_sample'],
  'pdf-to-text': ['doc_start','doc_complete','doc_export','doc_sample'],
  'compare-pdf-text': ['doc_start','doc_complete','doc_export','doc_sample'],
  'image-compressor': ['doc_image_complete','doc_image_sample','doc_utility_export'],
  'json-compare': ['doc_json_complete','doc_json_sample','doc_utility_export'],
  'time-zone-planner': ['doc_meeting_complete','doc_meeting_sample','doc_utility_export'],
  'delivery-evidence': ['doc_delivery_complete','doc_delivery_sample','doc_delivery_export'],
  'ai-portrait-background-remover': ['doc_ai_portrait_complete','doc_ai_portrait_sample','doc_ai_portrait_export'],
  'ai-audio-to-text': ['doc_ai_speech_complete','doc_ai_speech_sample','doc_ai_speech_export'],
  'ai-text-summarizer': ['doc_ai_summary_complete','doc_ai_summary_sample','doc_ai_summary_export']
};
export function businessEvent(host, pathname, detail) {
  if (!detail || typeof detail !== 'object' || Object.keys(detail).some(k => k !== 'name') || typeof detail.name !== 'string') return null;
  const name = detail.name;
  const route = String(pathname).replace(/^\/(?:en|de|zh|it)\//, '/').replace(/\.html$/, '');
  const match = /^\/workbench\/([a-z0-9-]+)$/.exec(route);
  if (match && workbench[host]?.includes(match[1])) {
    const action = /^workbench_(example_)?(start|complete|export)$/.exec(name);
    if (action) return {name:'tool_' + (action[1] || '') + action[2], tool_id:match[1]};
  }
  if (host === 'thedollscout.com') {
    const tool = route.slice(1);
    if (documents[tool]?.includes(name)) {
      const action = name.endsWith('_sample') ? 'example_run' : name.endsWith('_export') ? 'export' : name.endsWith('_start') ? 'start' : 'complete';
      return {name:'tool_' + action, tool_id:tool};
    }
  }
  return null;
}
