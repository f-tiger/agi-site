#!/usr/bin/env node
/* Programmatic page generator #1 for DollScout — the /odds/ purchase-unit cluster.
 *
 * Ported from getecoback's gen_*.py model (2026-08-31, owner: 参考 eco 快速扩展流量):
 * one template, one data spine, many pages. eco's own lesson is encoded here too —
 * **naive template pSEO was explicitly killed**; every generated page must carry
 * >= 3 independent data points. Here each page carries five: the exact probability
 * at this box count across all reported odds formats, the expected number of
 * secrets, the 50%/90% thresholds, the expected-cost multiplier, and the specific
 * circulating claim this count disproves.
 *
 * LOAD-BEARING: the odds themselves are read from the already-published
 * data/rarity-odds.json — never re-declared here. Same doctrine as functions/mcp.js:
 * a third source of truth is the failure mode this fleet has paid to remove twice.
 * Everything else is arithmetic, so it needs no source beyond the formula.
 *
 * Emits: odds/*.html, de/odds/*.html, and data/pull-math.json (CC-BY dataset #4).
 * Idempotent: same input -> byte-identical output.
 *
 * Usage: node scripts/gen-odds-pages.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://thedollscout.com";
const TODAY = "2026-08-31";

/* ---------- spine: read the published odds, do not restate them ---------- */
const rarity = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rarity-odds.json"), "utf8"));
const FORMATS = [
  { n: 72,  en: "Standard 6-figure series",  de: "Standard-Serie (6 Figuren)" },
  { n: 120, en: "Some collab series (low end)", de: "Manche Collab-Serien (unteres Ende)" },
  { n: 144, en: "Extended 12-figure series", de: "Erweiterte Serie (12 Figuren)" },
  { n: 168, en: "Some collab series (high end)", de: "Manche Collab-Serien (oberes Ende)" },
  { n: 720, en: "Glow / ultra variants",     de: "Glow-/Ultra-Varianten" },
];
/* Assert every format we render is actually backed by the published dataset,
 * so a future edit there cannot silently orphan a number on 12 pages. */
const backed = new Set();
for (const f of rarity.formats) {
  if (f.oddsN) backed.add(f.oddsN);
  const m = String(f.reportedOdds).match(/1:(\d+)\D+1:(\d+)/);
  if (m) { backed.add(+m[1]); backed.add(+m[2]); }
}
for (const f of FORMATS) {
  if (!backed.has(f.n)) {
    console.error(`::error::gen-odds-pages: 1:${f.n} is not backed by data/rarity-odds.json`);
    process.exit(1);
  }
}

const pAtLeastOne = (n, boxes) => 1 - Math.pow(1 - 1 / n, boxes);
const boxesFor = (n, p) => Math.ceil(Math.log(1 - p) / Math.log(1 - 1 / n));
const pctEN = (x) => `${(x * 100).toFixed(1)}%`;
const pctDE = (x) => `${(x * 100).toFixed(1).replace(".", ",")} %`;

/* ---------- the ladder: only quantities people actually buy ----------
 * `h1` is the search-facing heading (always names the entity, "Labubu", plus the box
 * count); `hook` is the older voice line, kept as the lede opener; `short` feeds the
 * <title>. 2026-09-04 relevance pass — data/pull-math.json reads none of these. */
const COUNTS = [
  {
    boxes: 1, slug: "one-box",
    en: { unit: "a single blind box", short: "1 box", h1: "Labubu secret odds for one box", hook: "One box.",
      lede: "The atom of the whole hobby, and the number every other number on this site is built from.",
      claim: "“Someone pulled a secret on their first box, so it happens.”",
      correction: "It does happen — that is what a 1.4% chance means, not what it feels like. The mistake is reading a rare event that occurred as evidence the rate is higher than printed. A first-box secret is exactly as likely as a 72nd-box secret." },
    de: { unit: "eine einzelne Blind Box", short: "1 Box", h1: "Labubu-Secret-Chance bei 1 Box", hook: "Eine Box.",
      lede: "Das Atom des ganzen Hobbys — und die Zahl, aus der jede andere Zahl auf dieser Seite gebaut ist.",
      claim: "„Jemand hat bei der ersten Box ein Secret gezogen, es passiert also.“",
      correction: "Es passiert — genau das bedeutet eine Chance von 1,4 %, nicht mehr. Der Fehler ist, ein eingetretenes seltenes Ereignis als Beleg für eine höhere Rate zu lesen. Ein Secret in der ersten Box ist exakt so wahrscheinlich wie eines in der 72." },
  },
  {
    boxes: 6, slug: "six-boxes",
    en: { unit: "six boxes", short: "6 boxes", h1: "Labubu secret odds for six boxes", hook: "Six boxes — one of each regular?",
      lede: "Six is the number of regular figures in a standard series, which is why so many people buy six and expect the set.",
      claim: "“Buy six and you get the complete set.”",
      correction: "Six boxes drawn independently do not produce six different figures — duplicates are the normal outcome, not bad luck. Six boxes buys you six draws, and the secret is a separate question with its own low rate." },
    de: { unit: "sechs Boxen", short: "6 Boxen", h1: "Labubu-Secret-Chance bei 6 Boxen", hook: "Sechs Boxen — je eine pro Figur?",
      lede: "Sechs ist die Anzahl der regulären Figuren einer Standard-Serie — deshalb kaufen so viele sechs und erwarten das komplette Set.",
      claim: "„Kauf sechs und du hast das komplette Set.“",
      correction: "Sechs unabhängig gezogene Boxen ergeben nicht sechs verschiedene Figuren — Dubletten sind der Normalfall, nicht Pech. Sechs Boxen kaufen sechs Ziehungen; das Secret ist eine separate Frage mit eigener, niedriger Rate." },
  },
  {
    boxes: 12, slug: "twelve-boxes-full-case",
    en: { unit: "twelve boxes (a full case)", short: "12 boxes (full case)", h1: "Labubu secret odds for a full case of 12 boxes", hook: "A full case of twelve. Does it guarantee a secret?",
      lede: "This is the single most misreported number in the hobby, and the one worth getting right before you spend case money.",
      claim: "“A full case of twelve averages one secret.”",
      correction: "At 1:72 printed odds, twelve boxes average 0.17 secrets — about one secret per six cases, not one per case. A sealed case does typically guarantee one of each regular figure; that guarantee is about the regulars, and it has been widely repeated as though it covered the secret. It does not." },
    de: { unit: "zwölf Boxen (ein ganzer Case)", short: "12 Boxen (1 Case)", h1: "Labubu-Secret-Chance bei einem ganzen Case (12 Boxen)", hook: "Ein ganzer Case mit zwölf. Garantiert das ein Secret?",
      lede: "Das ist die am häufigsten falsch berichtete Zahl des Hobbys — und die, die man kennen sollte, bevor man Case-Geld ausgibt.",
      claim: "„Ein ganzer Case mit zwölf enthält im Schnitt ein Secret.“",
      correction: "Bei aufgedruckten 1:72 enthalten zwölf Boxen im Schnitt 0,17 Secrets — also etwa ein Secret pro sechs Cases, nicht eines pro Case. Ein versiegelter Case garantiert typischerweise je eine reguläre Figur; diese Garantie betrifft die Regulären und wurde weithin so weitergegeben, als schlösse sie das Secret ein. Tut sie nicht." },
  },
  {
    boxes: 24, slug: "twenty-four-boxes",
    en: { unit: "twenty-four boxes (two cases)", short: "24 boxes (2 cases)", h1: "Labubu secret odds for 24 boxes (two cases)", hook: "Two cases. Twice the boxes, not twice the odds.",
      lede: "The tier people reach after one case disappointed them — and where the gambler's fallacy does its most expensive work.",
      claim: "“I went through a case already, so I'm due.”",
      correction: "The boxes you already opened change nothing about the ones you have not. Doubling from twelve to twenty-four boxes does not double your chance from 15.5% to 31% either — independent draws compound, they do not add." },
    de: { unit: "vierundzwanzig Boxen (zwei Cases)", short: "24 Boxen (2 Cases)", h1: "Labubu-Secret-Chance bei 24 Boxen (zwei Cases)", hook: "Zwei Cases. Doppelt so viele Boxen, nicht doppelte Chance.",
      lede: "Die Stufe, die man erreicht, nachdem ein Case enttäuscht hat — und wo der Spielerfehlschluss am teuersten wird.",
      claim: "„Ich habe schon einen Case durch, ich bin also dran.“",
      correction: "Die bereits geöffneten Boxen ändern nichts an den noch ungeöffneten. Und die Verdopplung von zwölf auf vierundzwanzig verdoppelt die Chance nicht von 15,5 % auf 31 % — unabhängige Ziehungen multiplizieren sich, sie addieren sich nicht." },
  },
  {
    boxes: 72, slug: "seventy-two-boxes",
    en: { unit: "seventy-two boxes", short: "72 boxes", h1: "Labubu secret odds for 72 boxes", hook: "Seventy-two boxes. Surely by now?",
      lede: "The number in the printed odds, which nearly everyone reads as the number of boxes that gets you there. It is the most counterintuitive result on this site.",
      claim: "“1:72 means the 72nd box is the one.”",
      correction: "Buying all seventy-two gives you a 63.5% chance — better than a coin flip, and still more than a one-in-three chance of ending with nothing. “1 in 72” describes the rate per box, never a countdown. The expected number of secrets in 72 boxes is exactly one, and expecting one is not the same as getting one." },
    de: { unit: "zweiundsiebzig Boxen", short: "72 Boxen", h1: "Labubu-Secret-Chance bei 72 Boxen", hook: "Zweiundsiebzig Boxen. Jetzt aber, oder?",
      lede: "Die Zahl aus der aufgedruckten Wahrscheinlichkeit — die fast alle als die Anzahl Boxen lesen, die einen ans Ziel bringt. Das kontraintuitivste Ergebnis dieser Seite.",
      claim: "„1:72 heißt, die 72. Box ist es dann.“",
      correction: "Alle zweiundsiebzig zu kaufen ergibt 63,5 % — besser als ein Münzwurf, und immer noch mehr als eine Chance von eins zu drei, mit nichts dazustehen. „1 zu 72“ beschreibt die Rate pro Box, nie einen Countdown. Der Erwartungswert bei 72 Boxen ist genau ein Secret — und einen Erwartungswert zu haben ist nicht dasselbe, wie ihn zu bekommen." },
  },
];

/* ---------- template ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const jld = (o) => JSON.stringify(o, null, 2);
/* Search-relevance floor (2026-09-04): every generated <title> names "Labubu", stays
 * <= 65 chars, and every description stays <= 160 chars. Fail loudly, do not truncate. */
function assertLengths(page, title, desc) {
  const bad = [];
  if (!/Labubu/.test(title)) bad.push(`title lacks "Labubu"`);
  if (title.length > 65) bad.push(`title ${title.length} chars > 65`);
  if (desc.length > 160) bad.push(`description ${desc.length} chars > 160`);
  if (bad.length) { console.error(`::error::gen-odds-pages ${page}: ${bad.join("; ")}`); process.exit(1); }
}

function L(lang) {
  const de = lang === "de";
  const pct = de ? pctDE : pctEN;
  return {
    de, pct,
    pre: de ? "/de" : "",
    home: de ? "Start" : "Home",
    hub: de ? "Chancen pro Boxenzahl" : "Odds by box count",
    skip: de ? "Zum Inhalt springen" : "Skip to content",
    notice: de
      ? '🧸 <b>Kaufratgeber nach Belegstandard.</b> Jede Aussage mit Quelle — oder als ungeprüft markiert. Unabhängig: nicht mit Pop&nbsp;Mart verbunden.'
      : '🧸 <b>Evidence-standard buyer\'s guide.</b> Every claim sourced — or marked unverified. Independent: not affiliated with Pop&nbsp;Mart.',
    navRarity: de ? "Seltenheit &amp; Chancen" : "Rarity &amp; Odds",
    navFake: de ? "Echt oder Fake" : "Real vs Fake",
    navBuy: de ? "Wo kaufen" : "Where to Buy",
    other: de ? "EN" : "DE",
    tableHead: de ? "Serienformat" : "Series format",
    tableOdds: de ? "Aufgedruckt" : "Printed odds",
    tableP: de ? "Chance auf mind. ein Secret" : "Chance of at least one secret",
    quick: de ? "Kurze Antworten" : "Quick answers",
    claimH: de ? "Die Behauptung, die hier scheitert" : "The claim this box count disproves",
    claimLabel: de ? "Kursiert:" : "Circulating:",
    corrLabel: de ? "Tatsächlich:" : "Actually:",
    mathH: de ? "Die Rechnung, offen" : "The math, in the open",
    thresholdH: de ? "Wie viele Boxen für eine ernsthafte Chance?" : "How many boxes for a serious chance?",
    costH: de ? "Was das kostet — als Faktor, nicht als Preis" : "What that costs — as a multiple, not a price",
    footer: de
      ? '<strong>Unabhängiger Ratgeber.</strong> Nicht mit Pop Mart oder Kasing Lung verbunden. <strong>Affiliate-Hinweis:</strong> manche ausgehenden Links dieser Website sind Amazon-Affiliate-Links — für dich ändert sich der Preis nicht. Diese Seite verlinkt auf keinen Shop.'
      : '<strong>Independent guide.</strong> Not affiliated with Pop Mart or Kasing Lung. <strong>Affiliate disclosure:</strong> some outbound links on this site are Amazon affiliate links at no cost to you. This page links to no store at all.',
    disc: de ? "Hinweis" : "Disclosure",
    priv: de ? "Datenschutz" : "Privacy",
    updated: de ? `Zuletzt aktualisiert ${TODAY}.` : `Last updated ${TODAY}.`,
    model: de
      ? "Modell: unabhängige Einzelziehungen zu den aufgedruckten Chancen. Die Zuteilung in versiegelten Cases kann davon abweichen — die Zahlen hier modellieren lose Boxen."
      : "Model: independent single-box draws at the printed odds. Sealed-case allocation can differ — these numbers model loose boxes.",
    authoritative: de
      ? "Maßgeblich ist immer die auf der jeweiligen Serie aufgedruckte Zahl; die Raten hier sind Sammler-Angaben zur Orientierung (Quellen im Datensatz)."
      : "The authoritative number is always the one printed on that series' own box; the rates here are collector-reported for orientation (sources in the dataset).",
  };
}

function shell({ lang, slug, title, desc, ogTitle, breadcrumbName, ld, body }) {
  const t = L(lang);
  const url = `${BASE}${t.pre}/odds/${slug}`;
  const enUrl = `${BASE}/odds/${slug}`;
  const deUrl = `${BASE}/de/odds/${slug}`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt — AI index of this site">
<link rel="alternate" type="text/plain" href="/llms-full.txt" title="llms-full.txt — full site text for AI">
<link rel="alternate" hreflang="en" href="${enUrl}">
<link rel="alternate" hreflang="de" href="${deUrl}">
<link rel="alternate" hreflang="x-default" href="${enUrl}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="DollScout">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${BASE}/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/css/main.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧸</text></svg>">
<script type="application/ld+json">
${jld(ld)}
</script>
</head>
<body>
<a class="skip-link" href="#main">${t.skip}</a>
<div class="notice-bar">${t.notice}</div>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="${t.pre}/">Doll<b>Scout</b></a>
    <button class="nav-toggle" aria-label="Menu">☰</button>
    <nav class="nav">
      <a href="${t.pre}/rarity">${t.navRarity}</a>
      <a href="${t.pre}/fake-check">${t.navFake}</a>
      <a href="${t.pre}/where-to-buy">${t.navBuy}</a>
      <a href="${t.de ? "" : "/de"}/odds/${slug}" lang="${t.de ? "en" : "de"}">${t.other}</a>
    </nav>
  </div>
</header>

<main id="main" tabindex="-1">
<section>
  <div class="wrap prose">
    <p class="breadcrumb"><a href="${t.pre}/">${t.home}</a> / <a href="${t.pre}/odds/">${t.hub}</a>${breadcrumbName ? ` / ${esc(breadcrumbName)}` : ""}</p>
${body}
  </div>
</section>
</main>

<footer class="site-footer">
  <div class="wrap">
    <p class="disclosure">
      ${t.footer}
      · <a href="/legal/affiliate-disclosure">${t.disc}</a> · <a href="/legal/privacy">${t.priv}</a> · © <span id="year"></span> DollScout
    </p>
  </div>
</footer>
<script src="/js/config.js"></script>
<script src="/js/analytics.js"></script>
<script src="/js/main.js"></script>
</body>
</html>
`;
}

/* ---------- per-count page ---------- */
function countPage(c, lang) {
  const t = L(lang);
  const cp = c[lang];
  const b = c.boxes;
  const p72 = pAtLeastOne(72, b);
  const expected = b / 72;
  const expStr = t.de ? expected.toFixed(2).replace(".", ",") : expected.toFixed(2);

  const rows = FORMATS.map((f) => {
    const src = rarity.formats.find((x) => x.oddsN === f.n);
    return `      <tr><td>${f[lang]}</td><td>1:${f.n}</td><td><b>${t.pct(pAtLeastOne(f.n, b))}</b></td></tr>`;
  }).join("\n");

  const thr = FORMATS.map((f) =>
    `      <tr><td>1:${f.n}</td><td>${boxesFor(f.n, 0.5)}</td><td>${boxesFor(f.n, 0.9)}</td></tr>`
  ).join("\n");

  /* FAQ strings are built once and rendered twice — visibly and in JSON-LD —
     because the site's blocking gate (scripts/check-structured-data.mjs) rejects
     any answer that exists only in the markup. Build once, render twice. */
  const faq = t.de
    ? [
        { q: `Wie hoch ist die Chance auf ein Secret bei ${cp.unit}?`,
          a: `Bei aufgedruckten 1:72 liegt die Chance auf mindestens ein Secret bei ${t.pct(p72)}. Der Erwartungswert sind ${expStr} Secrets. Bei selteneren Formaten ist die Chance niedriger: ${t.pct(pAtLeastOne(144, b))} bei 1:144 und ${t.pct(pAtLeastOne(720, b))} bei 1:720.` },
        { q: `Wie viele Boxen braucht es für eine 50-Prozent-Chance?`,
          a: `Bei 1:72 sind es ${boxesFor(72, 0.5)} Boxen für 50 Prozent und ${boxesFor(72, 0.9)} für 90 Prozent. Bei 1:144 entsprechend ${boxesFor(144, 0.5)} und ${boxesFor(144, 0.9)}, bei 1:720 dann ${boxesFor(720, 0.5)} und ${boxesFor(720, 0.9)}.` },
      ]
    : [
        { q: `What are the odds of a secret from ${cp.unit}?`,
          a: `At 1:72 printed odds the chance of at least one secret is ${t.pct(p72)}, and the expected number of secrets is ${expStr}. Rarer formats are lower: ${t.pct(pAtLeastOne(144, b))} at 1:144 and ${t.pct(pAtLeastOne(720, b))} at 1:720.` },
        { q: `How many boxes would a 50 percent chance take?`,
          a: `At 1:72 it takes ${boxesFor(72, 0.5)} boxes for 50 percent and ${boxesFor(72, 0.9)} for 90 percent. At 1:144 it is ${boxesFor(144, 0.5)} and ${boxesFor(144, 0.9)}; at 1:720 it is ${boxesFor(720, 0.5)} and ${boxesFor(720, 0.9)}.` },
      ];

  /* <title> <= 65 chars, "Labubu" first; description <= 160 chars, keyword-first with the
     page's own number as the anchor. Both asserted below so a future copy edit cannot regress. */
  const title = t.de
    ? `Echte Labubu-Secret-Chance bei ${cp.short} | DollScout`
    : `Labubu secret odds: ${cp.short} — the math | DollScout`;
  const desc = t.de
    ? `Labubu-Secret-Chance bei ${cp.short}: ${t.pct(p72)} für mind. ein Secret bei 1:72, Erwartungswert ${expStr}. Alle Formate, 50/90-%-Schwellen, widerlegte Behauptung.`
    : `Labubu secret odds for ${cp.short}: ${t.pct(p72)} chance of ≥1 secret at 1:72, expected ${expStr}. All formats, 50%/90% thresholds, the claim it disproves.`;
  assertLengths(`${t.pre}/odds/${c.slug}`, title, desc);

  const body = `    <h1>${esc(cp.h1)}</h1>
    <p class="meta" style="max-width:680px"><strong>${esc(cp.hook)}</strong> ${esc(cp.lede)} ${t.updated}</p>

    <div>
      <span class="odds-sticker">${t.pct(p72)}
        <small>${t.de ? `Chance auf mindestens ein Secret aus ${cp.unit} — bei aufgedruckten 1:72` : `chance of at least one secret from ${cp.unit} — at 1:72 printed odds`}</small>
      </span>
    </div>

    <h2>${t.claimH}</h2>
    <p><em>${t.claimLabel}</em> ${esc(cp.claim)}</p>
    <p><strong>${t.corrLabel}</strong> ${esc(cp.correction)}</p>

    <h2>${t.mathH}</h2>
    <p>${t.de
      ? `Bei ${cp.unit} und unabhängigen Ziehungen ist die Chance auf mindestens ein Secret <code>1 − (1 − 1/N)<sup>${b}</sup></code>, der Erwartungswert schlicht <code>${b}/N</code>. Für jedes berichtete Serienformat:`
      : `For ${cp.unit} drawn independently, the chance of at least one secret is <code>1 − (1 − 1/N)<sup>${b}</sup></code> and the expected count is simply <code>${b}/N</code>. Across every reported series format:`}</p>
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>${t.tableHead}</th><th>${t.tableOdds}</th><th>${t.tableP}</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    </div>
    <p class="meta">${t.model} ${t.authoritative}</p>

    <h2>${t.thresholdH}</h2>
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>${t.tableOdds}</th><th>${t.de ? "Boxen für 50 %" : "Boxes for 50%"}</th><th>${t.de ? "Boxen für 90 %" : "Boxes for 90%"}</th></tr></thead>
      <tbody>
${thr}
      </tbody>
    </table>
    </div>

    <h2>${t.costH}</h2>
    <p>${t.de
      ? `Wir drucken keine Preise — sie rotieren mit Serie und Verfügbarkeit. Als Faktor gerechnet: die erwarteten Kosten für ein Secret sind <strong>72 ×</strong> der Preis einer Box bei 1:72, <strong>144 ×</strong> bei 1:144 und <strong>720 ×</strong> bei 1:720. ${cp.unit.charAt(0).toUpperCase()}${cp.unit.slice(1)} deckt davon ${expStr} ab. Den Rechner mit deinem lokalen Boxenpreis gibt es auf <a href="/de/psychology#cost">der Psychologie-Seite</a>.`
      : `We do not print prices — they rotate with series and stock. As a multiple: the expected cost of one secret is <strong>72×</strong> a single box at 1:72, <strong>144×</strong> at 1:144 and <strong>720×</strong> at 1:720. ${cp.unit.charAt(0).toUpperCase()}${cp.unit.slice(1)} covers ${expStr} of that. Put your own local box price into the calculator on <a href="/psychology#cost">the psychology page</a>.`}</p>

    <h2>${t.quick}</h2>
${faq.map((f) => `    <p><strong>${esc(f.q)}</strong><br>${esc(f.a)}</p>`).join("\n")}

    <div class="grid c3" style="margin-top:26px">
      <a class="card" href="${t.pre}/rarity"><h3>${t.de ? "Alle Chancen + Rechner" : "All the odds + calculator"}</h3><p>${t.de ? "Die Quellen hinter jeder Rate, und ein Rechner für jede Boxenzahl." : "The sources behind every rate, and a calculator for any box count."}</p></a>
      <a class="card" href="${t.pre}/odds/"><h3>${t.hub}</h3><p>${t.de ? "Dieselbe Rechnung für jede Kaufmenge." : "The same math for every purchase size."}</p></a>
      <a class="card" href="${t.pre}/where-to-buy"><h3>${t.navBuy}</h3><p>${t.de ? "Wenn die Mathematik entschieden hat: wo die aufgedruckte Chance auch die echte ist." : "Once the math has decided: where the printed odds are the real odds."}</p></a>
    </div>
`;

  const url = `${BASE}${t.pre}/odds/${c.slug}`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${BASE}/#org`, name: "DollScout", url: `${BASE}/` },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: t.home, item: `${BASE}${t.pre}/` },
        { "@type": "ListItem", position: 2, name: t.hub, item: `${BASE}${t.pre}/odds/` },
        { "@type": "ListItem", position: 3, name: cp.h1.replace(/[.?]$/, ""), item: url } ] },
      { "@type": "Article", image: `${BASE}/img/og.png`, datePublished: TODAY, dateModified: TODAY,
        headline: cp.h1.replace(/[.?]$/, ""), description: desc, url,
        publisher: { "@id": `${BASE}/#org` }, inLanguage: lang,
        isAccessibleForFree: true },
      { "@type": "FAQPage", inLanguage: lang, mainEntity: faq.map((f) => ({
        "@type": "Question", name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };

  return shell({ lang, slug: c.slug, title, desc, ogTitle: cp.h1.replace(/[.?]$/, ""),
    breadcrumbName: cp.h1.replace(/[.?]$/, ""), ld, body });
}

/* ---------- hub ---------- */
function hubPage(lang) {
  const t = L(lang);
  const head = COUNTS.map((c) => {
    const cp = c[lang];
    return `      <tr><td><a href="${t.pre}/odds/${c.slug}">${c.boxes} ${t.de ? (c.boxes === 1 ? "Box" : "Boxen") : (c.boxes === 1 ? "box" : "boxes")}</a></td><td><b>${t.pct(pAtLeastOne(72, c.boxes))}</b></td><td>${t.de ? (c.boxes / 72).toFixed(2).replace(".", ",") : (c.boxes / 72).toFixed(2)}</td></tr>`;
  }).join("\n");

  const faq = t.de
    ? [
        { q: "Garantiert ein versiegelter Case ein Secret?",
          a: "Nein. Ein versiegelter Case garantiert typischerweise je eine reguläre Figur. Bei aufgedruckten 1:72 liegen zwölf Boxen bei 15,5 % Chance auf mindestens ein Secret und einem Erwartungswert von 0,17 — etwa ein Secret pro sechs Cases." },
        { q: "Bedeutet 1:72, dass die 72. Box das Secret ist?",
          a: "Nein. 1:72 ist die Rate pro Box, kein Countdown. Wer alle zweiundsiebzig kauft, hat 63,5 % Chance auf mindestens ein Secret — und damit mehr als eine Chance von eins zu drei, leer auszugehen." },
      ]
    : [
        { q: "Does a sealed case guarantee a secret?",
          a: "No. A sealed case typically guarantees one of each regular figure. At 1:72 printed odds, twelve boxes carry a 15.5% chance of at least one secret and an expected count of 0.17 — about one secret per six cases." },
        { q: "Does 1:72 mean the 72nd box is the secret?",
          a: "No. 1:72 is the rate per box, not a countdown. Buying all seventy-two gives a 63.5% chance of at least one secret — leaving more than a one-in-three chance of ending with none." },
      ];

  const title = t.de
    ? "Labubu-Secret-Chance nach Boxenzahl: 1 bis 72 Boxen | DollScout"
    : "Labubu secret odds by box count: 1 to 72 boxes | DollScout";
  const desc = t.de
    ? "Labubu-Secret-Chance bei 1, 6, 12 (ganzer Case), 24 und 72 Boxen: die echte Quote pro Kaufmenge, offen gerechnet, plus die Behauptungen, die daran scheitern."
    : "Labubu secret odds for 1, 6, 12 (a full case), 24 and 72 boxes: the real chance at each purchase size, computed in the open, plus the claims each one disproves.";
  assertLengths(`${t.pre}/odds/`, title, desc);
  const h1 = t.de ? "Labubu-Secret-Chance nach Boxenzahl" : "Labubu secret odds by box count";
  const hook = t.de ? "Was kauft eigentlich jede Kaufmenge?" : "What does each purchase size actually buy?";

  const body = `    <h1>${h1}</h1>
    <p class="meta" style="max-width:680px"><strong>${hook}</strong> ${t.de
      ? "Fast jede Zahl, die in diesem Hobby weitergereicht wird, ist eine Chance pro Box — und fast jede Entscheidung wird in Kaufmengen getroffen: eine Box, ein Set, ein Case. Diese Seiten rechnen die eine in die andere um, für jedes berichtete Serienformat, offen und nachrechenbar."
      : "Almost every number passed around this hobby is a per-box rate — and almost every decision is made in purchase sizes: one box, a set, a case. These pages convert one into the other, for every reported series format, in the open where you can check the arithmetic."} ${t.updated}</p>

    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>${t.de ? "Kaufmenge" : "Purchase size"}</th><th>${t.de ? "Chance auf mind. ein Secret (1:72)" : "Chance of ≥1 secret (1:72)"}</th><th>${t.de ? "Erwartungswert" : "Expected secrets"}</th></tr></thead>
      <tbody>
${head}
      </tbody>
    </table>
    </div>
    <p class="meta">${t.model} ${t.authoritative}</p>

    <h2>${t.quick}</h2>
${faq.map((f) => `    <p><strong>${esc(f.q)}</strong><br>${esc(f.a)}</p>`).join("\n")}

    <h2>${t.de ? "Offene Daten" : "Open data"}</h2>
    <p>${t.de
      ? 'Die gesamte Tabelle — jedes Format × jede Kaufmenge, plus die Schwellen — steht als CC-BY-Datensatz unter <a href="/data/pull-math.json">/data/pull-math.json</a>. Sie wird aus <a href="/data/rarity-odds.json">rarity-odds.json</a> berechnet, damit es keine zweite Quelle für dieselben Zahlen gibt.'
      : 'The whole table — every format × every purchase size, plus the thresholds — is published as a CC-BY dataset at <a href="/data/pull-math.json">/data/pull-math.json</a>. It is computed from <a href="/data/rarity-odds.json">rarity-odds.json</a> so there is never a second source for the same numbers.'}</p>

    <div class="grid c3" style="margin-top:26px">
      <a class="card" href="${t.pre}/rarity"><h3>${t.de ? "Seltenheit &amp; Rechner" : "Rarity &amp; calculator"}</h3><p>${t.de ? "Die Quellen hinter jeder Rate, und ein Rechner für beliebige Boxenzahlen." : "The sources behind every rate, and a calculator for any box count."}</p></a>
      <a class="card" href="${t.pre}/psychology"><h3>${t.de ? "Warum es sich anders anfühlt" : "Why it feels different"}</h3><p>${t.de ? "Die Belohnungsmechanik hinter der Lücke zwischen Zahl und Gefühl — plus Kostenrechner." : "The reward mechanics behind the gap between the number and the feeling — plus the cost calculator."}</p></a>
      <a class="card" href="${t.pre}/how-blind-boxes-work"><h3>${t.de ? "Wie Blind Boxes funktionieren" : "How blind boxes work"}</h3><p>${t.de ? "Serie, Secret, Case — die Mechanik auf einer Seite." : "Series, secret, case — the mechanism in one page."}</p></a>
    </div>
`;

  const url = `${BASE}${t.pre}/odds/`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${BASE}/#org`, name: "DollScout", url: `${BASE}/` },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: t.home, item: `${BASE}${t.pre}/` },
        { "@type": "ListItem", position: 2, name: t.hub, item: url } ] },
      { "@type": "Article", image: `${BASE}/img/og.png`, datePublished: TODAY, dateModified: TODAY,
        headline: h1, description: desc, url, publisher: { "@id": `${BASE}/#org` },
        inLanguage: lang, isAccessibleForFree: true },
      { "@type": "ItemList", name: t.hub, itemListElement: COUNTS.map((c, i) => ({
        "@type": "ListItem", position: i + 1, name: c[lang].h1.replace(/[.?]$/, ""),
        url: `${BASE}${t.pre}/odds/${c.slug}` })) },
      { "@type": "FAQPage", inLanguage: lang, mainEntity: faq.map((f) => ({
        "@type": "Question", name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };
  return shell({ lang, slug: "", title, desc, ogTitle: h1, breadcrumbName: "", ld, body });
}

/* ---------- dataset #4 ---------- */
function dataset() {
  return {
    name: "Labubu secret-pull probability by purchase size",
    description:
      "Chance of at least one secret figure, expected secret count, and the 50%/90% box thresholds, for each commonly reported blind-box odds format across the purchase sizes people actually buy. Every value is arithmetic over the rates published in rarity-odds.json — this file adds no new rate of its own.",
    license: "https://creativecommons.org/licenses/by/4.0/",
    publisher: `${BASE}/`,
    documentation: `${BASE}/odds/`,
    isBasedOn: `${BASE}/data/rarity-odds.json`,
    recorded: TODAY,
    method: {
      atLeastOne: "1 - (1 - 1/N)^boxes",
      expectedCount: "boxes / N",
      boxesForProbability: "ceil(ln(1-p) / ln(1 - 1/N))",
      model: "Independent single-box draws at the printed odds.",
    },
    limitations: [
      "The authoritative rate for any series is the one printed on that series' own box; the N values here are collector-reported, inherited from rarity-odds.json along with its sources.",
      "Sealed whole-case allocation can differ from independent single-box draws; every number here models loose boxes.",
      "These are probabilities, not predictions: an expected count of 1 is not a guarantee of 1.",
    ],
    formats: FORMATS.map((f) => ({ oddsN: f.n, label: f.en })),
    purchaseSizes: COUNTS.map((c) => ({
      boxes: c.boxes,
      page: `${BASE}/odds/${c.slug}`,
      byFormat: Object.fromEntries(FORMATS.map((f) => [
        String(f.n),
        { atLeastOneSecret: +pAtLeastOne(f.n, c.boxes).toFixed(6), expectedSecrets: +(c.boxes / f.n).toFixed(6) },
      ])),
    })),
    thresholds: Object.fromEntries(FORMATS.map((f) => [
      String(f.n), { boxesFor50pct: boxesFor(f.n, 0.5), boxesFor90pct: boxesFor(f.n, 0.9), expectedBoxesPerSecret: f.n },
    ])),
  };
}

/* ---------- write ---------- */
const written = [];
function put(rel, content) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  written.push(rel);
}
for (const lang of ["en", "de"]) {
  const pre = lang === "de" ? "de/" : "";
  put(`${pre}odds/index.html`, hubPage(lang));
  for (const c of COUNTS) put(`${pre}odds/${c.slug}.html`, countPage(c, lang));
}
put("data/pull-math.json", JSON.stringify(dataset(), null, 2) + "\n");
console.log(`gen-odds-pages: wrote ${written.length} files`);
for (const w of written) console.log("  " + w);

/* ---------- wiring guard ----------
 * A generated page that no machine surface points at is a page nobody finds.
 * sitemap.xml and scripts/urls.txt are hand-maintained, so adding a count above
 * without updating them would silently ship an orphan. Fail loudly instead. */
const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const urlsTxt = fs.readFileSync(path.join(ROOT, "scripts/urls.txt"), "utf8");
const llmsFull = fs.readFileSync(path.join(ROOT, "scripts/build-llms-full.mjs"), "utf8");
let orphans = 0;
for (const lang of ["en", "de"]) {
  const pre = lang === "de" ? "/de" : "";
  for (const rel of ["/", ...COUNTS.map((c) => `/${c.slug}`)]) {
    const p = `${pre}/odds${rel === "/" ? "/" : rel}`;
    for (const [what, hay] of [["sitemap.xml", sitemap], ["scripts/urls.txt", urlsTxt]]) {
      if (!hay.includes(`${BASE}${p}`)) { console.error(`::error::${p} missing from ${what}`); orphans++; }
    }
    if (!llmsFull.includes(`"${p}"`)) { console.error(`::error::${p} missing from build-llms-full PAGES`); orphans++; }
  }
}
if (orphans) process.exit(1);
console.log("gen-odds-pages: wiring guard passed (sitemap + urls.txt + llms-full all reference every generated page)");
