const german = {ä:'ae', ö:'oe', ü:'ue', ß:'ss'};
const normalize = value => String(value).toLowerCase()
  .replace(/[äöüß]/g,letter=>german[letter]).normalize('NFD').replace(/\p{Diacritic}/gu,'');

const questionWords = new Set((
  'wie was wann wo welche welcher welches wer welche kann koennen soll sollte brauche braucht ' +
  'ich du mir mein meine meinen ist sind wird werden richtig richtige richtigen geeignet passende ' +
  'viel viele finde finden suche suchen den dem der die das des ein eine einen einem einer ' +
  'auf aus mit bei fuer und oder ins zum zur von vor nach an ueber durch ' +
  'darf muss mache machen wenn ob what how which can need should the my for'
).split(' '));

// Common ways a reader can describe these tasks without knowing the tool name.
const taskWords = new Map([
  ['dusche_zeit_bei_wasserbudget','duschen litern liter wasserbudget duschdauer lange'],
  ['saugroboter_kabelroute_vorbereiten','roboter kabel faehrt ueberfaehrt kabelsalat'],
  ['entfeuchter_ablaufcheck','abflussschlauch ablaufschlauch oben hoeher fuehren kondensat'],
  ['luftreiniger_ersatzfilter_zuordnung','passt ersatzfilter luftreinigermodell luftreiniger filternummer'],
]);

export function indexCatalogue(tools) {
  return tools.map(tool => ({
    tool,
    name:normalize(tool.name),
    aliases:taskWords.get(tool.name)?.split(" ") || [],
    text:normalize([tool.description,tool.category,tool.page || tool.citation_url?.replace(/^https:\/\/getecoback\.com(?=\/)/,"")].join(' ')),
  }));
}

export function findCatalogueTools(index,{query='',category='',name=null}={}) {
  const tokens = [...new Set(normalize(query.slice(0,120)).match(/[a-z0-9]+/g) || [])]
    .filter(token=>token.length>=3&&!questionWords.has(token)).slice(0,8);
  const minimum = Math.ceil(tokens.length/2);
  return index.flatMap(entry=>{
    const tool = entry.tool;
    if ((category && category!==tool.category) || (name!==null && name!==tool.name)) return [];
    let score=0;
    let matched=0;
    for (const token of tokens) {
      const weight = entry.name.includes(token) ? 5 : entry.aliases.includes(token) ? 3 : entry.text.includes(token) ? 1 : 0;
      score += weight;
      if (weight) matched++;
    }
    return matched>=minimum ? [{tool,score}] : [];
  }).sort((a,b)=>b.score-a.score).map(result=>result.tool);
}
