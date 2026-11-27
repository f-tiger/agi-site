import compliance from './compliance.mjs';
import customs from './customs.mjs';
import tax from './tax.mjs';
import fx from './fx.mjs';
import operations from './operations.mjs';

export const tradeGroups = [
  {id:'compliance', label:['合规','Compliance'], tools:compliance},
  {id:'customs', label:['关务','Customs'], tools:customs},
  {id:'tax', label:['税务与出口退税','Tax and export refunds'], tools:tax},
  {id:'fx', label:['外汇与收款','FX and settlement'], tools:fx},
  {id:'operations', label:['单证与物流','Documents and logistics'], tools:operations},
];

const toolDirectory = new Map(tradeGroups.flatMap(group => group.tools.map(tool => [tool.id, tool])));
export const getTool = id => toolDirectory.get(id);

const numericTypes = new Set(['number','signed','percent','integer']);
const choices = new Set(['yes','no','unknown']);
const maxAmount = 1e12;

export function inputLimits(type) {
  if (!numericTypes.has(type)) return null;
  return {min:type === 'signed' ? -maxAmount : 0, max:type === 'percent' ? 100 : maxAmount, step:type === 'integer' ? '1' : 'any'};
}

function transformInput(value, type) {
  const limits = inputLimits(type);
  if (limits) {
    const numeric = typeof value === 'string' && /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) ? Number(value) : value;
    if (!Number.isFinite(numeric) || numeric < limits.min || numeric > limits.max || (type === 'integer' && !Number.isInteger(numeric))) {
      throw new RangeError('invalid_number');
    }
    return numeric;
  }
  if (type === 'choice' && choices.has(value)) return value;
  if (type === 'text' && typeof value === 'string' && value.trim() && value.trim().length <= 160 && !/[\u0000-\u001f\u007f]/.test(value)) {
    return value.trim();
  }
  if (type === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const timestamp = Date.parse(value+'T00:00:00.000Z');
    if (Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10) === value) return value;
  }
  throw new RangeError('invalid_input');
}

export function matchesWorkbenchExample(tool, input) {
  return tool.inputs.every(([key,type,,,example]) => transformInput(input[key],type) === transformInput(example,type));
}

function validLabel(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 1000;
}

export function evaluateTool(id, input) {
  const tool = getTool(id);
  if (!tool || !input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== tool.inputs.length) {
    throw new RangeError('invalid_tool_input');
  }
  const values = Object.fromEntries(tool.inputs.map(([key,type]) => {
    if (!Object.hasOwn(input,key)) throw new RangeError('missing_input');
    return [key,transformInput(input[key],type)];
  }));
  const rows = tool.run(values);
  if (!Array.isArray(rows) || !rows.length || rows.length > 30) throw new RangeError('invalid_result');
  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== 3 || !validLabel(row[0]) || !validLabel(row[1])) throw new RangeError('invalid_result');
    const value = row[2];
    if (!Number.isFinite(value) && !validLabel(value) && !(Array.isArray(value) && value.length === 2 && value.every(validLabel))) {
      throw new RangeError('invalid_result');
    }
  }
  return rows;
}
