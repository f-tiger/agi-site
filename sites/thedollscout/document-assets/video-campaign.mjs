// One bounded experiment; no file content, identifiers or raw query storage.
export const CAMPAIGN='tds-image-01';
export const CAMPAIGN_PATH='/image-compressor';
export const SOURCES=['youtube','tiktok'];
export const VIDEO_EVENTS=Object.freeze({doc_view:'view',doc_image_complete:'complete',doc_utility_export:'export',doc_image_sample:'sample',doc_error:'error',doc_share:'share',doc_summary_share:'summary_share'});
export function campaignMetadata(search,path,event){
 const q=new URLSearchParams(search);
 return path===CAMPAIGN_PATH&&VIDEO_EVENTS[event]&&q.get('utm_campaign')===CAMPAIGN&&q.get('utm_medium')==='organic_video'&&SOURCES.includes(q.get('utm_source'))?{c:CAMPAIGN,s:q.get('utm_source')}:{};
}
export function videoEventName(event,source){return VIDEO_EVENTS[event]&&SOURCES.includes(source)?`vid_tdsimage01_${source}_${VIDEO_EVENTS[event]}`:null;}
export function validCampaign(body){return body.c===CAMPAIGN&&body.p===CAMPAIGN_PATH&&!!videoEventName(body.e,body.s);}
export function refEvidence(source,host){
 const h=String(host||'').toLowerCase().replace(/\.$/,'');const is=d=>h===d||h.endsWith('.'+d);
 if(['thedollscout.com','agiscorecard.com','baipiaoji.com','getecoback.com','pages.dev','workers.dev'].some(is))return 'internal';
 if(source==='youtube'&&(is('youtube.com')||is('youtu.be'))||source==='tiktok'&&is('tiktok.com'))return 'referrer';
 return h?'other':'tag_only';
}
