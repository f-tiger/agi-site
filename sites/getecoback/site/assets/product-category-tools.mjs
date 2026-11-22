/* Local category tools. Width comparisons use documented dimensions and never rank models. */
import {headFitsWindow, usableWindowWidth} from './window-width-math.mjs';

const nf = new Intl.NumberFormat('de-DE', {maximumFractionDigits: 3});
export class InputError extends Error {}
function number(values, key, min, max, integer=false) {
  const raw=values[key];
  if(typeof raw!=='string' && typeof raw!=='number')throw new InputError('Bitte alle Zahlen vollständig eingeben.');
  const text=String(raw).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))throw new InputError('Bitte gültige, endliche Zahlen eingeben.');
  const n=Number(text);
  if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new InputError('Bitte die angegebenen Zahlenbereiche beachten.');
  return n;
}
function choice(values,key,allowed) {
  if(!allowed.includes(values[key]))throw new InputError('Bitte eine der angebotenen Angaben auswählen.');
  return values[key];
}

export function calculate(category, values) {
  const n=(key,min,max,integer=false)=>number(values,key,min,max,integer);
  switch(category){
    case 'luftreiniger': {
      const volume=n('length',.1,100)*n('width',.1,100)*n('height',.1,10), rate=volume*n('changes',.1,20);
      return {volume,rate,lines:[`Geplantes Raumvolumen: ${nf.format(volume)} m³.`, `Luftdurchsatz für deine gewählte Annahme: ${nf.format(rate)} m³/h.`, 'Das ist eine Planung, keine Gesundheitsvorgabe oder bestätigte Geräte-Eignung. Hersteller-CADR und Bedingungen separat prüfen.']};
    }
    case 'hygrometer': {
      const difference=Math.abs(n('readingA',0,100)-n('readingB',0,100));
      return {difference,lines:[`Die Anzeigen unterscheiden sich um ${nf.format(difference)} Prozentpunkte.`, 'Daraus folgt nicht, welches Gerät richtig liegt. Gleiche Messbedingungen und Hersteller-Genauigkeit prüfen; keinen Kalibrierwert daraus ableiten.']};
    }
    case 'dampfreiniger': {
      const approval=choice(values,'approval',['yes','no','unknown']), sensitive=choice(values,'sensitive',['yes','no','unknown']);
      const state=approval==='no'||sensitive==='yes'?'stop':approval==='yes'&&sensitive==='no'?'review':'unknown';
      const message=state==='stop'?'Aus diesen Angaben folgt keine Dampffreigabe. Den genannten empfindlichen oder nicht freigegebenen Belag nicht auf Grundlage dieses Checks bedampfen.':state==='review'?'Die beiden Angaben schließen eine weitere Prüfung nach Anleitung nicht aus. Gerätevorgaben und vorgeschriebene Probefläche bleiben maßgeblich; keine Materialprüfung erfolgt.':'Erst Oberflächenfreigabe und Empfindlichkeit klären. Unbekannt ist keine Erlaubnis zum Dampfreinigen.';
      return {state,lines:[message]};
    }
    case 'fenstersauger': {
      const area=n('width',.01,20)*n('height',.01,20)*n('panes',1,1000,true)*n('sides',1,2,true);
      return {area,lines:[`Geplante Glasfläche: ${nf.format(area)} m².`, 'Rahmen und Sprossen sind nicht enthalten. Daraus folgen keine Akkulaufzeit, Reinigungsdauer oder sichere Arbeitshöhe.']};
    }
    case 'nass-trockensauger': {
      const material=choice(values,'material',['dry','water','hazard','flammable','unknown']);
      const state=['hazard','flammable'].includes(material)?'stop':material==='unknown'?'unknown':'review';
      const message=state==='stop'?'Keinen gewöhnlichen Haushaltssauger anhand dieser Auswahl empfehlen. Gefahrstoff, Staubklasse bzw. Flüssigkeitsfreigabe müssen fachgerecht geklärt werden; die hier gelisteten Geräte erhalten dadurch keine Freigabe.':state==='unknown'?'Material zuerst eindeutig bestimmen. Ohne diese Information lässt sich die Aufgabe nicht freigeben.':material==='water'?'Sauberes Wasser ist eine andere Aufgabe als Trockenschmutz. Flüssigkeitsfreigabe, Filter-/Beutelkonfiguration und Füllgrenze in der genauen Anleitung prüfen; der Check bestätigt keine Freigabe.':'Für gewöhnlichen Trockenschmutz die konkrete Gerätefreigabe, Filter-/Beutelvorgaben und Entleerung prüfen. Gefährlichen oder unbekannten Feinstaub nicht darunter einordnen.';
      return {state,lines:[message]};
    }
    case 'bodenstaubsauger': {
      const annual=n('bagPackPrice',0,10000)/n('bagsPerPack',1,1000,true)*n('bagsPerYear',0,1000,true)+n('filterPrice',0,10000)*n('filterChanges',0,100);
      return {annual,threeYears:annual*3,lines:[`Mit deinen Annahmen: ${nf.format(annual)} € für Beutel/Filter pro Jahr.`, `Drei unverändert angenommene Jahre: ${nf.format(annual*3)} €.`, 'Anschaffung, Strom und weitere Teile fehlen. Das Rechenbeispiel bestimmt kein Wartungsintervall und keinen tatsächlichen Produktpreis.']};
    }
    case 'wasserkocher': {
      const litres=(n('cups',1,40,true)*n('millilitres',1,1000)+n('extra',0,10000))/1000;
      return {litres,lines:[`Geplanter Wasserbedarf: ${nf.format(litres)} Liter.`, 'Mindest- und Höchstfüllmenge des tatsächlichen Geräts separat beachten; gegebenenfalls mehrere Durchgänge. Keine Kochzeit oder Energieersparnis wird daraus abgeleitet.']};
    }
    case 'heissluftfritteusen': {
      const zones=choice(values,'zones',['single','dual','unknown']);
      if(zones==='unknown')return {zones,lines:['Zuerst die nutzbaren Garzonen in der genauen Anleitung prüfen. Keine Zeitberechnung bei ungeklärter Konfiguration.', 'Vorhandenen Backofen weiter nutzen, wenn er deine Aufgabe bereits erfüllt. Zwei Programme oder ein Grillrost belegen keine zwei unabhängig geregelten Zonen.']};
      const a=n('minutesA',.1,240),b=n('minutesB',.1,240),ta=n('temperatureA',30,300),tb=n('temperatureB',30,300),end=Math.max(a,b);
      if(zones==='single')return {zones,total:a+b,startA:0,startB:a,lines:[`Eine Zone: zuerst A (${nf.format(a)} Minuten), danach B (${nf.format(b)} Minuten). Reine Rezeptzeit zusammen: ${nf.format(a+b)} Minuten.`, 'Kein gemeinsamer Endzeitpunkt. Aufheizen, Temperaturwechsel und Umfüllen kommen gegebenenfalls hinzu. Auch gleiche Temperaturen bestätigen nicht, dass beide Speisen gemeinsam hineinpassen.', 'Nur Ablaufplanung; tatsächliche Garung, zulässige Einstellungen und Anleitung separat prüfen. Keine Gar- oder Lebensmittelsicherheitszusage.']};
      return {startA:end-a,startB:end-b,differentTemperatures:ta!==tb,lines:[`Plan-Endpunkt nach ${nf.format(end)} Minuten; Zone A nach ${nf.format(end-a)}, Zone B nach ${nf.format(end-b)} Minuten beginnen.`, ta!==tb?'Die Temperaturen unterscheiden sich: Dafür sind unabhängig geregelte Zonen mit passenden zulässigen Einstellungen nötig.':'Die Temperaturannahmen sind gleich; das bestätigt weder gemeinsamen Platz noch passende Garbedingungen.', 'Nur Zeitplanung anhand deiner Angaben. Aufheizen, Platz, tatsächliche Garung und Anleitung separat prüfen; keine Gar- oder Lebensmittelsicherheitszusage.']};
    }
    case 'kontaktgrills': {
      const w=n('deviceWidth',.1,200),d=n('deviceDepth',.1,200),gap=n('clearance',0,200),spaceW=n('spaceWidth',.1,1000),spaceD=n('spaceDepth',.1,1000),requiredWidth=w+2*gap,requiredDepth=d+2*gap,fits=spaceW>=requiredWidth&&spaceD>=requiredDepth;
      return {requiredWidth,requiredDepth,fits,lines:[`Rechteckiger Planbedarf: ${nf.format(requiredWidth)} × ${nf.format(requiredDepth)} cm.`,fits?'Die eingegebene freie Breite und Tiefe reichen für dieses Rechteck.':'Mindestens eine eingegebene freie Abmessung reicht für dieses Rechteck nicht.', 'Das ist keine Aufstellfreigabe. Beispielabstände durch echte Handbuchangaben ersetzen; Öffnungshöhe, Kabel und hitzebeständigen Untergrund zusätzlich prüfen.']};
    }
    default: throw new InputError('Für diese Kategorie ist hier kein lokales Rechenwerkzeug vorgesehen.');
  }
}

export function initCategoryTools(root) {
  for(const form of root.querySelectorAll('form[data-category-tool]')){
    if(form.dataset.categoryToolBound)continue;
    form.dataset.categoryToolBound='1';
    const result=form.closest('.pc-tool').querySelector('[data-category-result]');
    const clearResult=()=>{result.replaceChildren();result.hidden=true;};
    form.addEventListener('input',clearResult);form.addEventListener('change',clearResult);form.addEventListener('invalid',clearResult,true);
    form.addEventListener('submit',event=>{
      event.preventDefault();
      try{
        const values=Object.fromEntries(new FormData(form));
        const answer=calculate(form.dataset.categoryTool,values);
        result.replaceChildren(...answer.lines.map(line=>{const p=form.ownerDocument.createElement('p');p.textContent=line;return p;}));
        result.hidden=false;result.focus();
        // Fixed existing event only. Never include entered values, text or IDs.
        if(typeof window!=='undefined'&&typeof window.gtag==='function'){
          const params=new URLSearchParams(window.location.search);
          const qa=window.__probe||['__probe','__qa','__ci','qa','ci','verify'].some(key=>params.has(key))||params.get('utm_source')==='verify';
          let denied=false;try{denied=window.localStorage.getItem('fleet_ga4_choice_v1')==='denied';}catch{}
          const privacy=navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
          if(!qa&&!denied&&!privacy){try{window.gtag('event','tool_complete');}catch{ /* Measurement cannot block the local result. */ }}
        }
      }catch(error){
        result.textContent=error instanceof InputError?error.message:'Die Angaben konnten nicht geprüft werden. Bitte erneut versuchen.';
        result.hidden=false;result.focus();
      }
    });
    form.addEventListener('reset',()=>{result.replaceChildren();result.hidden=true;});
    form.hidden=false;
  }
}

export function windowWidthFit(values, packages) {
  const net = usableWindowWidth(number(values, 'lichte_breite_mm', 1, 5000),
    number(values, 'spiel_pro_seite_mm', 0, 1000));
  const existing = values.vorhandene_duese_mm === '' ? 0 :
    number(values, 'vorhandene_duese_mm', 0, 3000);
  if (headFitsWindow(existing, net)) return {net, state:'vorhanden', options:[]};
  if (!values.kauf_geplant) return {net, state:'kein_kauf', options:[]};
  const options = packages.map(item => ({...item, widths:item.widths.filter(width => headFitsWindow(width, net))}))
    .filter(item => item.widths.length);
  return {net, state:options.length ? 'vergleich' : 'kein_treffer', options};
}

function initWindowWidthCheck(root) {
  const form = root.querySelector('[data-window-width-check]');
  const table = root.querySelector('[data-window-width-table]');
  if (!form || !table) return;
  const packages = [...table.querySelectorAll('tbody tr')].map(row => {
    const link = row.querySelector('th a');
    return { href:link.getAttribute('href'), title:link.textContent,
      widths:[...row.cells[1].textContent.matchAll(/(\d+) mm/g)].map(match => Number(match[1])) };
  });
  const status = form.querySelector('[data-window-width-status]');
  const options = form.querySelector('[data-window-width-options]');
  const message = {
    vorhanden:'Deine vorhandene Düse kommt nach Nennbreite infrage. Setze sie zuerst am ausgeschalteten Gerät trocken an.',
    kein_kauf:'Prüfe zuerst den vorhandenen Abzieher oder ein Tuch.',
    kein_treffer:'Keines der vier dokumentierten Sets hat hier eine schmale genug bemessene Düse. Prüfe einen Abzieher oder ein Tuch.',
    vergleich:'Diese Sets kommen nach Nennbreite infrage. Prüfe Kopfmaße, Fensterbank und genauen Lieferumfang vor dem Kauf.',
  };
  const clear = () => {
    status.textContent = '';
    delete status.dataset.state;
    options.hidden = true;
    options.replaceChildren();
  };
  form.addEventListener('input', clear);
  form.addEventListener('submit', event => {
    event.preventDefault();
    clear();
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    let result;
    try {
      result = windowWidthFit(values, packages);
    } catch (error) {
      if (!(error instanceof InputError)) throw error;
      status.textContent = error.message;
      return;
    }
    status.dataset.state = result.state;
    status.textContent = `Nutzbreite: ${nf.format(result.net)} mm. ${message[result.state]}`;
    for (const item of result.options) {
      const li = root.createElement('li');
      const link = root.createElement('a');
      link.href = item.href;
      link.textContent = item.title;
      li.append(link, ' · ' + item.widths.map(width => nf.format(width) + ' mm').join(' / '));
      options.append(li);
    }
    options.hidden = result.options.length === 0;
    if (event.isTrusted) window.dispatchEvent(new CustomEvent('fleet:business', {
      detail:{name:'eco_window_width_check'},
    }));
  });
  form.hidden = false;
}

if(typeof document!=='undefined') {
  initCategoryTools(document);
  initWindowWidthCheck(document);
}
