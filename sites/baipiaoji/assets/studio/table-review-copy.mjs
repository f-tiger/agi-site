export const ERRORS = {
  "每份 CSV 最多 1,000,000 个字符。": "Each CSV supports up to 1,000,000 characters.",
  "请提供有表头和数据行的 CSV。": "Provide CSV with a header and at least one data row.",
  "CSV 引号位置不正确，请用双引号包住完整字段。": "Invalid CSV quote: wrap the entire field in double quotes.",
  "CSV 结束引号后存在额外字符。": "Extra characters follow a closing CSV quote.",
  "最多 2,000 行、60 列。": "Up to 2,000 rows and 60 columns are supported.",
  "CSV 引号没有闭合。": "A CSV quoted field is not closed.",
  "请至少提供一行数据。": "Provide at least one data row.",
  "表头不能为空或重复。": "Column names must be nonempty and unique.",
  "存在列数与表头不同的数据行。": "A data row has a different number of columns from the header.",
  "两份表格必须包含选定的唯一编号列。": "Both tables must contain the selected unique ID column.",
  "可改写列必须属于原表，且不能包含唯一编号列。": "Editable columns must belong to the source and cannot include the ID column.",
  "两份表格的列名必须一致；列顺序可以不同。": "Both tables must have the same column names; column order may differ.",
  "表头含疑似公式，请先修正。": "A column name looks like a spreadsheet formula. Change it to plain text first."
};
export function errorText(text,lang) {
  if(lang==='zh')return text;
  if(ERRORS[text])return ERRORS[text];
  return text.replace(/^原表存在空白行标识。$/, 'The source has an empty row ID.')
    .replace(/^改写表存在空白行标识。$/, 'The draft has an empty row ID.')
    .replace(/^原表行标识重复：/, 'Duplicate source ID: ')
    .replace(/^改写表行标识重复：/, 'Duplicate draft ID: ')
    .replace(/^改写表缺少编号：/, 'Missing draft ID: ')
    .replace(/^改写表出现未知编号：/, 'Unknown draft ID: ')
    .replace(/^编号 (.*?) 的「(.*?)」可能被表格软件作为公式执行，请先改成明确的纯文本。$/s, 'Row $1, column $2 may execute as a spreadsheet formula. Use plain text first.');
}
export const DEMO_SOURCE_ZH='记录编号,项目名称,人数,预算元,说明\n001,春季活动,12,1990.00,办公室活动\n002,培训材料,8,350.00,内部资料';
export const DEMO_DRAFT_ZH='记录编号,项目名称,人数,预算元,说明\n002,Training materials,8,350.00,Internal materials\n001,Spring event,120,19900.00,Office event';
export const DEMO_SOURCE_EN='id,title,people,budget,note\n001,Spring event,12,1990.00,An office event\n002,Training materials,8,350.00,Internal materials';
export const DEMO_DRAFT_EN='id,title,people,budget,note\n002,Training resources,8,350.00,Resources for our team\n001,Team spring event,120,19900.00,An event for colleagues';
