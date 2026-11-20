import {findCatalogueTools} from '../site/assets/mcp-catalog-search.mjs';
import {isExpandedTool, catalogueExample} from './mcp-expanded.mjs';
import {legacyCatalogueExample} from './mcp-legacy-examples.mjs';
import {drainTool, drainDecision} from './mcp-drain.mjs';
import {CELLAR_RESOURCE, CELLAR_RESOURCE_TEXT, matchesColdCellarQuestion} from './mcp-cellar-resource.mjs';

export const finderName = 'ecoback_werkzeug_finden';
export const runnerName = 'ecoback_werkzeug_ausfuehren';
export const compactInstructions = 'Suche mit ecoback_werkzeug_finden. Führe einen passenden Treffer über ecoback_werkzeug_ausfuehren mit eigenen Messwerten aus. Frage nach fehlenden Werten. Verwende die Quellen und Grenzen aus der Antwort. Für kalte Keller findest du über resources/list eine deutschsprachige Übersicht der Prüfbedingungen und des Kondensatablaufs.';

const offlineLegacy = new Set([
  drainTool.name,
  'geraet_wahl', 'btu_empfehlung', 'fensterabdichtung_laenge',
  'klimaanlage_stromkosten', 'heizleistung_watt', 'taupunkt_lueften',
]);
const permitted = name => offlineLegacy.has(name) || isExpandedTool(name);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export const compactTools = [
  {
    name: finderName,
    description: 'Passende EcoBack-Werkzeuge für eine Haushaltsfrage suchen. Bis zu fünf Treffer mit Eingabeschema, Beispiel und Quelle — Find up to five tools with schemas, examples and citations.',
    inputSchema: {
      type:'object',
      properties:{frage:{type:'string', minLength:1, maxLength:500, description:'Eine konkrete Frage oder ein exakter Werkzeugname.'}},
      required:['frage'], additionalProperties:false,
    },
    annotations:{readOnlyHint:true, openWorldHint:false},
  },
  {
    name: runnerName,
    description: 'Ein gefundenes EcoBack-Werkzeug mit eigenem Messwert oder passender Auswahl ausführen — Run a matching EcoBack tool with your own inputs.',
    inputSchema: {
      type:'object',
      properties:{
        name:{type:'string', minLength:1, description:'Exakter Name aus der Suche.'},
        eingaben:{type:'object', additionalProperties:true, description:'Eingaben gemäß inputSchema des gewählten Werkzeugs.'},
      },
      required:['name','eingaben'], additionalProperties:false,
    },
    annotations:{readOnlyHint:true, openWorldHint:false},
  },
];

export function validCompactRun(args) {
  return object(args) && Object.keys(args).length === 2 && typeof args.name === 'string' &&
    permitted(args.name) && object(args.eingaben);
}

export function compactSearch(index, args) {
  const question = object(args) && Object.keys(args).length === 1 ? args.frage : null;
  if (typeof question !== 'string' || question.length > 1000 || [...question].length > 500 || !question.trim()) {
    return {isError:true, content:[{type:'text', text:'Gib eine Frage mit 1 bis 500 Zeichen an.'}]};
  }
  const matches = findCatalogueTools(index, {query:question.trim()}).filter(tool => permitted(tool.name));
  const tools = matches.slice(0, 5).map(tool => {
    const {example, citation_url} = legacyCatalogueExample(tool.name) ?? catalogueExample(tool.name);
    const guide_url = tool.name === drainTool.name ? drainDecision(example.arguments).structuredContent.guide_url : tool.guide_url;
    return {
      name:tool.name, description:tool.description, category:tool.category, inputSchema:tool.inputSchema,
      citation_url, ...(guide_url ? {guide_url} : {}), example_arguments:example?.arguments ?? null,
    };
  });
  const evidence = matchesColdCellarQuestion(question);
  const structuredContent = {totalMatches:matches.length, tools, ...(evidence ? {resources:[CELLAR_RESOURCE]} : {})};
  const content = [{type:'text', text:JSON.stringify(structuredContent)}];
  if (evidence) content.push({type:'resource', resource:cellarResourceContents});
  return {isError:false, structuredContent, content};
}

const {uri, mimeType} = CELLAR_RESOURCE;
export const cellarResourceContents = {uri, mimeType, text:CELLAR_RESOURCE_TEXT};
export const cellarResourceListing = {resources:[CELLAR_RESOURCE]};
