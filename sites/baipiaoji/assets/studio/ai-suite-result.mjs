const MAX_ROWS = 24;
const MAX_COLUMNS = 12;
const MAX_VALUES = 240;
const MAX_DEPTH = 4;
const MAX_TEXT = 3600;
const MAX_CELL_TEXT = 160;

const zhLabels = {
  result: '计算结果', count: '数量', offset: '偏移量', rows: '行', text: '文本', key: '键',
  name: '名称', value: '值', inputUnit: '输入单位', equivalents: '换算结果', tag: '标签',
  groups: '分组', label: '标签', score: '分数', checked: '已检查', failedRows: '未通过的行',
  passed: '通过', items: '条目', type: '类型', missing: '缺少', total: '总计', columns: '列',
  volumeM3: '体积（m³）', areaM2: '面积（m²）', line: '行', row: '行',
  valid: '有效', title: '标题', matches: '匹配结果', object: '对象', document: '文档', cells: '单元格',
  mode: '模式', removed: '已移除', truncated: '已截断', counts: '计数', target: '目标',
  date: '日期', start: '起点', characters: '字符数', source: '来源', path: '路径',
  code: '代码', length: '长度', range: '范围', qty: '数量', scope: '范围', lines: '行',
  mean: '平均值', min: '最小值', fields: '字段', end: '终点', description: '描述',
  conflicts: '冲突', values: '值', ranges: '范围', words: '词', added: '新增',
  matched: '匹配数量', max: '最大值', hops: '跳转次数', version: '版本', slope: '斜率',
  duplicates: '重复项', first: '首项', number: '数值', mixed: '混合', left: '左侧', right: '右侧',
  address: '地址', index: '索引', expected: '预期值', author: '作者', seconds: '秒',
  port: '端口', bytes: '字节数', distinct: '不同值数量', blank: '空白', median: '中位数',
  pointer: '指针', types: '类型', string: '字符串', records: '记录', fits: '符合尺寸',
  links: '链接', width: '宽度', extra: '多余项', fragment: '片段', entries: '条目',
  canonical: '规范值', invalid: '无效项', preview: '预览', frames: '帧数', gain: '增益',
  lower: '下界', upper: '上界', fraction: '比例', probability: '概率', intercept: '截距',
  column: '列', unexpected: '意外结果', dates: '日期', sentences: '句子', paths: '路径',
  flags: '标记', properties: '属性', required: '必需', checksum: '校验和',
  retained: '保留', before: '之前', after: '之后', match: '匹配', rowCount: '行数',
  group: '分组', category: '类别', found: '已找到', equal: '相等', present: '存在',
  period: '周期', limit: '上限', remaining: '剩余', destination: '目标', ratio: '比率',
  totalTerms: '总词数', distinctTerms: '不同词数量', term: '词项', top: '最高频词项',
  workingCapital: '营运资金', currentRatio: '流动比率', quickAssets: '速动资产',
  quickRatio: '速动比率', uncovered: '资金缺口', minimumUnits: '最低销量',
  grossProfit: '毛利润', marginPercent: '毛利率（%）', markupPercent: '加价率（%）',
  revenueAtMinimumUnits: '最低销量对应收入', contributionPerUnit: '单位边际贡献',
  monthlyNetBurn: '月净消耗', runwayMonths: '现金可支撑月数', burnsCash: '消耗现金',
  returnOnEquityPercent: '净资产收益率（%）', netMarginPercent: '净利率（%）',
  assetTurnover: '资产周转率', equityMultiplier: '权益乘数', clusters: '字素簇',
  unused: '未使用', operations: '操作', notices: '说明', assumptions: '假设',
};

const acronyms = new Set(['api','ascii','cac','cpu','csv','css','dom','ebit','ebitda','html','http','https','id','ics','iso','json','ld','ltv','nfc','nfd','nfkc','nfkd','pdf','roi','srt','tls','ui','url','utf','utc','uuid','xml']);

function humanize(key) {
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) return key;
  const parts = key.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[-_\s]+/);
  return parts.map((part, index) => {
    const lower = part.toLowerCase();
    if (acronyms.has(lower)) return lower.toUpperCase();
    if (part === part.toUpperCase()) return part;
    return index === 0 ? part[0].toUpperCase() + part.slice(1) : lower;
  }).join(' ');
}

function isScalar(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function has(obj, key) {
  return obj != null && Object.hasOwn(obj, key);
}
function clip(text, max) {
  const end = text.charCodeAt(max - 1);
  const stop = end >= 0xd800 && end <= 0xdbff ? max - 1 : max;
  return text.length > max ? text.slice(0,stop) : text;
}

export function renderSuiteResult(target, value, {lang = 'en', labels} = {}) {
  target.replaceChildren();
  if (!isScalar(value) && !isRecord(value) && !Array.isArray(value)) return false;

  const doc = target.ownerDocument;
  const zh = lang.toLowerCase().startsWith('zh');
  const say = (cn, en) => zh ? cn : en;
  const incomplete = say('在 JSON 中查看完整结果。', 'See JSON for the full result.');
  let valuesLeft = MAX_VALUES;

  function el(tag, className, content) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function note(container, message = incomplete) {
    container.append(el('p','suite-result-note',message));
  }
  function label(key, path, literal) {
    const scoped = path.join('.');
    const options = has(labels,scoped) ? labels[scoped] : has(labels,key) ? labels[key] : null;
    const custom = typeof options === 'string' ? options : options?.[zh ? 'zh' : 'en'];
    if (custom) return custom;
    if (literal) return key === '' ? say('（空名称）','(empty name)') : key;
    if (zh && has(zhLabels,key)) return zhLabels[key];
    return humanize(key);
  }
  function take() {
    if (valuesLeft < 1) return false;
    valuesLeft--;
    return true;
  }
  function shortValue(value, max = MAX_TEXT) {
    if (value === null) return el('span','suite-result-empty',say('空值', 'Null'));
    if (typeof value === 'boolean') {
      return el('span','suite-result-boolean',value ? say('是','Yes') : say('否','No'));
    }
    if (typeof value === 'number') {
      return el('span','suite-result-number',Object.is(value,-0) ? '-0' : String(value));
    }
    if (value === '') return el('span','suite-result-empty',say('空文本','Empty text'));
    const text = clip(value,max);
    const node = el('span','suite-result-inline',text.length === value.length ? text : text + '…');
    node.dir = 'auto';
    if (text.length < value.length) node.setAttribute('aria-label',text + '… ' + incomplete);
    return node;
  }

  function appendText(container, value) {
    const text = clip(value,MAX_TEXT);
    const pre = el('pre','suite-result-text',text);
    pre.tabIndex = 0;
    pre.dir = 'auto';
    container.append(pre);
    if (!value.trim()) note(container,say('结果只包含空白字符。','The result contains only whitespace.'));
    if (text.length < value.length) note(container,incomplete);
  }
  function appendMetrics(container, entries, parent, literal) {
    const metrics = el('dl','suite-result-grid');
    for (const [key,val] of entries) {
      if (!take()) break;
      const item = el('div','suite-result-metric');
      const name = el('dt','',label(key,[...parent,key],literal));
      if (!literal && name.textContent !== key) name.title = key;
      const def = el('dd','');
      def.append(shortValue(val));
      item.append(name,def);
      metrics.append(item);
    }
    if (metrics.childElementCount) container.append(metrics);
  }
  function isBlock(val) {
    return !isScalar(val) || (typeof val === 'string' && (val.length > 72 || /[\n\r\t]/.test(val)));
  }
  function appendRecord(container, record, path, depth, literal = false) {
    const entries = Object.entries(record).filter(([,val])=>isScalar(val)||isRecord(val)||Array.isArray(val));
    if (!entries.length) {
      note(container,say('没有返回字段。','No fields returned.'));
      return;
    }
    let cells = [];
    let count = 0;
    const flush = () => {
      appendMetrics(container,cells,path,literal);
      cells = [];
    };
    for (const [key,val] of entries) {
      if (count === MAX_ROWS || valuesLeft <= cells.length) break;
      count++;
      if (!isBlock(val)) {
        cells.push([key,val]);
        continue;
      }
      flush();
      if (!take()) break;
      const next = [...path,key];
      const block = el('div','suite-result-branch');
      block.append(el('h' + Math.min(3 + depth,6),'suite-result-name',label(key,next,literal)));
      const columns = key === 'rows' && Array.isArray(record.columns) ? record.columns : null;
      appendValue(block,val,next,depth + 1,columns,literal || ['document','object'].includes(key));
      container.append(block);
    }
    flush();
    if (count < entries.length) note(container,incomplete);
  }

  function appendTable(container, items, path, matrix, columns, literal) {
    const firstRows = items.slice(0,MAX_ROWS);
    const keys = matrix
      ? Array.from({length:Math.min(firstRows[0].length,MAX_COLUMNS)},(_, index)=>index)
      : [...new Set(firstRows.flatMap(row=>Object.keys(row)))];
    const columnSet = new Set(keys);
    const preferred = (columns || []).filter(key=>typeof key === 'string' && columnSet.has(key));
    const order = preferred.length ? [...new Set([...preferred,...keys])] : keys;
    const visibleKeys = order.slice(0,MAX_COLUMNS);
    if (!visibleKeys.length) {
      note(container,say('这些行没有字段。','These rows have no fields.'));
      return;
    }
    const wrap = el('div','suite-result-table-wrap');
    wrap.tabIndex = 0;
    wrap.setAttribute('role','region');
    wrap.setAttribute('aria-label',path.length ? label(path.at(-1),path,literal) : say('计算结果','Result'));
    const table = el('table','suite-result-table');
    const head = table.createTHead().insertRow();
    const body = table.createTBody();
    const rowHeader = el('th','','#');
    rowHeader.setAttribute('aria-label',say('预览中的行序号','Row number in preview'));
    rowHeader.scope = 'col';
    head.append(rowHeader);
    let clippedText = false;
    for (const key of visibleKeys) {
      const name = matrix ? say(`第 ${key + 1} 列`,`Column ${key + 1}`) : label(key,[...path,key],literal || !!preferred.length);
      if (name.length > MAX_CELL_TEXT) clippedText = true;
      const header = el('th','',clip(name,MAX_CELL_TEXT) + (name.length > MAX_CELL_TEXT ? '…' : ''));
      header.scope = 'col';
      if (name !== key && !matrix) header.title = key;
      head.append(header);
    }
    for (const [index,row] of firstRows.entries()) {
      if (valuesLeft < visibleKeys.length) break;
      const tr = body.insertRow();
      const number = el('th','suite-result-table-row',index + 1);
      number.scope = 'row';
      tr.append(number);
      for (const key of visibleKeys) {
        take();
        const cell = tr.insertCell();
        if (!has(row,key)) {
          const missing = el('span','suite-result-empty','—');
          missing.setAttribute('aria-label',say('缺少字段','Missing field'));
          cell.append(missing);
        } else if (isScalar(row[key])) {
          if (typeof row[key] === 'string' && row[key].length > MAX_CELL_TEXT) clippedText = true;
          if (typeof row[key] === 'number') cell.classList.add('suite-result-numeric-cell');
          cell.append(shortValue(row[key],MAX_CELL_TEXT));
        } else {
          // Keep the row in the table when it contains an embedded record.
          // Rendering the embedded value as text keeps its keys and ordering intact.
          const json = JSON.stringify(row[key]) ?? '';
          if (json.length > MAX_CELL_TEXT) clippedText = true;
          cell.append(shortValue(json,MAX_CELL_TEXT));
        }
      }
    }
    wrap.append(table);
    container.append(wrap);
    const totalColumns = matrix ? firstRows[0].length : order.length;
    if (body.rows.length < items.length || visibleKeys.length < totalColumns) {
      const rows = body.rows.length;
      const cols = visibleKeys.length;
      note(container,say(`预览 ${rows} 行、${cols} 列。`,`Showing ${rows} rows and ${cols} columns.`) + ' ' + incomplete);
    } else if (clippedText) {
      note(container,incomplete);
    }
  }

  function appendArray(container, items, path, depth, columns, literal) {
    if (!items.length) {
      note(container,say('共 0 项。','0 items.'));
      return;
    }
    const width = Array.isArray(items[0]) ? items[0].length : 0;
    const isMatrix = width > 0 && items.every(row=>Array.isArray(row) && row.length === width && row.every(isScalar));
    if (isMatrix || items.every(isRecord)) {
      appendTable(container,items,path,isMatrix,columns,literal || ['rows','records','data'].includes(path.at(-1)));
      return;
    }
    const list = el('ol','suite-result-list');
    for (const item of items.slice(0,MAX_ROWS)) {
      if (!take()) break;
      const li = el('li','');
      if (isScalar(item)) li.append(shortValue(item,MAX_TEXT));
      else appendValue(li,item,path,depth + 1,null,literal);
      list.append(li);
    }
    container.append(list);
    if (list.childElementCount < items.length) note(container,incomplete);
  }
  function appendValue(container, value, path, depth, columns, literal) {
    if (typeof value === 'string' && isBlock(value)) {
      appendText(container,value);
    } else if (isScalar(value)) {
      container.append(shortValue(value));
    } else if (depth > MAX_DEPTH) {
      note(container,incomplete);
    } else if (Array.isArray(value)) {
      appendArray(container,value,path,depth,columns,literal);
    } else if (isRecord(value)) {
      appendRecord(container,value,path,depth,literal);
    }
  }

  const view = el('div','suite-result-view');
  appendValue(view,value,[],0,null,false);
  target.append(view);
  return true;
}
