// Local-only share cards: no fetch, external artwork, collection writes or inputs in events.
export const shareCopy = {
 en: {title:'Make a collection card',intro:'Preview the figures recorded in this browser, then download a PNG to share yourself. No collection is uploaded. Prices, notes and wishlist entries stay off the card.',preview:'Preview PNG card',download:'Download PNG',text:'Read the card as text',owned:'Owned styles',missing:'Not owned',duplicates:'Extra copies',quantity:'Owned quantity',note:'Not owned means not recorded as owned. It is not a wishlist or a shopping recommendation.',source:'Official source',checked:'Source checked',collection:'Collection page',independent:'Independent collector record · The Doll Scout',idle:'Preview first to check the names and quantities.',creating:'Creating your card in this browser…',ready:'Preview ready. Check the card before downloading.',started:'PNG download started. This does not publish your card.',changed:'Your collection changed. Preview a new card before downloading.',readError:'Your saved collection could not be read. No card was created. Allow browser storage or restore a valid backup in the collection tracker, then try again.',imageError:'The PNG could not be created or downloaded. Your collection is unchanged. Try again in a browser that supports canvas downloads.',alt:'Collection card preview; the same names and quantities are available as text below.'},
 de: {title:'Eine Sammlungskarte erstellen',intro:'Die in diesem Browser erfassten Figuren zuerst prüfen und dann als PNG selbst teilen. Die Sammlung wird nicht hochgeladen. Preise, Notizen und Wunscheinträge stehen nicht auf der Karte.',preview:'PNG-Karte ansehen',download:'PNG herunterladen',text:'Karte als Text lesen',owned:'Vorhandene Figurenarten',missing:'Nicht vorhanden',duplicates:'Zusätzliche Exemplare',quantity:'Vorhandene Anzahl',note:'Nicht vorhanden heißt: nicht als vorhanden erfasst. Es ist keine Wunschliste oder Kaufempfehlung.',source:'Offizielle Quelle',checked:'Quelle geprüft',collection:'Sammlungsseite',independent:'Unabhängige Sammlungsnotiz · The Doll Scout',idle:'Zuerst Namen und Mengen in der Vorschau prüfen.',creating:'Die Karte wird in diesem Browser erstellt…',ready:'Vorschau bereit. Vor dem Herunterladen prüfen.',started:'PNG-Download gestartet. Die Karte wurde nicht veröffentlicht.',changed:'Die Sammlung wurde geändert. Vor dem Herunterladen eine neue Vorschau erstellen.',readError:'Die gespeicherte Sammlung konnte nicht gelesen werden. Keine Karte erstellt. Browserspeicher erlauben oder eine gültige Sicherung in der Sammlungsverwaltung wiederherstellen und erneut versuchen.',imageError:'Die PNG-Datei konnte nicht erstellt oder heruntergeladen werden. Die Sammlung ist unverändert. Erneut mit einem Browser versuchen, der Canvas-Downloads unterstützt.',alt:'Vorschau der Sammlungskarte; dieselben Namen und Mengen stehen darunter als Text.'},
 zh: {title:'制作收藏分享卡',intro:'先预览当前浏览器记录的收藏，再下载 PNG 自行分享。收藏不会上传；卡片不包含价格、私人备注或愿望单条目。',preview:'预览 PNG 分享卡',download:'下载 PNG',text:'阅读卡片文字版',owned:'已拥有款式',missing:'未拥有款式',duplicates:'额外份数',quantity:'已拥有数量',note:'未拥有表示尚未记录为已拥有，不等同于愿望单或购买建议。',source:'官方资料来源',checked:'来源核对日期',collection:'系列收藏页',independent:'独立收藏记录 · The Doll Scout',idle:'请先预览并核对款式与数量。',creating:'正在当前浏览器生成分享卡…',ready:'预览已生成，请核对后下载。',started:'已发起 PNG 下载，分享卡尚未发布。',changed:'收藏已发生变化，请重新预览后再下载。',readError:'无法读取已保存的收藏，未生成分享卡。请允许浏览器存储，或在收藏账本恢复有效备份后重试。',imageError:'未能生成或下载 PNG，收藏记录未改变。请在支持画布下载的浏览器中重试。',alt:'收藏分享卡预览；下方文字版提供相同款式与数量。'}
};

function fail(code) { const error=new Error(code);error.code=code;return error; }

export function readShareSnapshot(core, storage, series) {
 try {
  const {raw,items}=core.readCollection(storage);
  if(!series || !Array.isArray(series.names) || !series.names.length || series.names.length>24 || new Set(series.names).size!==series.names.length)throw Error('series');
  const rows=series.names.map(name=>{
   const figure={name,series:series.title,seriesId:series.id,styleId:core.styleId(name)};
   const quantity=items.filter(item=>item.status==='owned'&&core.seriesMatch(item,figure)).reduce((sum,item)=>sum+item.quantity,0);
   return {name,quantity};
  });
  // Only official public metadata and derived counts enter the card.
  const owned=rows.filter(row=>row.quantity>0).length;
  return {raw,card:{id:series.id,title:series.title,source:series.source,checked:series.checked,canonical:series.canonical,language:series.language,rows,owned,total:rows.length,missing:rows.length-owned,duplicates:rows.reduce((sum,row)=>sum+Math.max(0,row.quantity-1),0)}};
 } catch { throw fail('read'); }
}

// A session binds the download to the exact previewed ledger, including edits in other tabs.
export function createShareSession({read,createPNG,download,record}) {
 let preview=null,revision=0;
 const invalidate=()=>{revision++;preview=null;};
 function current() {
  let latest;try{latest=read();}catch(error){invalidate();throw error;}
  if(preview&&latest.raw!==preview.raw){invalidate();throw fail('changed');}
  return preview;
 }
 return {invalidate,current,
  async prepare(){
   invalidate();const token=revision,snapshot=read();
   let blob;try{blob=await createPNG(snapshot.card);}catch{throw fail('image');}
   if(!blob||blob.type!=='image/png'||blob.size<8)throw fail('image');
   const header=new Uint8Array(await blob.slice(0,8).arrayBuffer());
   if(![137,80,78,71,13,10,26,10].every((byte,index)=>header[index]===byte))throw fail('image');
   if(token!==revision)throw fail('changed');
   if(read().raw!==snapshot.raw){invalidate();throw fail('changed');}
   preview={...snapshot,blob};return preview;
  },
  download(){
   const ready=current();if(!ready)throw fail('changed');
   try{download(ready.blob,`${ready.card.id}-${ready.card.language}-collection.png`);}catch{throw fail('image');}
   // A started download is not proof of a file saved or a post shared.
   try{record('collector_series_export');}catch{}
  }
 };
}

export function wrapCardText(context, text, width) {
 // Prefer word breaks; CJK and long URLs can fall back to character boundaries.
 const lines=[];let line='';
 for(const character of String(text)){
  if(character==='\n'){lines.push(line);line='';continue;}
  if(line&&context.measureText(line+character).width>width){
   const space=Math.max(line.lastIndexOf(' '),line.lastIndexOf('\t'));
   if(space>0){lines.push(line.slice(0,space).trimEnd());line=line.slice(space+1)+character;}
   else{lines.push(line.trimEnd());line=character.trimStart();}
  }
  else line+=character;
 }
 if(line||!lines.length)lines.push(line);
 return lines;
}

export function renderShareCanvas(card, labels, createCanvas=()=>document.createElement('canvas')) {
 const canvas=createCanvas(),ctx=canvas.getContext('2d');if(!ctx)throw fail('image');
 const width=1080,pad=64,bodyWidth=width-pad*2,rows=[];
 const font=(size,weight=400)=>`${weight} ${size}px Arial, "Noto Sans CJK SC", sans-serif`;
 ctx.font=font(58,700);const titleLines=wrapCardText(ctx,card.title,bodyWidth);
 ctx.font=font(32,700);
 for(const row of card.rows)rows.push({...row,lines:wrapCardText(ctx,row.name,bodyWidth-286)});
 ctx.font=font(25);
 const footers=[labels.note,labels.source+': '+card.source,labels.checked+': '+card.checked,labels.collection+': '+card.canonical,labels.independent].map(text=>wrapCardText(ctx,text,bodyWidth));
 const titleHeight=titleLines.length*70,statsTop=112+titleHeight,rowsTop=statsTop+164;
 const rowHeight=row=>Math.max(76,row.lines.length*42+30);
 const footerTop=rowsTop+rows.reduce((sum,row)=>sum+rowHeight(row),0)+48;
 canvas.width=width;canvas.height=footerTop+footers.reduce((sum,lines)=>sum+lines.length*35+20,0)+40;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,canvas.height);
 ctx.fillStyle='#e4002b';ctx.fillRect(0,0,width,16);
 ctx.textBaseline='top';ctx.fillStyle='#111111';ctx.font=font(26,700);ctx.fillText('The Doll Scout',pad,48);
 ctx.font=font(58,700);titleLines.forEach((line,index)=>ctx.fillText(line,pad,102+index*70));
 const statWidth=bodyWidth/3;
 for(const [index,[value,label]]of [[`${card.owned} / ${card.total}`,labels.owned],[String(card.missing),labels.missing],[String(card.duplicates),labels.duplicates]].entries()){
  const x=pad+index*statWidth;ctx.fillStyle='#f4f6fa';ctx.fillRect(x,statsTop,statWidth-12,138);
  ctx.fillStyle='#111111';ctx.font=font(44,700);ctx.fillText(value,x+20,statsTop+17);
  ctx.font=font(23);wrapCardText(ctx,label,statWidth-48).forEach((line,n)=>ctx.fillText(line,x+20,statsTop+76+n*28));
 }
 let y=rowsTop;
 for(const row of rows){
  const height=rowHeight(row);ctx.fillStyle=row.quantity?'#e4002b':'#6b7280';ctx.fillRect(pad,y+20,8,height-38);
  ctx.fillStyle='#111111';ctx.font=font(32,700);row.lines.forEach((line,index)=>ctx.fillText(line,pad+24,y+15+index*42));
  ctx.textAlign='right';ctx.font=font(30,700);ctx.fillText(row.quantity?String(row.quantity):'0',width-pad,y+12);
  ctx.font=font(21);ctx.fillStyle='#4b5563';const status=row.quantity?labels.quantity:labels.missing;
  wrapCardText(ctx,status,246).forEach((line,index)=>ctx.fillText(line,width-pad,y+46+index*25));ctx.textAlign='left';
  ctx.fillStyle='#e5e7eb';ctx.fillRect(pad,y+height-1,bodyWidth,1);y+=height;
 }
 y=footerTop;ctx.font=font(25);ctx.fillStyle='#4b5563';
 for(const lines of footers){for(const line of lines){ctx.fillText(line,pad,y);y+=35;}y+=20;}
 return canvas;
}

export function canvasPNG(canvas) {
 return new Promise((resolve,reject)=>{
  try{canvas.toBlob(blob=>blob?resolve(blob):reject(fail('image')),'image/png');}catch{reject(fail('image'));}
 });
}

export function initSeriesShare(checklist, record, {core=globalThis.DSCollector,storage=()=>globalThis.localStorage,events=globalThis.window,page=globalThis.document}={}) {
 const root=checklist.querySelector('[data-series-share]');if(!root)return null;
 const series=JSON.parse(root.querySelector('[data-share-config]').textContent),labels=shareCopy[series.language]||shareCopy.en;
 const previewButton=root.querySelector('[data-share-preview]'),downloadButton=root.querySelector('[data-share-download]'),status=root.querySelector('[data-share-status]'),image=root.querySelector('[data-share-image]'),details=root.querySelector('[data-share-details]');
 let objectURL=null,busy=false;
 function clear(){if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;image.removeAttribute('src');image.hidden=true;details.replaceChildren();details.hidden=true;downloadButton.disabled=true;}
 const session=createShareSession({
  read:()=>{try{return readShareSnapshot(core,storage(),series);}catch{throw fail('read');}},
  createPNG:card=>canvasPNG(renderShareCanvas(card,labels,()=>page.createElement('canvas'))),
  download:(blob,filename)=>{const link=page.createElement('a');link.href=objectURL;link.download=filename;page.body.append(link);try{link.click();}finally{link.remove();}},
  record
 });
 function message(error){clear();status.textContent=error?.code==='changed'?labels.changed:error?.code==='read'?labels.readError:labels.imageError;}
 function invalidate(){session.invalidate();if(objectURL){clear();status.textContent=labels.changed;}}
 function refresh(){try{session.current();previewButton.disabled=busy;}catch(error){message(error);previewButton.disabled=busy||error?.code==='read';}}
 function addText(tag,text){const element=page.createElement(tag);element.textContent=text;details.append(element);return element;}
 previewButton.addEventListener('click',async()=>{
  clear();busy=true;previewButton.disabled=true;status.textContent=labels.creating;
  try{
   const {card,blob}=await session.prepare();objectURL=URL.createObjectURL(blob);image.src=objectURL;image.hidden=false;
   addText('h4',card.title);
   const counts=addText('dl','');for(const key of ['owned','missing','duplicates']){const label=page.createElement('dt'),value=page.createElement('dd');label.textContent=labels[key];value.dataset.shareCount=key;value.textContent=String(card[key]);counts.append(label,value);}
   const list=addText('ul','');for(const row of card.rows){const item=page.createElement('li'),quantity=page.createElement('strong');item.dataset.shareStyle=core.styleId(row.name);item.append(`${row.name}: `);quantity.dataset.shareQuantity='';quantity.textContent=String(row.quantity);item.append(quantity,` (${row.quantity?labels.quantity:labels.missing})`);list.append(item);}
   for(const text of [labels.note,labels.source+': '+card.source,labels.checked+': '+card.checked,labels.collection+': '+card.canonical,labels.independent])addText('p',text);
   details.hidden=false;downloadButton.disabled=false;status.textContent=labels.ready;
  }catch(error){message(error);}finally{busy=false;refresh();}
 });
 downloadButton.addEventListener('click',()=>{try{session.download();status.textContent=labels.started;}catch(error){message(error);}});
 events.addEventListener('storage',event=>{if(event.key===core?.COLLECTION_KEY||event.key===null)refresh();});
 events.addEventListener('focus',refresh);events.addEventListener('pageshow',refresh);
 page.addEventListener('visibilitychange',()=>{if(!page.hidden)refresh();});
 refresh();
 return {invalidate,refresh};
}
