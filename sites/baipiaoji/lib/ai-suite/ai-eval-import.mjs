import {readCsv, requireColumn} from './csv-input.mjs';

const pairedTool = 'bpj_ai_paired_pass_regression';
const resultLimit = 200;
const idPattern = /^[\p{L}\p{N}][\p{L}\p{N}_.-]{0,79}$/u;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function check(condition, message) {
  if (!condition) throw Error(message);
}

function parseJson(text) {
  try { return JSON.parse(text.replace(/^\uFEFF/u, '')); }
  catch { throw Error('Enter valid JSON.'); }
}

function checkId(id) {
  check(typeof id === 'string' && id.length <= 80 && idPattern.test(id),
    'Use stable text sample IDs with letters, digits, dots, underscores or hyphens.');
}

function readCsvGrades(text, sampleKey) {
  const {columns, rows} = readCsv(text);
  check(sampleKey !== 'verdict', 'The sample ID and verdict columns must be different.');
  const sampleIndex = requireColumn(columns, sampleKey);
  const verdictIndex = requireColumn(columns, 'verdict');
  const coverage = new Map([
    ['true', true], ['false', false], ['error', 'execution_error'],
    ['unscored', 'unscored'], ['', 'unscored'],
  ]);
  return rows.map(row => {
    const verdict = row[verdictIndex].trim().toLowerCase();
    check(coverage.has(verdict), 'CSV verdict must be true, false, error, unscored or blank.');
    return [row[sampleIndex], coverage.get(verdict)];
  });
}

function promptfooVerdict(row) {
  check(typeof row.success === 'boolean' && [0,1,2].includes(row.failureReason),
    'Each selected Promptfoo result needs a boolean success value and a recognized failure reason.');
  if (row.failureReason === 2) {
    check(!row.success, 'The Promptfoo execution error conflicts with the success value.');
    return 'execution_error';
  }
  if (!record(row.response) || row.response.output == null) return 'missing_output';
  const grading = row.gradingResult;
  if (!record(grading)) return 'unscored';
  const hasComponents = Array.isArray(grading.componentResults) && grading.componentResults.length > 0;
  const hasAssertion = record(grading.assertion) && typeof grading.assertion.type === 'string' && grading.assertion.type.trim();
  if (!hasComponents && !hasAssertion) return 'unscored';
  check(grading.pass === row.success && row.failureReason === (row.success ? 0 : 1),
    'Promptfoo success, assertion status and grading verdict must agree.');
  return row.success;
}

function readPromptfooGrades(text, sampleKey, promptIndex) {
  const document = parseJson(text);
  const envelope = record(document) && document.results;
  check(record(envelope) && envelope.version === 3 && Array.isArray(envelope.results) &&
    Array.isArray(envelope.prompts), 'Use a Promptfoo JSON export with results.version 3.');
  check(Object.hasOwn(envelope.prompts, promptIndex), 'The selected Promptfoo prompt index does not exist.');
  const selected = [];
  for (const row of envelope.results) {
    check(record(row) && Number.isSafeInteger(row.promptIdx) && row.promptIdx >= 0 &&
      Object.hasOwn(envelope.prompts, row.promptIdx), 'A Promptfoo row has an invalid prompt index.');
    if (row.promptIdx !== promptIndex) continue;
    check(record(row.vars) && Object.hasOwn(row.vars, sampleKey),
      'Each selected Promptfoo result needs the stable sample ID in vars.');
    selected.push([row.vars[sampleKey], promptfooVerdict(row)]);
  }
  return selected;
}

function summarize(rows, expectedIds) {
  check(rows.length <= resultLimit, 'Use at most 200 results per selected run.');
  const expected = new Set(expectedIds);
  const seen = new Set();
  const grades = [];
  const skipped = [];
  const unexpectedIds = [];
  for (const [id, verdict] of rows) {
    checkId(id);
    check(!seen.has(id), 'A selected run contains a duplicate sample ID.');
    seen.add(id);
    if (!expected.has(id)) unexpectedIds.push(id);
    if (typeof verdict === 'boolean') grades.push({id, pass:verdict});
    else skipped.push({id, reason:verdict});
  }
  return {
    grades,
    audit:{
      receivedCount:rows.length,
      gradedCount:grades.length,
      missingIds:expectedIds.filter(id=>!seen.has(id)),
      unexpectedIds,
      skipped,
    },
  };
}

function compareExports({format, sampleKey, expectedIds, beforeExport, afterExport, beforePromptIndex, afterPromptIndex}) {
  check(format === 'csv' || format === 'promptfoo', 'Choose csv or promptfoo for both exports.');
  check(idPattern.test(sampleKey), 'Choose a stable CSV column or Promptfoo vars key.');
  check(format !== 'csv' || (beforePromptIndex === 0 && afterPromptIndex === 0), 'Use prompt index 0 for both CSV inputs.');
  const expected = parseJson(expectedIds);
  check(Array.isArray(expected) && expected.length >= 1 && expected.length <= resultLimit,
    'Supply a JSON array with 1 to 200 expected sample IDs.');
  for (const id of expected) checkId(id);
  check(new Set(expected).size === expected.length, 'The expected sample IDs must be unique.');
  const read = (text, promptIndex) => format === 'csv'
    ? readCsvGrades(text, sampleKey)
    : readPromptfooGrades(text, sampleKey, promptIndex);
  const before = summarize(read(beforeExport, beforePromptIndex), expected);
  const after = summarize(read(afterExport, afterPromptIndex), expected);
  const exactTestSetInBothRuns = [before,after].every(({audit}) =>
    !audit.missingIds.length && !audit.unexpectedIds.length && !audit.skipped.length);
  // The paired checker only sees scored rows. An ungraded outside ID could
  // disappear from its completeness result, so resolve that audit first.
  const blocked = [before,after].some(({audit}) => {
    const outside = new Set(audit.unexpectedIds);
    return audit.skipped.some(row=>outside.has(row.id));
  });
  let nextCall = null;
  if (!blocked) {
    const arguments_ = {
      expectedIds:JSON.stringify(expected),
      before:JSON.stringify(before.grades),
      after:JSON.stringify(after.grades),
    };
    check(new TextEncoder().encode(JSON.stringify(arguments_)).length <= 64000,
      'Paired regression arguments exceed 64 KB. Use a smaller stable sample set.');
    nextCall = {name:pairedTool, arguments:arguments_};
  }
  return {
    expectedCount:expected.length, exactTestSetInBothRuns, before:before.audit, after:after.audit,
    handoffState:blocked ? 'review_ungraded_outside_ids' : 'ready',
    nextCall,
  };
}

const count = {type:'integer',minimum:0,maximum:resultLimit};
const ids = {type:'array',maxItems:resultLimit,items:{type:'string',maxLength:80}};
const auditSchema = {
  type:'object',additionalProperties:false,
  required:['receivedCount','gradedCount','missingIds','unexpectedIds','skipped'],
  properties:{
    receivedCount:count,gradedCount:count,missingIds:ids,unexpectedIds:ids,
    skipped:{type:'array',maxItems:resultLimit,items:{
      type:'object',additionalProperties:false,required:['id','reason'],
      properties:{id:ids.items,reason:{enum:['execution_error','missing_output','unscored']}},
    }},
  },
};
const text = (key, zh, en, maxLength, multiline = false) =>
  ({key,label:{zh,en},type:'string',maxLength,multiline});
const index = (key, zh, en) => ({key,label:{zh,en},type:'integer',min:0,max:199});
export const tools = [{
  id:'ai-eval-export-pair',
  title:{zh:'双份 AI 评测结果导入与配对',en:'Pair AI evaluation exports'},
  description:{
    zh:'用固定样本 ID 对齐两份 CSV 或 Promptfoo v3 JSON。检查漏项、额外样本、运行错误和无评分项，生成可直接交给回退检查的 MCP 参数。CSV 使用 verdict 列。',
    en:'Align two CSV or Promptfoo v3 JSON exports by stable sample ID. Audit missing or unexpected samples, run errors and unscored rows. Returns ready-to-call MCP arguments for a paired regression check. CSV uses a verdict column.',
  },
  searchAliases:['compare Promptfoo eval exports','pair evaluation CSV','评测导入','评测报告对齐'],
  inputs:[
    text('format','两份文件格式（csv 或 promptfoo）','Format for both files (csv or promptfoo)',10),
    text('sampleKey','稳定编号列或 vars 键','Stable sample column or vars key',80),
    text('expectedIds','完整样本编号清单（JSON）','Complete expected sample IDs (JSON)',18000,true),
    text('beforeExport','旧版评测文件','Before evaluation export',24000,true),
    text('afterExport','新版评测文件','After evaluation export',24000,true),
    index('beforePromptIndex','旧版 Promptfoo 列编号（从 0 起，CSV 填 0）','Before Promptfoo prompt index (zero-based, use 0 for CSV)'),
    index('afterPromptIndex','新版 Promptfoo 列编号（从 0 起，CSV 填 0）','After Promptfoo prompt index (zero-based, use 0 for CSV)'),
  ],
  example:{
    format:'csv',sampleKey:'sample_id',expectedIds:'["001","002","003","004"]',
    beforeExport:'sample_id,verdict\n001,true\n002,false\n003,true\n004,true',
    afterExport:'sample_id,verdict\n004,error\n002,true\n001,false\n099,true',
    beforePromptIndex:0,afterPromptIndex:0,
  },
  outputSchema:{
    type:'object',additionalProperties:false,
    required:['expectedCount','exactTestSetInBothRuns','before','after','handoffState','nextCall'],
    properties:{
      expectedCount:{...count,minimum:1},exactTestSetInBothRuns:{type:'boolean'},
      before:auditSchema,after:auditSchema,
      handoffState:{enum:['ready','review_ungraded_outside_ids']},
      nextCall:{anyOf:[{type:'object',additionalProperties:false,required:['name','arguments'],properties:{
        name:{const:pairedTool},
        arguments:{type:'object',additionalProperties:false,required:['expectedIds','before','after'],properties:{
          expectedIds:{type:'string'},before:{type:'string'},after:{type:'string'},
        }},
      }},{type:'null'}]},
    },
  },
  run:compareExports,
}];
