export const channels=['direct','search','ai','external','owned','campaign'];
export const campaigns=['none','market','stablecoin','gas','protocol-change','publisher','mcp'];
export const events=['page_view','sample_run','own_run','report_export','tool_open','mcp_setup','citation_copy','cost_check','watch_save','watch_compare','review_save','review_export','proof_mine','proof_share','proof_verify'];
export const pageNames=['home','guide','examples','privacy','for-agents','publish','market','briefs','stablecoin-payment-check','gas-budget-check','protocol-change-check'];
export function attribution(url,referrer=''){
 const u=new URL(url),c=u.searchParams.get('channel'),tag=u.searchParams.get('via');let channel='direct';
 try{const h=new URL(referrer).hostname.toLowerCase();
  if(/(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|copilot\.microsoft\.com|gemini\.google\.com)$/.test(h))channel='ai';
  else if(/(^|\.)(google\.(?:com|de|fr|it|es|co\.uk|com\.hk|com\.au|ca|co\.jp|co\.in)|bing\.com|duckduckgo\.com|search\.yahoo\.com|ecosia\.org)$/.test(h))channel='search';
  else if(/(^|\.)agiscorecard\.com$/.test(h))channel='owned';else channel='external';
 }catch{}
 // Incoming categories are claimed attribution, never authenticated referrals.
 if(channels.includes(c))channel=c;
 const campaign=campaigns.includes(tag)?tag:u.searchParams.get('utm_source')==='embed'?'publisher':'none';
 if(channel==='direct'&&campaign!=='none')channel='campaign';
 return {channel,campaign};
}
export const pageName=p=>p==='/'?'home':p.replace(/^\//,'').replace(/\.html$/,'');
