import {FILE_COPY} from '../assets/studio/file-copy.mjs';
import {FILE_EDITION} from '../assets/studio/file-core.mjs';
import {fileWorkspace} from '../assets/studio/file-view.mjs';
export function buildFileStudio({layout,railOf,esc,crumbLd,faqLd,BASE,NAME,LOCALE,site,write,pushPage}){
  const zh=LOCALE.code==='zh',lang=zh?'zh':'en',L=FILE_COPY[lang],asset=site.base_url+'/studio-assets';
  for(const [kind,slug] of [['pdf','pdf-tools'],['image','product-images']]){
    const pdf=kind==='pdf',title=pdf?L.pdfTitle:L.imageTitle,description=pdf?L.pdfIntro:L.imageIntro,path='/studio/'+slug,url=BASE+path;
    const FAQ=[{q:L.privacyTitle,a:L.privacy},{q:L.freeTitle,a:L.free},{q:L.scopeTitle,a:pdf?L.pdfScope:L.bgHelp+' '+L.qualityHelp}];
    const body=`${railOf()}<link rel="stylesheet" href="${asset}/file-tools.css?v=${FILE_EDITION}"><main class="stage studio-main" id="main-content"><nav class="crumb"><a href="${BASE}/">${esc(NAME)}</a><i>/</i><a href="${BASE}/studio/">${L.back}</a><i>/</i><span>${title}</span></nav><header class="studio-hero"><span class="studio-sign">${zh?'BPJ 自主设计与开发':'Designed and built by BPJ'}</span><h1>${title}</h1><p>${description}</p></header><noscript><p class="quote-notice">${zh?'请启用 JavaScript 使用浏览器本地文件处理。':'Enable JavaScript to process files in your browser.'}</p></noscript>${fileWorkspace(kind,lang)}<section class="file-next"><h2>${L.nextTitle}</h2><p>${L.nextText}</p><div class="studio-actions"><a class="studio-button" href="${BASE}/studio/${pdf?'product-images':'pdf-tools'}">${pdf?L.nextImage:L.nextPDF}</a><a class="studio-button" data-ft-next="video" href="${BASE}/studio/video-variants">${L.nextVideo}</a></div></section><section class="studio-info">${FAQ.map(f=>`<h2>${f.q}</h2><p>${f.a}</p>`).join('')}</section></main><script type="module" src="${asset}/file-app.mjs?v=${FILE_EDITION}"></script>`;
    write('studio/'+slug+'.html',layout({title:title+' - BPJ',description,path,body,wide:true,schema:[crumbLd([{name:NAME,url:BASE+'/'},{name:L.back,url:BASE+'/studio/'},{name:title,url}]),{'@context':'https://schema.org','@type':'WebApplication',name:title,url,description,applicationCategory:'UtilitiesApplication',operatingSystem:'Web browser',inLanguage:lang,softwareVersion:FILE_EDITION,creator:{'@type':'Organization',name:'BPJ',url:site.base_url},isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'}},faqLd(FAQ)]}));
    pushPage(url+'.html','0.8');
  }
}
