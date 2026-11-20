export const AI_TOOLS=[{id:'task-loop',path:'/studio/task-loop',name:{zh:'任务回溯与预测',en:'Task Loop'},description:{zh:'先写下预期，再记录结果。发现阻塞，保留目标变化与下一步依据。',en:'Record expectations before results. Surface blockers and keep a history of goals and next actions.'},status:'beta',execution:'rules-and-user-evidence',freeMcp:'review_task_state',paidMcp:'compare_task_runs'}];
const discoveryTool = {
  name: 'list_bpj_ai_tools',
  description: 'Find BPJ tools by name, slug, English or Chinese keywords, or category. Use includeSchema for inputs and examples. Continue with nextOffset. The empty call includes the original catalogue and the first 100 suite tools.',
  inputSchema: {
    type:'object', additionalProperties:false,
    properties:{
      query:{type:'string',maxLength:120,description:'Search terms, tool ID or MCP name.'},
      category:{type:'string',description:'Optional exact category ID from the categories returned with every search.'},
      offset:{type:'integer',minimum:0,description:'Pass the nextOffset from the previous result with the same filters.'},
      limit:{type:'integer',minimum:1,maximum:100,description:'Maximum results, up to 10 when includeSchema is true. Filtered searches default to 10.'},
      includeSchema:{type:'boolean',description:'Include descriptions, input schemas and runnable examples for up to 10 matches.'},
    },
  },
  annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
};
const dispatchTool = {
  name: 'run_bpj_ai_tool',
  description: 'Run a BPJ suite tool found through list_bpj_ai_tools. Pass its exact freeMcp name and arguments matching its inputSchema.',
  inputSchema:{
    type:'object', additionalProperties:false, required:['name','arguments'],
    properties:{
      name:{type:'string',maxLength:128,pattern:'^bpj_[a-z0-9_]+$',description:'Exact freeMcp name returned by discovery.'},
      arguments:{type:'object',additionalProperties:true,description:'Tool-specific inputs from its inputSchema.'},
    },
  },
  annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
};
export const AI_FREE_TOOLS=[discoveryTool,{name:'review_task_state',description:'Rule-based preflight for an explicit task state. Does not read chat histories or predict a calibrated success probability.',inputSchema:{type:'object',required:['goal','acceptance'],properties:{goal:{type:'string',maxLength:2000},acceptance:{type:'string',maxLength:2000},blockers:{type:'array',maxItems:20,items:{type:'string',maxLength:2000}},repeatFailures:{type:'integer',minimum:0},artifactCreated:{type:'boolean'},acceptancePassed:{type:'boolean'},acceptanceEvidence:{type:'string'},permissionRequired:{type:'boolean'},cancelled:{type:'boolean'}}}},dispatchTool];
export const AI_PAID_TOOLS=[{name:'compare_task_runs',description:'Summarize up to 100 supplied experiment runs by group. No causal or savings guarantee. Requires enabled paid MCP service and active BPJ membership.',inputSchema:{type:'object',required:['runs'],properties:{runs:{type:'array',minItems:1,maxItems:100,items:{type:'object',required:['taskId','group','passed','cost','interventions'],properties:{taskId:{type:'string'},group:{type:'string'},passed:{type:'boolean'},cost:{type:'number',minimum:0},interventions:{type:'integer',minimum:0}}}}}}}];
