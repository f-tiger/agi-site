// Official TradingView iframe widgets. No third-party script executes beside research inputs.
export const marketSymbols = ['AMD','TSLA','META','MU','NVDA','PLTR','SPCX','AMZN','GOOGL','MSFT','NOW','PANW','SPY','QQQ','TQQQ'].map(ticker=>({ticker,symbol:(ticker==='SPY'?'AMEX':ticker==='NOW'?'NYSE':'NASDAQ')+':'+ticker}));
export function widgetURL(kind, ticker, zh=false){
  if(!['symbol-overview','market-quotes'].includes(kind))throw Error('widget');
  const selected=marketSymbols.find(x=>x.ticker===ticker);if(!selected)throw Error('symbol');
  const config={locale:zh?'zh_CN':'en',colorTheme:zh?'light':'dark',width:'100%',height:'100%',isTransparent:false,'page-uri':'agiscorecard.com'+(zh?'/zh':'')+'/portfolio-tracker'};
  if(kind==='symbol-overview')Object.assign(config,{symbols:[[ticker,selected.symbol+'|1D']],autosize:true,chartOnly:false,hideMarketStatus:false,hideSymbolLogo:false,hideDateRanges:false,dateRanges:['1d|1','1m|30','3m|60','12m|1D','60m|1W','all|1M'],changeMode:'price-and-percent',chartType:'area',lineWidth:2});
  else Object.assign(config,{showSymbolLogo:true,symbolsGroups:[{name:zh?'12 股观察名单':'12-stock watchlist',symbols:marketSymbols.slice(0,12).map(x=>({name:x.symbol,displayName:x.ticker}))},{name:zh?'指数 ETF 与杠杆 ETF':'Index and leveraged ETFs',symbols:marketSymbols.slice(12).map(x=>({name:x.symbol,displayName:x.ticker}))}]});
  return 'https://www.tradingview-widget.com/embed-widget/'+kind+'/?locale='+config.locale+'#'+encodeURIComponent(JSON.stringify(config));
}
export function mountMarkets(doc=document){
  const $=id=>doc.getElementById(id),zh=doc.body.dataset.language==='zh',t=(en,cn)=>zh?cn:en;
  let paused=false,started=false;
  function frame(id,kind){
    const node=doc.createElement('iframe');node.src=widgetURL(kind,$('market-symbol').value,zh);node.title=t('TradingView delayed market data','TradingView 延迟行情');node.referrerPolicy='origin';
    node.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');node.setAttribute('loading','lazy');
    $(id).replaceChildren(node);
  }
  function load(){if(paused)return;started=true;frame('market-quotes','market-quotes');frame('market-chart','symbol-overview');$('market-status').textContent=t('Automatic market updates are provided inside the widgets. Check their quote time and market status; US quotes are delayed.','行情组件自动接收更新。请查看组件内的报价时间及交易状态；美股行情为延迟数据。');}
  function link(){const x=marketSymbols.find(x=>x.ticker===$('market-symbol').value);$('market-source').href='https://www.tradingview.com/symbols/'+x.symbol.replace(':','-')+'/';}
  $('market-symbol').onchange=()=>{link();if(started&&!paused)frame('market-chart','symbol-overview');};
  $('market-reload').onclick=()=>{paused=false;$('market-toggle').textContent=t('Pause market data','暂停行情');load();};
  $('market-toggle').onclick=()=>{paused=!paused;$('market-toggle').textContent=paused?t('Resume market data','恢复行情'):t('Pause market data','暂停行情');if(paused){for(const id of ['market-quotes','market-chart'])$(id).replaceChildren();$('market-status').textContent=t('Market widgets paused. Resume to reconnect. The registered performance record remains below.','行情组件已暂停。恢复后重新连接；下方登记收益记录仍保留。');}else load();};
  link();
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){observer.disconnect();load();}},{rootMargin:'200px'});observer.observe($('markets'));}else load();
}
