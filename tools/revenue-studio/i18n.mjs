import {sites} from './catalog.mjs';
export const languages={en:{tag:'en',label:'English',number:'en-US'},zh:{tag:'zh-Hans',label:'简体中文',number:'zh-CN'},de:{tag:'de',label:'Deutsch',number:'de-DE'},it:{tag:'it',label:'Italiano',number:'it-IT'}};
export const siteLanguages={bpj:['zh','en'],agi:['en','zh'],eco:['de','en','it'],tds:['en','de']};
export function route(site,lang,id=''){if(!siteLanguages[site].includes(lang))lang='en';const prefix=site==='bpj'?(lang==='zh'?'':'/en'):site==='eco'?(lang==='de'?'':'/'+lang):(lang==='en'?'':'/'+lang);return prefix+'/workbench'+(id?'/'+id:'')+(site==='eco'?'.html':'');}
export function pageURL(p,lang='en'){return sites[p.site].origin+route(p.site,lang,p.id);}
export function hubURL(site,lang='en'){return sites[site].origin+route(site,lang);}
export function translator(dict={},lang='en'){
 const t=value=>{if(typeof value!=='string'||lang==='en')return value;if(dict[value])return dict[value];
  if(value.includes('\n'))return value.split('\n').map(t).join('\n');
  if(value.includes('; '))return value.split('; ').map(t).join('; ');
  for(const prefix of ['Recorded purchase costs:','Evidence:','Audience:','Action:','Buyer:','Repeated task:','Current alternative:','Next test:','Stop condition:','Target role:','Counterevidence recorded:'])if(value.startsWith(prefix))return (dict[prefix]||prefix)+value.slice(prefix.length);
  let m;if((m=value.match(/^Solved! (\d+) seconds\.$/))&&lang==='zh')return `完成！用时 ${m[1]} 秒。`;
  if((m=value.match(/^(Puzzle|Answer|Test) (\d+)(.*)$/))&&lang==='zh')return ({Puzzle:'题目',Answer:'答案',Test:'测试'}[m[1]])+' '+m[2]+m[3];
  if((m=value.match(/^Row (\d+), column (\d+)$/))&&lang==='zh')return `第 ${m[1]} 行，第 ${m[2]} 列`;
  if((m=value.match(/^(\d+) selected warning signals\..*$/))&&lang==='zh')return `已选择 ${m[1]} 个风险信号。这是核实清单，不是对安全或欺诈的判断。`;
  if((m=value.match(/^Missing CSV column: (.+)$/)))return ({zh:'缺少 CSV 列：',de:'Fehlende CSV-Spalte: ',it:'Colonna CSV mancante: '}[lang]||'Missing CSV column: ')+m[1];
  if((m=value.match(/^Row (\d+): expected (\d+) columns, found (\d+)\.$/)))return ({zh:`第 ${m[1]} 行需要 ${m[2]} 列，实际为 ${m[3]} 列。`,de:`Zeile ${m[1]}: ${m[2]} Spalten erwartet, ${m[3]} gefunden.`,it:`Riga ${m[1]}: previste ${m[2]} colonne, trovate ${m[3]}.`}[lang]||value);
  if((m=value.match(/^(.*): enter a number from (.+) to (.+)\.$/)))return ({zh:`${dict[m[1]]||'数值'}：请输入 ${m[2]} 至 ${m[3]} 范围内的数字。`,de:`${dict[m[1]]||'Zahlenwert'}: Zahl zwischen ${m[2]} und ${m[3]} eingeben.`,it:`${dict[m[1]]||'Valore'}: inserisci un numero tra ${m[2]} e ${m[3]}.`}[lang]||value);
  if((m=value.match(/^Use at most (\d+) data rows\.$/)))return ({zh:`最多允许 ${m[1]} 行数据。`,de:`Maximal ${m[1]} Datenzeilen verwenden.`,it:`Usa al massimo ${m[1]} righe di dati.`}[lang]||value);
  if((m=value.match(/^Clip (\d+): end must follow start\.$/))&&lang==='zh')return `片段 ${m[1]}：结束时间必须晚于开始时间。`;
  if(value.startsWith('Event times need an explicit UTC offset'))return ({zh:'事件时间必须带时区，例如 2026-10-01T18:00:00+02:00。',de:'Zeiten brauchen einen UTC-Offset, z. B. 2026-10-01T18:00:00+02:00.',it:'Gli orari richiedono un fuso esplicito, es. 2026-10-01T18:00:00+02:00.'}[lang]||value);
  return value;
 };return t;
}
export function displayNumber(value,lang){if(typeof value==='number')return new Intl.NumberFormat(languages[lang].number,{maximumFractionDigits:6}).format(value);if(typeof value==='string'&&/^-?\d+\.\d{1,6}$/.test(value)){const decimals=value.split('.')[1].length;return new Intl.NumberFormat(languages[lang].number,{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(Number(value));}return value;}
