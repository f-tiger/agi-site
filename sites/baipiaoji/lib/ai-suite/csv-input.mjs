export function readCsv(input) {
  const text = input.replace(/^\uFEFF/u, '');
  const rows = [];
  let row = [];
  let field = '';
  let state = 'start';

  function finishField() {
    row.push(field);
    if (row.length > 32) throw Error('Use at most 32 CSV columns.');
    field = '';
    state = 'start';
  }

  function finishRecord() {
    finishField();
    rows.push(row);
    if (rows.length > 301) throw Error('Use at most 300 CSV data rows.');
    row = [];
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (state === 'quoted') {
      if (char !== '"') field += char;
      else if (text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else state = 'closed';
      continue;
    }
    if (char === ',') finishField();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      finishRecord();
    } else if (char === '"' && state === 'start') state = 'quoted';
    else {
      if (state === 'closed' || char === '"') throw Error('CSV contains invalid quoting.');
      field += char;
      state = 'plain';
    }
  }
  if (state === 'quoted') throw Error('CSV contains an unclosed quoted field.');
  if (row.length || state !== 'start') finishRecord();
  if (!rows.length) throw Error('CSV requires a header row.');

  const columns = rows.shift().map(name => name.trim());
  if (columns.some(name => !name || name.length > 100) || new Set(columns).size !== columns.length) {
    throw Error('CSV headers must be unique, nonempty and at most 100 characters.');
  }
  if (rows.some(record => record.length !== columns.length)) throw Error('CSV rows must match the header width.');
  return { columns, rows };
}

export function requireColumn(columns, column) {
  const index = columns.indexOf(column);
  if (index === -1) throw Error('The selected column is missing from the CSV header.');
  return index;
}
