const owned={ 'baipiaoji.com':'bpj','learn.agiscorecard.com':'learn','getecoback.com':'eco','agiscorecard.com':'agi' };
export const acquisitionSources=['direct','bpj','learn','eco','agi','search','ai','community','social','example'];
// Only a fixed category leaves the browser. Never store referrer URLs or queries.
export function acquisitionSource(search='',referrer=''){
 const src=new URLSearchParams(search).get('src');
 if(acquisitionSources.includes(src)&&src!=='direct')return src;
 let host;try{host=new URL(referrer).hostname.toLowerCase().replace(/^www\./,'');}catch{return 'direct';}
 if(owned[host])return owned[host];
 if(['chatgpt.com','chat.openai.com','perplexity.ai','claude.ai','gemini.google.com','copilot.microsoft.com'].some(x=>host===x||host.endsWith('.'+x)))return 'ai';
 if(/(^|\.)(google\.(com|de|co\.uk|fr|it|co\.jp|com\.au)|bing\.com|duckduckgo\.com|search\.yahoo\.com|baidu\.com)$/.test(host))return 'search';
 if(['reddit.com','news.ycombinator.com','producthunt.com','github.com'].some(x=>host===x||host.endsWith('.'+x)))return 'community';
 if(['youtube.com','youtu.be','linkedin.com','x.com','t.co','facebook.com','instagram.com'].some(x=>host===x||host.endsWith('.'+x)))return 'social';
 return 'direct';
}
