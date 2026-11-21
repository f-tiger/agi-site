import { define, string, record, requireValue as check, round } from './developer-common.mjs';

// These tools evaluate supplied outputs and labels; they never call a model.
// Bounded parsing also rejects numbers JSON.parse would turn into Infinity.
function parseDocument(text) {
  const value = JSON.parse(text);
  const pending = [[value, 0]];
  let nodes = 0;
  while (pending.length) {
    const [item, depth] = pending.pop();
    check(++nodes <= 4000 && depth <= 16, 'Use at most 4000 JSON nodes and 16 levels.');
    if (typeof item === 'number') check(Number.isFinite(item), 'JSON numbers must be finite.');
    if (item !== null && typeof item === 'object') {
      for (const child of Object.values(item)) pending.push([child, depth + 1]);
    }
  }
  return value;
}
const jsonField = (key, zh, en, sample, maxLength = 24000) =>
  string(key, zh, en, JSON.stringify(sample, null, 2), maxLength, parseDocument);
const validName = (value) => typeof value === 'string' && value.length >= 1 && value.length <= 80 &&
  value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value);
function exactRecord(value, keys) {
  check(record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)),
    'Each record must contain only the documented fields.');
}
function list(value, max, allowEmpty = false) {
  check(Array.isArray(value) && value.length <= max && (allowEmpty || value.length > 0),
    `Use a JSON array of ${allowEmpty ? '0' : '1'} to ${max} entries.`);
  return value;
}
function names(value, max) {
  list(value, max);
  check(value.every(validName) && new Set(value).size === value.length,
    'Use unique nonblank names of up to 80 characters, without outer whitespace or control characters.');
  return value;
}
function indexedRows(value, keys, validate, allowEmpty = false) {
  const rows = list(value, 200, allowEmpty);
  const byId = new Map();
  for (const row of rows) {
    exactRecord(row, keys);
    check(validName(row.id) && !byId.has(row.id), 'Each sample ID must be valid and unique within its input.');
    validate(row);
    byId.set(row.id, row);
  }
  return byId;
}
const rate = (numerator, denominator) => denominator ? round(100 * numerator / denominator) : null;
const jsonTypes = new Set(['string', 'number', 'integer', 'boolean', 'object', 'array', 'null']);
const typeOf = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
function pointerParts(pointer) {
  check(typeof pointer === 'string' && pointer.length <= 256 &&
    (pointer === '' || pointer.startsWith('/')) && !/~(?:[^01]|$)/u.test(pointer),
    'Use JSON Pointers: empty for the root, or /field/0 paths with ~0 and ~1 escapes.');
  const parts = pointer === '' ? [] : pointer.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  check(parts.length <= 16, 'JSON Pointer paths may contain at most 16 segments.');
  return parts;
}
function readPointer(value, parts) {
  let current = value;
  for (const part of parts) {
    if (current === null || typeof current !== 'object' ||
      (Array.isArray(current) && !/^(?:0|[1-9]\d*)$/u.test(part)) || !Object.hasOwn(current, part)) {
      return { present: false };
    }
    current = current[part];
  }
  return { present: true, value: current };
}

export const tools = [
  define(
    'ai-json-output-contract',
    '批量模型 JSON 输出合同核验',
    'Batch model JSON output contracts',
    '逐样本解析 JSON 文本，按 JSON Pointer 核对嵌套路径的类型与必填规则。缺失与 null 分开；不检查未声明字段、数组通配、重复 JSON 键或语义，不是完整 JSON Schema。',
    'Parse each supplied JSON output and check nested JSON Pointer paths, types and required fields. Missing differs from null. Undeclared fields, array wildcards, duplicate JSON keys and meaning are not checked; this is not full JSON Schema.',
    [
      jsonField('contract', '路径合同数组：pointer、type、required', 'Contract array: pointer, type, required', [
        { pointer: '/answer/text', type: 'string', required: true },
        { pointer: '/answer/sources', type: 'array', required: false },
      ], 12000),
      jsonField('samples', '样本数组：id 与 output（JSON 文本字符串）', 'Samples: id and output (a JSON text string)', [
        { id: 'case-1', output: '{"answer":{"text":"Ready","sources":[]}}' },
        { id: 'case-2', output: '{"answer":{"text":null}}' },
        { id: 'case-3', output: '{"answer":' },
      ]),
    ],
    (contract, samples) => {
      const paths = new Set();
      const rules = list(contract, 64).map(rule => {
        exactRecord(rule, ['pointer', 'type', 'required']);
        const parts = pointerParts(rule.pointer);
        check(!paths.has(rule.pointer) && jsonTypes.has(rule.type) && typeof rule.required === 'boolean',
          'Contract paths must be unique, types supported, and required a boolean.');
        paths.add(rule.pointer);
        return { ...rule, parts };
      });
      const rows = indexedRows(samples, ['id', 'output'], row =>
        check(typeof row.output === 'string' && row.output.length <= 12000,
          'Each output must be a JSON text string of at most 12000 characters.'));
      let parsed = 0, passed = 0, violations = 0;
      const results = [];
      for (const { id, output } of rows.values()) {
        let document;
        try { document = parseDocument(output); }
        catch {
          results.push({ id, status: 'invalid_or_unsupported_json', violationCount: null, violations: [] });
          continue;
        }
        parsed++;
        const failures = [];
        for (const rule of rules) {
          const field = readPointer(document, rule.parts);
          if (!field.present) {
            if (rule.required) failures.push({ pointer: rule.pointer, reason: 'missing_required', expectedType: rule.type });
          } else if (rule.type === 'integer' ? !Number.isSafeInteger(field.value) : typeOf(field.value) !== rule.type) {
            failures.push({ pointer: rule.pointer, reason: 'type_mismatch', expectedType: rule.type, actualType: typeOf(field.value) });
          }
        }
        violations += failures.length;
        if (!failures.length) passed++;
        results.push({ id, status: failures.length ? 'contract_failed' : 'contract_passed',
          violationCount: failures.length, violations: failures.slice(0, 8), omittedViolations: Math.max(0, failures.length - 8) });
      }
      return { sampleCount: rows.size, parsedCount: parsed, invalidOrUnsupportedJsonCount: rows.size - parsed,
        contractPassedCount: passed, contractFailedCount: parsed - passed, passPercentOfAllSamples: rate(passed, rows.size),
        totalContractViolations: violations, results,
        scope: 'Declared pointers only; integer means safe integer. Extra fields and output meaning are not validated. At most 8 violation details are shown per sample.' };
    },
  ),
  { ...define(
    'ai-paired-pass-regression',
    '固定测试集前后版本回退核对',
    'Paired pass regression on a fixed test set',
    '按明确样本 ID 清单对齐前后布尔评分，列出回退、改善、漏测及清单外结果。通过率只用两版都有结果的同一子集；评分由你提供，不推断统计显著性。',
    'Align supplied boolean grades to an explicit sample-ID list. Report regressions, improvements, missing runs and unexpected results. Compare pass rates only on the common paired subset; grades are user-supplied and no statistical significance is inferred.',
    [
      jsonField('expectedIds', '固定测试集 ID 数组', 'Fixed test-set ID array', ['case-1', 'case-2', 'case-3']),
      jsonField('before', '旧版本结果：id、pass（布尔值）', 'Before results: id, pass (boolean)', [
        { id: 'case-1', pass: true }, { id: 'case-2', pass: false }, { id: 'case-3', pass: true },
      ]),
      jsonField('after', '新版本结果：id、pass（布尔值）', 'After results: id, pass (boolean)', [
        { id: 'case-1', pass: false }, { id: 'case-2', pass: true },
      ]),
    ],
    (expectedIds, before, after) => {
      const expected = names(expectedIds, 200), expectedSet = new Set(expected);
      const readGrades = values => indexedRows(values, ['id', 'pass'], row =>
        check(typeof row.pass === 'boolean', 'Each grade must be a boolean pass value.'), true);
      const old = readGrades(before), next = readGrades(after);
      const missingBefore = expected.filter(id => !old.has(id));
      const missingAfter = expected.filter(id => !next.has(id));
      const unexpectedBefore = [...old.keys()].filter(id => !expectedSet.has(id));
      const unexpectedAfter = [...next.keys()].filter(id => !expectedSet.has(id));
      const paired = expected.filter(id => old.has(id) && next.has(id)).map(id => {
        const a = old.get(id).pass, b = next.get(id).pass;
        return { id, beforePass: a, afterPass: b,
          outcome: a ? b ? 'retained_pass' : 'regression' : b ? 'improvement' : 'retained_fail' };
      });
      const regressionIds = paired.filter(row => row.outcome === 'regression').map(row => row.id);
      const improvementIds = paired.filter(row => row.outcome === 'improvement').map(row => row.id);
      const beforePassCount = paired.filter(row => row.beforePass).length;
      const afterPassCount = paired.filter(row => row.afterPass).length;
      return { expectedCount: expected.length, pairedCount: paired.length,
        pairedCoveragePercent: rate(paired.length, expected.length),
        exactTestSetInBothRuns: !missingBefore.length && !missingAfter.length && !unexpectedBefore.length && !unexpectedAfter.length,
        missingBefore, missingAfter, unexpectedBefore, unexpectedAfter,
        beforePassCount, afterPassCount, beforePassPercent: rate(beforePassCount, paired.length),
        afterPassPercent: rate(afterPassCount, paired.length),
        changePercentagePoints: rate(afterPassCount - beforePassCount, paired.length),
        regressionCount: regressionIds.length, improvementCount: improvementIds.length, regressionIds, improvementIds, paired,
        scope: 'Pass rates use paired expected samples only. Missing and unexpected samples are excluded, never silently counted as failures. Use identical grading criteria in both runs.' };
    },
  ), searchAliases:['release rollback check','AI 回退检查','回滚前评测'] },
  define(
    'ai-multiclass-confusion',
    '多分类标签混淆与一致性统计',
    'Multiclass confusion and agreement',
    '对唯一 ID 样本的参考标签与预测标签构建混淆矩阵，计算各类精确率、召回率、F1 与 Cohen κ。类别须显式给出；参考标签由你提供，零分母返回 null，不验证标签真伪。',
    'Build a confusion matrix for uniquely identified samples with supplied reference and predicted labels. Report per-class precision, recall, F1 and Cohen kappa. Labels are explicit and user-supplied; zero denominators return null and reference truth is not verified.',
    [
      jsonField('labels', '完整类别数组（区分大小写）', 'Complete label array (case-sensitive)', ['positive', 'neutral', 'negative']),
      jsonField('samples', '样本数组：id、actual、predicted', 'Samples: id, actual, predicted', [
        { id: 'case-1', actual: 'positive', predicted: 'positive' },
        { id: 'case-2', actual: 'positive', predicted: 'neutral' },
        { id: 'case-3', actual: 'negative', predicted: 'negative' },
        { id: 'case-4', actual: 'neutral', predicted: 'negative' },
      ]),
    ],
    (labels, samples) => {
      names(labels, 30);
      const indices = new Map(labels.map((label, index) => [label, index]));
      const rows = indexedRows(samples, ['id', 'actual', 'predicted'], row =>
        check(indices.has(row.actual) && indices.has(row.predicted), 'Every actual and predicted label must occur in the label array.'));
      const matrix = labels.map(() => labels.map(() => 0));
      const mismatchIds = [];
      for (const row of rows.values()) {
        matrix[indices.get(row.actual)][indices.get(row.predicted)]++;
        if (row.actual !== row.predicted) mismatchIds.push(row.id);
      }
      const perClass = labels.map((label, index) => {
        const truePositive = matrix[index][index];
        const actualCount = matrix[index].reduce((sum, value) => sum + value, 0);
        const predictedCount = matrix.reduce((sum, row) => sum + row[index], 0);
        return { label, actualCount, predictedCount, truePositive,
          falsePositive: predictedCount - truePositive, falseNegative: actualCount - truePositive,
          precisionPercent: rate(truePositive, predictedCount), recallPercent: rate(truePositive, actualCount),
          f1Percent: rate(2 * truePositive, actualCount + predictedCount) };
      });
      const agreementCount = rows.size - mismatchIds.length;
      const expectedNumerator = perClass.reduce((sum, item) => sum + item.actualCount * item.predictedCount, 0);
      const kappaDenominator = rows.size * rows.size - expectedNumerator;
      const observedClasses = perClass.filter(item => item.actualCount + item.predictedCount > 0);
      const macroF1 = observedClasses.reduce((sum, item) =>
        sum + 200 * item.truePositive / (item.actualCount + item.predictedCount), 0) / observedClasses.length;
      return { sampleCount: rows.size, agreementCount, accuracyPercent: rate(agreementCount, rows.size),
        labels, matrix, matrixAxes: 'rows=actual, columns=predicted; both follow labels order', perClass,
        macroF1Percent: round(macroF1), macroF1LabelCount: observedClasses.length,
        cohenKappa: kappaDenominator ? round((agreementCount * rows.size - expectedNumerator) / kappaDenominator) : null,
        mismatchIds,
        scope: 'Exact case-sensitive labels. Macro F1 excludes classes absent from both actual and predicted labels. A zero denominator returns null. Agreement uses the supplied reference labels.' };
    },
  ),
];
