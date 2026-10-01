// Shared allowlist: browser payloads, server validation and aggregate reporting.
export const QUOTE_ACTIONS=['builder_open','client_open','demo_preview','own_edit','own_ready','file_generated','link_copied','summary_copied','summary_generated','remix','tool_link_copied'];
export const QUOTE_SOURCES=['direct','home','video-guide','video-hub','share','youtube','tiktok','community','client'];
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
