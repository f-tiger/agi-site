import {LIMITS,geometry,removeEdgeBackground,pages} from './file-core.mjs';
let library;
export const pdfLibrary=()=>library||(library=import('./vendor/pdf-lib-1.17.1.mjs'));
export async function openPDF(file){
  const {PDFDocument}=await pdfLibrary();
  try {const doc=await PDFDocument.load(await file.arrayBuffer());if(doc.isEncrypted)throw Error('encrypted');if(doc.getPageCount()>LIMITS.pages)throw Error('pages');return doc;}
  catch(e){if(e.message==='pages')throw e;throw Error(/encrypt|password/i.test(e.message)?'encrypted':'pdf');}
}
export async function decodeImage(file){
  const url=URL.createObjectURL(file),img=new Image();
  try{img.src=url;await img.decode();if(!img.naturalWidth||img.naturalWidth*img.naturalHeight>LIMITS.pixels)throw Error('pixels');return img;}
  catch(e){throw Error(e.message==='pixels'?'pixels':'image');}finally{URL.revokeObjectURL(url);}
}
export function canvasBlob(canvas,type,quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob&&blob.type===type?resolve(blob):reject(Error('format')),type,quality));}
export async function processImage(file,s){
  const img=await decodeImage(file),source=document.createElement('canvas');source.width=img.naturalWidth;source.height=img.naturalHeight;
  const src=source.getContext('2d',{willReadFrequently:s.remove});src.drawImage(img,0,0);
  if(s.remove){const pixels=src.getImageData(0,0,source.width,source.height);removeEdgeBackground(pixels.data,source.width,source.height,s.background,s.tolerance);src.putImageData(pixels,0,0);}
  const out=document.createElement('canvas');out.width=s.width;out.height=s.height;
  const ctx=out.getContext('2d');if(s.format==='jpeg'||!s.remove){ctx.fillStyle=s.background;ctx.fillRect(0,0,s.width,s.height);}ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const g=geometry(source.width,source.height,s.width,s.height,s.fit);ctx.drawImage(source,g.x,g.y,g.width,g.height);
  const blob=await canvasBlob(out,'image/'+s.format,s.quality/100);source.width=source.height=out.width=out.height=1;
  return {blob,width:s.width,height:s.height};
}
export async function assemblePDF(items,s,progress=()=>{},alive=()=>true){
  const {PDFDocument,degrees}=await pdfLibrary(),out=await PDFDocument.create();let count=0;
  for(let i=0;i<items.length;i++){
    if(!alive())throw Error('cancel');const item=items[i];
    if(item.type==='pdf'){
      const doc=await openPDF(item.file),selection=pages(item.range,doc.getPageCount());count+=selection.length;if(count>LIMITS.pages)throw Error('pages');
      const copied=await out.copyPages(doc,selection);for(const page of copied){page.setRotation(degrees((page.getRotation().angle+item.rotation)%360));out.addPage(page);}
    }else{
      if(++count>LIMITS.pages)throw Error('pages');const img=await decodeImage(item.file),canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);
      const png=await canvasBlob(canvas,'image/png'),embed=await out.embedPng(await png.arrayBuffer());canvas.width=canvas.height=1;
      const size=s.paper==='a4'?[595.28,841.89]:[embed.width,embed.height],page=out.addPage(size),g=geometry(embed.width,embed.height,...size,'contain');page.drawImage(embed,g);page.setRotation(degrees(item.rotation));
    }
    progress(i+1,items.length);await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(!count)throw Error('empty');if(!alive())throw Error('cancel');out.setProducer('BPJ PDF tools');out.setCreator('BPJ');
  const data=await out.save();if(data.length>LIMITS.outputBytes)throw Error('output');if(!alive())throw Error('cancel');return {blob:new Blob([data],{type:'application/pdf'}),pages:count};
}
