#!/usr/bin/env python3
"""Generate five fully localized country decision surfaces from one model contract."""
import json, html
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
BASE = "https://getecoback.com"
COUNTRIES = json.loads((ROOT / "data/country-calculators.json").read_text())
KEYS = "choose mode cool dry heat solar inputs sample rate hours days wattsA wattsB heatDemand effA effB generation self exportRate costA costB grant maintenanceA maintenanceB years comparable run results energy annual total saving payback noPayback notComparable immediate year share copied copyFail print sources next methodology limits formula noteSolar scenario sensitivity invalid initial assumption cite citationLabel confirm status".split()
TEXT = {
"en": [
"Country / language","Project","Cooling","Dehumidification","Electric heating","Solar self-consumption","Your assumptions",
"Editable example only — not national prices, measured performance or a quote. Replace every value with your bill, meter readings or quotes.",
"Variable electricity price (€/kWh)","Equivalent full-load hours/day","Operating days/year","Average electrical input A (W)","Average electrical input B (W)","Useful heat needed (kWh/year)","Seasonal heat/electricity ratio A","Seasonal heat/electricity ratio B","PV generation after losses (kWh/year)","Self-consumed share (%)","Effective surplus credit (€/kWh)","Future upfront cost A (€)","Purchase + installation B (€)","Confirmed upfront cash grant B (€)","Annual maintenance + other costs A (€)","Annual maintenance + other costs B (€)","Comparison period (years)",
"Both options provide the same useful service. Capacity, comfort and installation have been checked.",
"Compare costs","Your comparison","Electricity (kWh/year)","Net running cost (€/year)","Total over chosen period (€)","Annual saving B versus A","Simple payback (years)","No annual savings: no savings-based payback","Costs only: confirm equivalent service before interpreting savings.","No extra investment","Year","Copy scenario link","Link copied","Copy failed. Select the link below.","Print / save PDF","Sources checked","Before deciding","How the calculation works",
"No financing, discounting, inflation, equipment replacement, degradation or delayed tax credits. Results do not establish capacity, installation permission or grant eligibility.",
"Cooling/drying: W ÷ 1000 × hours × days. Heating: useful heat ÷ seasonal ratio. Saving = annual cost A − annual cost B. Payback = max(0, cost B − cash grant − cost A) ÷ positive annual saving.",
"Solar: avoided imports = generation × self-use share. Add effective surplus credit and subtract annual costs. A is no PV. Energy B is generation, not consumption; negative running cost is a net benefit. No storage dispatch simulation.",
"Working example","Electricity price ±20%: annual saving range","Check the highlighted values. No result has been calculated.","Ready to compare","Hypothetical inputs; not an offer","Reuse the method with attribution:","Citation",
"Enter only a confirmed cash grant received upfront. Leave delayed tax relief at zero.","Model v2 · 20 September 2026"
],
"de": [
"Land / Sprache","Vorhaben","Kühlen","Entfeuchten","Elektrisch heizen","Solar-Eigenverbrauch","Deine Annahmen",
"Nur ein editierbares Beispiel — keine Länderpreise, Messwerte oder Angebote. Ersetze die Werte durch Rechnung, Messung oder Angebot.",
"Variabler Strompreis (€/kWh)","Äquivalente Volllaststunden/Tag","Betriebstage/Jahr","Mittlere elektrische Aufnahme A (W)","Mittlere elektrische Aufnahme B (W)","Nutzwärmebedarf (kWh/Jahr)","Saisonales Wärme/Strom-Verhältnis A","Saisonales Wärme/Strom-Verhältnis B","PV-Ertrag nach Verlusten (kWh/Jahr)","Eigenverbrauchsanteil (%)","Effektive Vergütung für Überschuss (€/kWh)","Künftige Anschaffungskosten A (€)","Kauf + Installation B (€)","Bestätigter sofortiger Zuschuss B (€)","Wartung + sonstige Jahreskosten A (€)","Wartung + sonstige Jahreskosten B (€)","Vergleichszeitraum (Jahre)",
"Beide Optionen erfüllen denselben Bedarf. Leistung, Komfort und Installation sind geprüft.",
"Kosten vergleichen","Dein Vergleich","Strom (kWh/Jahr)","Netto-Betriebskosten (€/Jahr)","Gesamtkosten im Zeitraum (€)","Jährliche Ersparnis B gegenüber A","Einfache Amortisation (Jahre)","Keine jährliche Ersparnis: keine Amortisation durch Einsparung","Nur Kosten: für Ersparnisse zuerst gleichwertigen Nutzen bestätigen.","Keine Mehrinvestition","Jahr","Szenario-Link kopieren","Link kopiert","Kopieren fehlgeschlagen. Link unten auswählen.","Drucken / PDF speichern","Quellen geprüft","Vor der Entscheidung","So wird gerechnet",
"Ohne Finanzierung, Abzinsung, Inflation, Ersatzgeräte, Alterung oder spätere Steuererstattung. Das Ergebnis bestätigt weder Dimensionierung noch Genehmigung oder Förderfähigkeit.",
"Kühlen/Entfeuchten: W ÷ 1000 × Stunden × Tage. Heizen: Nutzwärme ÷ saisonales Verhältnis. Ersparnis = Jahreskosten A − Jahreskosten B. Amortisation = max(0, Kosten B − sofortiger Zuschuss − Kosten A) ÷ positive Jahresersparnis.",
"Solar: vermiedener Netzbezug = Ertrag × Eigenverbrauchsanteil. Effektive Überschussvergütung addieren, Jahreskosten abziehen. A ist ohne PV. Strom B ist Erzeugung, kein Verbrauch; negative Betriebskosten bedeuten Nettovorteil. Keine Speicher-Simulation.",
"Rechenbeispiel","Strompreis ±20 %: Bandbreite der Jahresersparnis","Bitte markierte Werte prüfen. Kein Ergebnis berechnet.","Bereit zum Vergleich","Hypothetische Eingaben; kein Angebot","Methode mit Quellenangabe weiterverwenden:","Quellenangabe",
"Nur einen bestätigten sofort ausgezahlten Zuschuss eintragen. Spätere Steuerentlastung bleibt null.","Modell v2 · 20. September 2026"
],
"fr": [
"Pays / langue","Projet","Climatisation","Déshumidification","Chauffage électrique","Autoconsommation solaire","Vos hypothèses",
"Exemple modifiable uniquement — ni prix nationaux, ni mesures, ni devis. Remplacez les valeurs par votre facture, vos relevés ou vos devis.",
"Prix variable de l’électricité (€/kWh)","Heures équivalentes à pleine charge/jour","Jours de fonctionnement/an","Puissance électrique moyenne A (W)","Puissance électrique moyenne B (W)","Besoin de chaleur utile (kWh/an)","Rapport saisonnier chaleur/électricité A","Rapport saisonnier chaleur/électricité B","Production PV après pertes (kWh/an)","Part autoconsommée (%)","Crédit effectif du surplus (€/kWh)","Dépense initiale future A (€)","Achat + installation B (€)","Subvention immédiate confirmée B (€)","Entretien + autres frais annuels A (€)","Entretien + autres frais annuels B (€)","Durée de comparaison (ans)",
"Les deux options rendent le même service. Puissance, confort et installation ont été vérifiés.",
"Comparer les coûts","Votre comparaison","Électricité (kWh/an)","Coût net de fonctionnement (€/an)","Coût total sur la période (€)","Économie annuelle de B par rapport à A","Retour simple sur investissement (ans)","Aucune économie annuelle : pas de retour par les économies","Coûts seuls : confirmez un service équivalent pour interpréter les économies.","Aucun surinvestissement","Année","Copier le lien du scénario","Lien copié","Échec de copie. Sélectionnez le lien ci-dessous.","Imprimer / enregistrer en PDF","Sources consultées","Avant de décider","Méthode de calcul",
"Hors financement, actualisation, inflation, remplacement, dégradation et crédits d’impôt différés. Le résultat ne valide ni dimensionnement, ni autorisation, ni éligibilité.",
"Climatisation/déshumidification : W ÷ 1000 × heures × jours. Chauffage : chaleur utile ÷ rapport saisonnier. Économie = coût annuel A − coût annuel B. Retour = max(0, coût B − subvention immédiate − coût A) ÷ économie annuelle positive.",
"Solaire : achats évités = production × part autoconsommée. Ajouter le crédit effectif du surplus, soustraire les frais annuels. A est sans PV. L’énergie B est une production ; un coût net négatif est un bénéfice. Sans simulation de batterie.",
"Exemple de calcul","Prix de l’électricité ±20 % : plage d’économies annuelles","Vérifiez les valeurs signalées. Aucun résultat calculé.","Prêt à comparer","Hypothèses fictives ; pas un devis","Réutilisez la méthode en citant la source :","Référence",
"Saisissez seulement une subvention confirmée versée immédiatement. Laissez les avantages fiscaux différés à zéro.","Modèle v2 · 20 septembre 2026"
],
"es": [
"País / idioma","Proyecto","Refrigeración","Deshumidificación","Calefacción eléctrica","Autoconsumo solar","Tus hipótesis",
"Solo un ejemplo editable: no son precios nacionales, mediciones ni presupuestos. Sustituye los valores por tu factura, mediciones o presupuestos.",
"Precio variable de electricidad (€/kWh)","Horas equivalentes a plena carga/día","Días de funcionamiento/año","Potencia eléctrica media A (W)","Potencia eléctrica media B (W)","Demanda de calor útil (kWh/año)","Relación estacional calor/electricidad A","Relación estacional calor/electricidad B","Generación FV tras pérdidas (kWh/año)","Porcentaje de autoconsumo (%)","Compensación efectiva de excedentes (€/kWh)","Inversión futura inicial A (€)","Compra + instalación B (€)","Ayuda inmediata confirmada B (€)","Mantenimiento + otros gastos anuales A (€)","Mantenimiento + otros gastos anuales B (€)","Periodo de comparación (años)",
"Ambas opciones cubren la misma necesidad. Se han comprobado capacidad, confort e instalación.",
"Comparar costes","Tu comparación","Electricidad (kWh/año)","Coste neto de funcionamiento (€/año)","Coste total del periodo (€)","Ahorro anual de B frente a A","Amortización simple (años)","Sin ahorro anual: no hay amortización por ahorro","Solo costes: confirma un servicio equivalente antes de interpretar el ahorro.","Sin inversión adicional","Año","Copiar enlace del escenario","Enlace copiado","No se pudo copiar. Selecciona el enlace de abajo.","Imprimir / guardar PDF","Fuentes consultadas","Antes de decidir","Método de cálculo",
"Sin financiación, descuento, inflación, sustituciones, degradación ni deducciones fiscales futuras. El resultado no valida dimensionamiento, permisos o elegibilidad.",
"Refrigeración/deshumidificación: W ÷ 1000 × horas × días. Calefacción: calor útil ÷ relación estacional. Ahorro = coste anual A − coste anual B. Amortización = max(0, coste B − ayuda inmediata − coste A) ÷ ahorro anual positivo.",
"Solar: compras evitadas = generación × autoconsumo. Sumar compensación efectiva de excedentes y restar gastos anuales. A es sin FV. La energía B es generación; un coste neto negativo es un beneficio. No simula baterías.",
"Ejemplo de cálculo","Precio de electricidad ±20 %: intervalo de ahorro anual","Revisa los valores señalados. No se ha calculado ningún resultado.","Listo para comparar","Hipótesis ilustrativas; no es un presupuesto","Reutiliza el método citando la fuente:","Cita",
"Introduce solo una ayuda confirmada abonada al inicio. Las deducciones fiscales futuras se dejan a cero.","Modelo v2 · 20 de septiembre de 2026"
],
"it": [
"Paese / lingua","Progetto","Raffrescamento","Deumidificazione","Riscaldamento elettrico","Autoconsumo fotovoltaico","Le tue ipotesi",
"Solo un esempio modificabile: non sono prezzi nazionali, misurazioni o preventivi. Sostituisci i valori con bolletta, misure e preventivi.",
"Prezzo variabile dell’elettricità (€/kWh)","Ore equivalenti a pieno carico/giorno","Giorni di funzionamento/anno","Potenza elettrica media A (W)","Potenza elettrica media B (W)","Fabbisogno di calore utile (kWh/anno)","Rapporto stagionale calore/elettricità A","Rapporto stagionale calore/elettricità B","Produzione FV dopo le perdite (kWh/anno)","Quota autoconsumata (%)","Credito effettivo per eccedenze (€/kWh)","Spesa iniziale futura A (€)","Acquisto + installazione B (€)","Contributo immediato confermato B (€)","Manutenzione + altri costi annui A (€)","Manutenzione + altri costi annui B (€)","Periodo di confronto (anni)",
"Le due opzioni offrono lo stesso servizio. Potenza, comfort e installazione sono stati verificati.",
"Confronta i costi","Il tuo confronto","Elettricità (kWh/anno)","Costo netto di esercizio (€/anno)","Costo totale nel periodo (€)","Risparmio annuo di B rispetto ad A","Rientro semplice dell’investimento (anni)","Nessun risparmio annuo: nessun rientro tramite risparmio","Solo costi: conferma un servizio equivalente prima di interpretare il risparmio.","Nessun investimento aggiuntivo","Anno","Copia il link dello scenario","Link copiato","Copia non riuscita. Seleziona il link qui sotto.","Stampa / salva PDF","Fonti consultate","Prima di decidere","Metodo di calcolo",
"Esclusi finanziamento, attualizzazione, inflazione, sostituzioni, degrado e detrazioni fiscali differite. Il risultato non conferma dimensionamento, autorizzazioni o diritto alle agevolazioni.",
"Raffrescamento/deumidificazione: W ÷ 1000 × ore × giorni. Riscaldamento: calore utile ÷ rapporto stagionale. Risparmio = costo annuo A − costo annuo B. Rientro = max(0, costo B − contributo immediato − costo A) ÷ risparmio annuo positivo.",
"Solare: acquisti evitati = produzione × autoconsumo. Aggiungi credito effettivo delle eccedenze, sottrai costi annui. A è senza FV. L’energia B è produzione; un costo netto negativo è un beneficio. Nessuna simulazione di accumulo.",
"Esempio di calcolo","Prezzo dell’elettricità ±20%: intervallo di risparmio annuo","Controlla i valori segnalati. Nessun risultato calcolato.","Pronto al confronto","Ipotesi illustrative; non un preventivo","Riutilizza il metodo citando la fonte:","Citazione",
"Inserisci solo un contributo confermato erogato subito. Lascia a zero le detrazioni fiscali future.","Modello v2 · 20 settembre 2026"
]}
DEFAULTS={"rate":0.30,"hours":6,"days":60,"wattsA":1000,"wattsB":700,"heat":6000,"effA":1,"effB":3,"generation":800,"self":60,"exportRate":0,"costA":0,"costB":700,"grant":0,"maintenanceA":0,"maintenanceB":0,"years":5}
BOUNDS={"rate":(0,5),"hours":(0,24),"days":(0,366),"wattsA":(0,50000),"wattsB":(0,50000),"heat":(0,200000),"effA":(.1,10),"effB":(.1,10),"generation":(0,100000),"self":(0,100),"exportRate":(0,5),"costA":(0,200000),"costB":(0,200000),"grant":(0,200000),"maintenanceA":(0,20000),"maintenanceB":(0,20000),"years":(1,40)}
def esc(s): return html.escape(str(s),quote=True)
def build():
 for lang,c in COUNTRIES.items():
  assert len(TEXT[lang])==len(KEYS),(lang,len(TEXT[lang]),len(KEYS))
  t=dict(zip(KEYS,TEXT[lang])); path=c["path"]; url=BASE+path
  nav=" ".join(f'<a href="{v["path"]}"'+(' aria-current="page"' if l==lang else '')+f'>{esc(v["country"])}</a>' for l,v in COUNTRIES.items())
  # These surfaces cover equivalent comparison tasks, with national editorial context.
  alternates="".join(f'<link rel="alternate" hreflang="{l}" href="{BASE+v["path"]}">\n' for l,v in COUNTRIES.items())+f'<link rel="alternate" hreflang="x-default" href="{BASE}/rechner.html">\n'
  def field(k):
   title=t["heatDemand" if k=="heat" else k];lo,hi=BOUNDS[k]
   return f'<label for="{k}">{esc(title)}<input id="{k}" name="{k}" type="number" min="{lo}" max="{hi}" step="any" value="{DEFAULTS[k]}" required></label>'
  common="".join(field(k) for k in ["rate","costA","costB","grant","maintenanceA","maintenanceB","years"])
  groups="".join(f'<div class="fields mode-fields" data-modes="{m}">'+ "".join(field(k) for k in ks)+'</div>' for m,ks in [("cool dry",["hours","days","wattsA","wattsB"]),("heat",["heat","effA","effB"]),("solar",["generation","self","exportRate"])])
  body="".join(f'<section><h2>{esc(h)}</h2><p>{esc(p)}</p></section>' for h,p in c["sections"])
  sources="".join(f'<li><a href="{esc(u)}" rel="noopener">{esc(n)}</a></li>' for n,u in c["sources"])
  related="".join(f'<li><a href="{u}">{esc(n)}</a></li>' for n,u in c["related"])
  schema={"@context":"https://schema.org","@type":"WebApplication","name":c["title"],"url":url,"inLanguage":lang,"dateModified":"2026-09-20","applicationCategory":"UtilitiesApplication","operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"},"description":c["description"]}
  content=f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(c["title"])}</title>
<meta name="description" content="{esc(c["description"])}">
<link rel="canonical" href="{url}">
{alternates}<link rel="alternate" type="text/markdown" href="{url[:-5]}.md">
<meta property="og:type" content="website">
<meta property="og:title" content="{esc(c["title"])}">
<meta property="og:description" content="{esc(c["description"])}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg">
<link rel="stylesheet" href="/assets/country-calculator.css">
<script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script>
</head>
<body data-country-calculator="{lang}">
<nav class="country-nav"><a href="/">EcoBack</a><span>{esc(t["choose"])}</span>{nav}</nav>
<main>
<header><p class="eyebrow">{esc(c["country"])} · EcoBack</p><h1>{esc(c["heading"])}</h1><p>{esc(c["intro"])}</p></header>
<div class="workspace">
<form id="country-form"><h2>{esc(t["inputs"])}</h2><p class="notice">{esc(t["sample"])}</p>
<label for="mode">{esc(t["mode"])}<select id="mode" name="mode">{"".join(f'<option value="{k}">{esc(t[k])}</option>' for k in ["cool","dry","heat","solar"])}</select></label>
{groups}<div class="fields">{common}</div><p class="small">{esc(t["confirm"])}</p>
<label class="check"><input type="checkbox" id="comparable" name="comparable">{esc(t["comparable"])}</label>
<button type="submit">{esc(t["run"])}</button><p id="form-error" role="alert"></p></form>
<section class="results" aria-labelledby="result-heading"><h2 id="result-heading">{esc(t["results"])}</h2><div id="result" aria-live="polite"><p>{esc(t["initial"])}</p></div>
<div class="actions"><button type="button" id="share">{esc(t["share"])}</button><button type="button" id="print">{esc(t["print"])}</button></div><div class="community-share" aria-label="Community sharing"><span>{esc(t["share"])}:</span><a data-share="whatsapp" target="_blank" rel="noopener">WhatsApp</a><a data-share="reddit" target="_blank" rel="noopener">Reddit</a><a data-share="x" target="_blank" rel="noopener">X</a><a data-share="email">Email</a></div><p id="share-status" role="status"></p><a id="share-link" hidden></a></section>
</div>
<article>
{body}
<section id="method"><h2>{esc(t["methodology"])}</h2><p>{esc(t["formula"])}</p><p>{esc(t["noteSolar"])}</p><p>{esc(t["limits"])}</p>
<h3>{esc(t["scenario"])}</h3><p>1000 W ÷ 1000 × 6 h × 60 = 360 kWh · 700 W ÷ 1000 × 6 h × 60 = 252 kWh. 0.30 €/kWh: A = 108 €, B = 75.60 €. Δ = 32.40 €/a. 700 € ÷ 32.40 €/a = 21.60 a.</p><p>{esc(t["assumption"])}</p></section>
<section><h2>{esc(t["sources"])} · 2026-09-20</h2><ul>{sources}</ul><h3>{esc(t["next"])}</h3><ul>{related}</ul></section>
<section><h2>{esc(t["citationLabel"])}</h2><p>{esc(t["cite"])}</p><p>EcoBack · {esc(c["title"])} · <a href="{url}">{url}</a> · 2026-09-20</p><a href="{path[:-5]}.md">Markdown</a></section>
</article>
<footer>EcoBack · {esc(t["status"])}</footer>
</main>
<script id="country-copy" type="application/json">{json.dumps(t,ensure_ascii=False)}</script>
<script src="/js/country-model.js"></script><script src="/js/country-ui.js"></script>
</body></html>
'''
  target=SITE/path.lstrip("/");target.parent.mkdir(parents=True,exist_ok=True);target.write_text(content)
  md=f'# {c["title"]}\n\nCanonical: {url}\n\n{c["intro"]}\n\n'
  md+='\n\n'.join(f'## {h}\n\n{p}' for h,p in c["sections"])
  md+=f'\n\n## {t["methodology"]}\n\n{t["formula"]}\n\n{t["noteSolar"]}\n\n{t["limits"]}\n\n'
  md+=f'## {t["sources"]} · 2026-09-20\n\n'+'\n'.join(f'- [{n}]({u})' for n,u in c["sources"])
  target.with_suffix(".md").write_text(md+"\n")
 print("Built 5 country/language calculators and Markdown mirrors.")
if __name__=="__main__": build()
