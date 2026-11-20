import {tools as textData} from './text-data.mjs';
import {tools as planning} from './planning.mjs';
import {tools as publishing} from './publishing.mjs';
import {tools as workflows} from './workflows.mjs';

export const SUITE_CATEGORIES = [
  {id:'text-data',title:{zh:'文本与数据',en:'Text & data'},tools:textData},
  {id:'planning',title:{zh:'经营与计划',en:'Business & planning'},tools:planning},
  {id:'publishing',title:{zh:'发布与可访问性',en:'Publishing & accessibility'},tools:publishing},
  {id:'workflows',title:{zh:'开发与文档',en:'Development & documents'},tools:workflows},
];

export const SUITE_TOOLS = SUITE_CATEGORIES.flatMap(group => group.tools.map(tool => ({
  ...tool, category:group.id, name:'bpj_'+tool.id.replaceAll('-','_'),
})));

const byName = new Map(SUITE_TOOLS.map(tool => [tool.name,tool]));
export const suitePath = tool => '/studio/ai/'+tool.id;

export function inputSpec(input) {
  const spec = {type:input.type, title:input.label.en};
  if(input.type==='string') spec.maxLength = input.maxLength ?? 12000;
  if(input.type==='number' || input.type==='integer') {
    spec.minimum = input.min ?? -1e12;
    spec.maximum = input.max ?? 1e12;
  }
  return spec;
}

export function toolInputSchema(tool) {
  const properties = Object.fromEntries(tool.inputs.map(input => [input.key,inputSpec(input)]));
  return {type:'object',properties,required:Object.keys(properties),additionalProperties:false};
}

export function suiteToolDefinitions() {
  return SUITE_TOOLS.map(tool => ({
    name:tool.name, title:tool.title.en, description:tool.description.en,
    inputSchema:toolInputSchema(tool),
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  }));
}

export function runSuiteTool(name,args) {
  const tool = byName.get(name);
  if(!tool) throw Error('Unknown tool.');
  if(!args || typeof args!=='object' || Array.isArray(args)) throw Error('Expected an object of tool arguments.');
  if(Object.keys(args).length!==tool.inputs.length) throw Error('Supply the required input fields only.');
  const validated = {};
  for(const input of tool.inputs) {
    if(!Object.hasOwn(args,input.key)) throw Error('Missing input: '+input.label.en);
    const value=args[input.key], spec=inputSpec(input);
    const correctType=spec.type==='integer'?Number.isSafeInteger(value):typeof value===spec.type;
    if(!correctType) throw Error('Invalid input type: '+input.label.en);
    if(spec.type==='string' && value.length>spec.maxLength) throw Error('Text exceeds limit: '+input.label.en);
    if((spec.type==='integer' || spec.type==='number') && (!Number.isFinite(value)||value<spec.minimum||value>spec.maximum))
      throw Error('Number outside range: '+input.label.en);
    validated[input.key]=value;
  }
  if(new TextEncoder().encode(JSON.stringify(validated)).length>64000) throw Error('Arguments exceed 64 KB.');
  const result=tool.run(validated);
  if(new TextEncoder().encode(JSON.stringify(result)).length>180000) throw Error('Result exceeds 180 KB. Use a smaller input.');
  return result;
}
