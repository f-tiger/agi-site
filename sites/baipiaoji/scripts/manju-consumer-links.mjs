// Link labels describe the destination, never successful playback or authorization.
function safeURL(value){
  if(typeof value!=='string'||value!==value.trim()||/[\u0000-\u0020\u007f\\]/u.test(value))return null;
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&url.href===value?url:null;}catch{return null;}
}
const isHongguoDetail=url=>Boolean(url&&url.hostname==='hongguoduanju.com'&&url.pathname==='/detail'&&/^\?series_id=[1-9]\d{0,24}$/.test(url.search)&&!url.hash);
export function classifyConsumerLink(item={},officialRecords=[]){
  item=item&&typeof item==='object'?item:{};
  const url=safeURL(item.destination),fallback=url||safeURL(item.source);
  const result={url:fallback?.href||'',label:'查看来源',action:'source',official:false,kind:'source'};
  // Only the caller's currently validated cohorts can supply an alternative.
  // Exact titles and one unambiguous official destination are required.
  if(item.linkType==='search'&&typeof item.title==='string'&&item.title&&Array.isArray(officialRecords)){
    const matching=officialRecords.filter(record=>record?.title===item.title),targets=matching.map(record=>safeURL(record.url));
    if(targets.length&&targets.every(isHongguoDetail)){const unique=[...new Set(targets.map(target=>target.href))];if(unique.length===1)return {...result,url:unique[0],label:'到红果查看',action:'official_open',official:true,kind:'official'};}
  }
  if(!url||url.hash)return result;
  const datedPage=/^\/\d{4}\/\d{2}\/\d{2}\/(?:VID|ARTI)[A-Za-z0-9]+\.shtml$/;
  if(item.linkType==='collection'){
    const hongguo=isHongguoDetail(url);
    const cctv=url.hostname==='tv.cctv.com'&&/^\/\d{4}\/\d{2}\/\d{2}\/VID[A-Za-z0-9]+\.shtml$/.test(url.pathname)&&!url.search;
    if(hongguo||cctv)return {...result,label:hongguo?'到红果查看':'到央视查看',action:'official_open',official:true,kind:'official'};
  }
  if(item.linkType==='search'){
    const douyin=url.hostname==='www.douyin.com'&&/^\/search\/[^/]+$/.test(url.pathname)&&!url.search;
    const qq=url.hostname==='v.qq.com'&&url.pathname==='/x/search/'&&[...url.searchParams.keys()].length===1&&Boolean(url.searchParams.get('q'));
    if(douyin||qq)return {...result,label:douyin?'去抖音搜索':'在腾讯视频搜索',action:'platform_search',kind:'search'};
  }
  if(item.linkType==='intro'&&['www.cctv.com','news.cctv.com','tv.cctv.com'].includes(url.hostname)&&datedPage.test(url.pathname)&&!url.search)return {...result,label:'查看介绍/预告',action:'intro_open',kind:'intro'};
  return result;
}
