// Shared public contract for the endpoint, human guide and discovery manifests.
export const SERVER = {name:'dollscout',version:'2.3.0'};
export const PROTOCOL_VERSION = '2025-06-18';
export const REGISTRY_NAME = 'io.github.f-tiger/dollscout-collecting';
export const TOOLS = [
  {
    name: "labubu_rarity_odds",
    description:
      "Commonly reported secret/chase odds for Labubu / The Monsters blind-box series, by series format " +
      "(6-figure, 12-figure, collabs, glow variants), with per-row sources. The box-printed odds for a " +
      "specific series outrank every row returned here, and the result says so.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "labubu_fake_signals",
    description:
      "The eight authenticity checks for a Labubu figure (teeth count, face finish, box finish, " +
      "anti-counterfeit seal, figure markings, build quality, price floor, seller of record), each with " +
      "its named public sources. Compiled signals, not a guarantee; limitations are included.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "secret_pull_probability",
    description:
      "Probability of pulling at least one secret across N blind boxes at printed odds of 1-in-oddsN, " +
      "plus the box counts a 50% and 90% chance require. Independent single-box model — sealed whole-case " +
      "allocation can differ, and the result carries that caveat.",
    inputSchema: {
      type: "object",
      properties: {
        oddsN: { type: "number", description: "The N in printed odds 1:N, e.g. 72" },
        boxes: { type: "number", description: "Number of blind boxes to be opened, e.g. 12" },
      },
      required: ["oddsN", "boxes"],
    },
  },
  {
    name: "define_labubu_term",
    description:
      "Plain-language definition of a Labubu / blind-box collecting term (blind box, series, regular, " +
      "secret/chase, printed odds, case, glow variant, vinyl plush pendant, Lafufu, seller of record). " +
      "Matches the term or its aliases; an unknown term returns the list of available terms, honestly.",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "The term to define, e.g. 'lafufu' or 'printed odds'" },
      },
      required: ["term"],
    },
  },
];

const language={type:'string',enum:['en','de','zh'],default:'en',description:'Interface language; some browser-only tools are available only in EN/DE.'};
TOOLS.push(
 {name:'calculate_style_probability',description:'Calculate independent-box chances for one regular style, a secret, or a user-supplied per-style probability. Required by mode: regular needs regularStyles and secretOddsN; secret needs secretOddsN; printed needs probabilityPercent. Regular mode assumes equally likely regular styles and replacement by a secret; not official series odds or sealed-case allocation.',inputSchema:{type:'object',properties:{target:{type:'string',enum:['regular','secret','printed']},boxes:{type:'integer',minimum:1,maximum:100000},regularStyles:{type:'integer',minimum:1,maximum:1000},secretOddsN:{type:'integer',minimum:2,maximum:100000},probabilityPercent:{type:'number',minimum:0,maximum:100}},required:['target','boxes'],additionalProperties:false}},
 {name:'find_collector_tools',description:'Find TDS collecting tools and guides by task. Returns canonical links, supported languages, inputs and which functions MCP can actually call. Browser-only collection records are never read.',inputSchema:{type:'object',properties:{task:{type:'string',enum:['all','odds','display','collection','guides'],default:'all'},language},additionalProperties:false}},
 {name:'get_collecting_guide',description:'Read a published Labubu, SKULLPANDA, Jellycat or Sonny Angel buying guide with official source links, review date and limitations. Not current stock, resale valuation or authentication.',inputSchema:{type:'object',properties:{brand:{type:'string',enum:['labubu','skullpanda','jellycat','sonny-angel']},language},required:['brand'],additionalProperties:false}},
 {name:'plan_display_fit',description:'Calculate a uniform single-layer rectangular layout for toy footprints inside a display case. All dimensions use the same unit. Tests 90-degree rotation when allowed; not 3D packing or a safety/load certification.',inputSchema:{type:'object',properties:Object.fromEntries([...['width','depth','height','itemWidth','itemDepth','itemHeight'].map(k=>[k,{type:'number',exclusiveMinimum:0,maximum:100000}]),['gap',{type:'number',minimum:0,maximum:100000,description:'Space between adjacent items; same unit as all dimensions.'}],['rotate',{type:'boolean',default:true}]]),required:['width','depth','height','itemWidth','itemDepth','itemHeight','gap'],additionalProperties:false}}
);
for(const t of TOOLS){t.annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};t.inputSchema.additionalProperties=false;}
const odds=TOOLS.find(t=>t.name==='secret_pull_probability').inputSchema.properties;
odds.oddsN={...odds.oddsN,type:'integer',minimum:2,maximum:100000};odds.boxes={...odds.boxes,type:'integer',minimum:1,maximum:100000};
TOOLS.find(t=>t.name==='define_labubu_term').inputSchema.properties.term.maxLength=120;
export const RESOURCES=[
 {uri:'https://thedollscout.com/collector-assets/tool-capabilities.json',name:'Collector tool catalog',mimeType:'application/json'},
 {uri:'https://thedollscout.com/collector-assets/brand-guides.json',name:'Published collecting guides',mimeType:'application/json'},
 {uri:'https://thedollscout.com/document-assets/tool-capabilities.json',name:'Existing browser-only digital tools',mimeType:'application/json'}
];
export const DEMO_INPUT={width:40,depth:25,height:30,itemWidth:8,itemDepth:6,itemHeight:15,gap:1,rotate:true};
