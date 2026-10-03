// Deterministic estimates, explicit storefronts and no location-based rewriting.
function number(value,min,max){
 if(value===null||value===undefined||String(value).trim()==='')throw new RangeError('Missing input');
 const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw new RangeError('Out of range');return n;
}
export function sealFit({width,height,window:kind,material,market}){
 const w=number(width,20,300),h=number(height,20,300);
 if(!['casement','roof'].includes(kind)||!['fabric','panel'].includes(material)||!['none','de','us'].includes(market))throw new RangeError('Invalid choice');
 const perimeter=Math.round(2*(w+h)*10)/10;
 const size=kind==='casement'&&material==='fabric'?([400,560].find(n=>n>=perimeter)??null):null;
 // Panel fit requires the opening dimensions and fixing design, not a sash perimeter.
 const route=kind==='roof'?'roof':material==='panel'?'panel':size?'fabric':'oversize';
 let href=null;
 if(route==='fabric'&&market!=='none'){
  const term=market==='de'?`Stoff Fensterabdichtung Klimaanlage Dreh Kippfenster ${size} cm`:`fabric portable AC seal casement tilt window ${size} cm`;
  const url=new URL(market==='de'?'https://www.amazon.de/s':'https://www.amazon.com/s');
  url.searchParams.set('k',term);url.searchParams.set('tag',market==='de'?'getecoback-21':'ecoback0d-20');href=url.href;
 }
 return {perimeter,size,route,href};
}
export function heaterCost({watts,hours,tariff,days,duty}){
 const w=number(watts,0,5000),h=number(hours,0,24),p=number(tariff,0,5),d=number(days,1,366),f=number(duty,0,100)/100;
 if(!Number.isInteger(d))throw new RangeError('Whole days required');
 return {hour:w/1000*p,day:w/1000*h*f*p,total:w/1000*h*f*p*d,kwh:w/1000*h*f*d};
}
function event(name,extra){
 if(navigator.globalPrivacyControl||navigator.doNotTrack==='1'||navigator.webdriver||/[?&]__probe(?:=|&|$)/.test(location.search))return;
 if(window.gtag)window.gtag('event',name,extra);
}
if(typeof document!=='undefined'){
 const seal=document.getElementById('eb-seal-fit'),heat=document.getElementById('eb-heater-cost');
 for(const root of [seal,heat].filter(Boolean)){
  const form=root.querySelector('form'),out=root.querySelector('[data-result]'),en=root.dataset.lang==='en';
  form.addEventListener('input',()=>{out.hidden=true;out.replaceChildren();});
  form.addEventListener('submit',e=>{
   e.preventDefault();if(!form.reportValidity())return;
   const fields=Object.fromEntries(new FormData(form));out.replaceChildren();
   function p(text){const el=document.createElement('p');el.textContent=text;out.append(el);}
   function link(href,text,shop=false){const el=document.createElement('a');el.href=href;el.textContent=text;if(shop){el.target='_blank';el.rel='sponsored nofollow noopener';}out.append(el);}
   try{
    if(root===seal){
     const r=sealFit(fields);p((en?'Calculated sash perimeter: ':'Berechneter Flügelumfang: ')+r.perimeter+' cm.');
     if(r.route==='fabric'){
      p(en?`Compare a ${r.size} cm fabric seal. Length alone does not prove compatibility: check the maker’s diagram, opening direction, seal width and hose opening.`:`Vergleiche eine Stoffabdichtung mit ${r.size} cm. Die Länge allein bestätigt keine Passform: Montagezeichnung, Öffnungsrichtung, Stoffbreite und Schlauchöffnung prüfen.`);
      if(r.href)link(r.href,(en?'Search fabric seals, ':'Stoffabdichtungen suchen, ')+r.size+' cm · '+(fields.market==='de'?'Amazon.de':'Amazon.com')+'*',true);
      else p(en?'No shop selected. Use the dimensions to check a retailer of your choice.':'Kein Shop gewählt. Mit diesen Maßen kannst du beim Händler deiner Wahl prüfen.');
     }else{
      p(en?(r.route==='roof'?'Roof windows need a model-specific installation check; perimeter alone cannot confirm a suitable kit.':r.route==='panel'?'For a rigid panel, measure the opening, fixing points and hose diameter. Sash perimeter is not a panel specification.':'The perimeter exceeds these 400 / 560 cm examples. Check larger or custom solutions; do not buy a shorter seal.'):(r.route==='roof'?'Dachfenster erfordern eine modellspezifische Montageprüfung; der Umfang allein reicht nicht aus.':r.route==='panel'?'Für eine starre Platte: Öffnung, Befestigungspunkte und Schlauchdurchmesser messen. Der Flügelumfang ist kein Plattenmaß.':'Der Umfang übersteigt die Beispiele mit 400 / 560 cm. Größere oder individuelle Lösungen prüfen, keine kürzere Abdichtung kaufen.'));
      const roof=r.route==='roof';link(en?(roof?'/en/guide/portable-ac-skylight-roof-window.html':'/en/guide/portable-ac-tilt-and-turn-windows.html'):(roof?'/guide/klimaanlage-dachfenster.html':'/guide/fensterabdichtung-selber-bauen.html'),en?'Read installation checks':'Montage prüfen');
     }
     event('seal_fit',{len:r.perimeter,type:fields.window,source:'demand-tool',market:fields.market});
    }else{
     const r=heaterCost(fields),fmt=n=>n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
     p(`${fmt(r.hour)} € pro voller Heizstunde · ${fmt(r.day)} € pro Tag`);
     p(`${fmt(r.total)} € für ${fields.days} Tage · ${fmt(r.kwh)} kWh`);
     p('Rechenwert mit deinen Angaben; der tatsächliche Verbrauch hängt von Laufzeit und Regelung ab. Ein anderes Widerstandsheizgerät spart bei gleicher elektrischer Leistung und Heizzeit nicht automatisch Strom.');
     event('stromkosten_calc',{source:'heater-inline'});
    }
   }catch{p(en?'Check all inputs; no shopping recommendation was generated.':'Bitte alle Eingaben prüfen; es wurde keine Kaufempfehlung erstellt.');}
   out.hidden=false;out.focus();
  });
 }
}
