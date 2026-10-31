// Fixed entry events only; never send query text, identity or monitoring data.
document.addEventListener('click',event=>{
  const anchor=event.target.closest?.('[data-radar-public]');
  if(!anchor||!['open','register','open_footer'].includes(anchor.dataset.radarPublic))return;
  const params=new URLSearchParams(location.search);
  if(params.get('__qa')==='1'||params.get('ci')==='1'||params.get('__probe')==='1'||params.get('utm_source')==='verify'||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)return;
  window.gtag?.('event','tool_click',{location:'capital_radar_about',label:anchor.dataset.radarPublic});
});
