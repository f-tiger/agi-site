import {sites,products} from './catalog.mjs';
import {siteLanguages,hubURL,pageURL} from './i18n.mjs';
export function memberURL(lang,site='bpj'){
 if(!sites[site])site='bpj';
 if(site==='bpj')return sites.bpj.origin+'/'+(lang==='zh'?'':['en','de','it'].includes(lang)?lang+'/':'en/')+'members';
 if(!siteLanguages[site].includes(lang))lang=siteLanguages[site][0];
 return sites[site].origin+(lang===(site==='eco'?'de':'en')?'':'/'+lang)+'/members'+(site==='eco'?'.html':'');
}
export function memberContext(search,lang){
 const q=new URLSearchParams(search),site=Object.hasOwn(sites,q.get('source'))?q.get('source'):'bpj';
 const product=products.find(p=>p.id===q.get('tool')&&p.site===site);
 const locale=siteLanguages[site].includes(lang)?lang:siteLanguages[site][0];
 return {site,brand:sites[site].name,origin:sites[site].origin,color:sites[site].color,product,returnURL:product?pageURL(product,locale):hubURL(site,locale),entry:memberURL(locale,site)};
}
export function portalURL(lang,site='bpj',tool='',transfer=false){
 const u=new URL(memberURL(lang)),c=memberContext(new URLSearchParams({source:site,tool}),lang);
 u.searchParams.set('source',c.site);if(c.product)u.searchParams.set('tool',c.product.id);
 if(transfer)u.searchParams.set('from',c.origin);return u.href;
}
export const memberCopy={
en:{title:'Continue on another device',link:'Cloud workspace membership',save:'Save to cloud',export:'Export workspace inputs',restore:'Cloud inputs restored. Review them before running the tool.',popup:'Allow the member workspace to open in a new tab, or export a JSON backup.',scope:'Free working edition. Local saves and exports stay free. Optional membership adds cloud workspaces and version history; team accounts and automatic monitoring are not included.',footer:'Calculations run in your browser. Data is uploaded only when you explicitly save in the member workspace.',hub:'Free browser tools and original puzzles. Optional cloud workspace membership and BPJ sponsored placements are separate paid services.'},
zh:{title:'换一台设备继续工作',link:'云端工作区会员',save:'保存到云端',export:'导出工作区输入',restore:'已恢复云端输入，请核对后再运行工具。',popup:'请允许打开会员工作区标签页，或导出 JSON 备份。',scope:'可用版本免费，本地保存与导出继续免费。可选会员提供云端工作区和版本历史，不含团队账号或自动监控。',footer:'计算在浏览器中完成，只有在会员工作区主动点击保存时才上传记录。',hub:'免费的浏览器工具和原创谜题。云端工作区会员与 BPJ 赞助投放是独立付费服务。'},
de:{title:'Auf einem anderen Gerät fortsetzen',link:'Cloud-Arbeitsbereich mit Mitgliedschaft',save:'In der Cloud speichern',export:'Arbeitsbereich exportieren',restore:'Cloud-Eingaben wiederhergestellt. Vor dem Ausführen prüfen.',popup:'Neuen Mitgliedschafts-Tab erlauben oder JSON-Sicherung exportieren.',scope:'Kostenlose Werkzeugversion. Lokales Speichern und Exportieren bleiben kostenlos. Die optionale Mitgliedschaft ergänzt Cloud-Arbeitsbereiche und Versionsverlauf, keine Teamkonten oder automatische Überwachung.',footer:'Berechnungen laufen im Browser. Daten werden nur beim ausdrücklichen Speichern im Mitgliederbereich hochgeladen.',hub:'Kostenlose Browserwerkzeuge und originale Rätsel. Cloud-Mitgliedschaft und BPJ-Werbeplätze sind getrennte kostenpflichtige Angebote.'},
it:{title:'Continua su un altro dispositivo',link:'Abbonamento area di lavoro cloud',save:'Salva nel cloud',export:'Esporta input area di lavoro',restore:'Input cloud ripristinati. Controllali prima di eseguire lo strumento.',popup:'Consenti una nuova scheda per l’area membri oppure esporta il backup JSON.',scope:'Versione gratuita dello strumento. Salvataggi ed esportazioni locali restano gratuiti. L’abbonamento facoltativo aggiunge aree cloud e cronologia, non account di gruppo o monitoraggio automatico.',footer:'I calcoli avvengono nel browser. I dati vengono caricati solo quando scegli di salvarli nell’area membri.',hub:'Strumenti gratuiti e rompicapi originali. Abbonamento cloud e posizionamenti sponsorizzati BPJ sono servizi a pagamento distinti.'}
};
