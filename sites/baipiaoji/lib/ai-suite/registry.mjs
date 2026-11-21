import {tools as textData} from './text-data.mjs';
import {tools as planning} from './planning.mjs';
import {tools as publishing} from './publishing.mjs';
import {tools as workflows} from './workflows.mjs';

import {tools as measurement} from './measurement.mjs';
import {tools as tables} from './tables.mjs';
import {tools as operations} from './operations.mjs';
import {tools as editorial} from './editorial.mjs';
import {tools as developer} from './developer.mjs';
import {tools as evaluation} from './ai-evaluation.mjs';
import {executeSuiteTool,toolInputSchema} from './runtime.mjs';

export {inputSpec,toolInputSchema} from './runtime.mjs';

export const SUITE_CATEGORIES = [
  {id:'text-data',title:{zh:'文本与数据',en:'Text & data'},tools:textData},
  {id:'planning',title:{zh:'经营与计划',en:'Business & planning'},tools:planning},
  {id:'publishing',title:{zh:'发布与可访问性',en:'Publishing & accessibility'},tools:publishing},
  {id:'workflows',title:{zh:'开发与文档',en:'Development & documents'},tools:workflows},
  {id:'measurement',title:{zh:'测量与工程',en:'Measurement & engineering'},tools:measurement},
  {id:'tables',title:{zh:'表格与统计',en:'Tables & statistics'},tools:tables},
  {id:'operations',title:{zh:'运营与财务',en:'Operations & finance'},tools:operations},
  {id:'editorial',title:{zh:'编辑与内容质量',en:'Editing & content quality'},tools:editorial},
  {id:'developer',title:{zh:'软件与数据格式',en:'Software & data formats'},tools:developer},
  {id:'ai-evaluation',title:{zh:'AI 评测与交付',en:'AI evaluation & delivery'},tools:evaluation},
];

export const SUITE_TOOLS = SUITE_CATEGORIES.flatMap(group => group.tools.map(tool => ({
  ...tool, category:group.id, name:'bpj_'+tool.id.replaceAll('-','_'),
})));

const byName = new Map(SUITE_TOOLS.map(tool => [tool.name,tool]));
export const suitePath = tool => '/studio/ai/'+tool.id;

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
  return executeSuiteTool(tool,args);
}
