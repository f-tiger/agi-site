// Shared allowlist: browser payloads, server validation and aggregate reporting.
export const QUOTE_ACTIONS=['entry_open','builder_open','client_open','demo_preview','demo_start','own_edit','own_ready','file_generated','link_copied','summary_copied','summary_generated','remix','tool_link_copied','tool_message_copied','tool_share_requested'];
export const QUOTE_SOURCES=['direct','home','video-guide','video-hub','video-tool','video-category','share','youtube','tiktok','community','client'];
export const QUOTE_TEMPLATES=['video','web','content'];
export function quoteEventPath(action,source='direct'){
  if(!QUOTE_ACTIONS.includes(action)||!QUOTE_SOURCES.includes(source))return null;
  return `/quote-builder/${action}/${source}`;
}
export function parseQuoteEvent(path){
  if(typeof path!=='string')return null;
  const parts=path.split('/');
  if(parts.length===3&&parts[1]==='quote-builder'&&QUOTE_ACTIONS.includes(parts[2]))return {action:parts[2],source:'legacy'};
  if(parts.length!==4||parts[1]!=='quote-builder'||!quoteEventPath(parts[2],parts[3]))return null;
  return {action:parts[2],source:parts[3]};
}
// Language is the only input: private configuration and location never enter recommendations.
export function toolRecommendation(lang){
  const en=lang==='en';
  return {title:en?'BPJ Quote Studio':'BPJ 报价工坊',text:en?'A free interactive quote tool: set your own services and rates, let clients adjust quantities, and copy an itemized scope. Try the sample first. No signup; no payments or contracts.':'一个免费的互动报价工具：填入自己的服务和单价，让客户选数量，再复制需求明细。可以先试示例，无需注册；不提供收款或签约。',url:'https://baipiaoji.com/'+(en?'en/':'')+'studio/quote-builder?source=share'};
}
