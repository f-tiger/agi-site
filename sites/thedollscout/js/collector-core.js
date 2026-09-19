(function (root) {
  'use strict';
  const MAX_ITEMS = 2000;
  function normalizeItem(item) {
    if (!item || typeof item !== 'object') throw new Error('item');
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const series = typeof item.series === 'string' ? item.series.trim() : '';
    const quantity = Number(item.quantity);
    if (!name || name.length > 120 || series.length > 120 || !['owned', 'wish'].includes(item.status) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error('item');
    return { name, series, status: item.status, quantity };
  }
  function restore(text) {
    const data = JSON.parse(text);
    if (data?.app !== 'dollscout-collection' || data.version !== 1 || !Array.isArray(data.items) || data.items.length > MAX_ITEMS) throw new Error('backup');
    return data.items.map(normalizeItem);
  }
  function backup(items) { return JSON.stringify({ app: 'dollscout-collection', version: 1, items: items.map(normalizeItem) }, null, 2); }
  function csv(items) {
    const escape = value => '"' + (/^[\s]*[=+@-]/.test(String(value)) ? "'" : '') + String(value).replace(/"/g, '""') + '"';
    return '\ufeff' + ['Name,Series,Status,Quantity', ...items.map(normalizeItem).map(i => [i.name, i.series, i.status, i.quantity].map(escape).join(','))].join('\r\n');
  }
  function fit(input) {
    const names = ['width', 'depth', 'height', 'itemWidth', 'itemDepth', 'itemHeight'];
    const values = Object.fromEntries(names.map(k => [k, Number(input[k])]));
    const gap = Number(input.gap);
    if (names.some(k => !Number.isFinite(values[k]) || values[k] <= 0 || values[k] > 100000) || !Number.isFinite(gap) || gap < 0 || gap > 100000) throw new Error('dimensions');
    const {width, depth, height, itemWidth, itemDepth, itemHeight} = values;
    function layout(w, d, rotated) {
      const columns = Math.floor((width + gap) / (w + gap) + 1e-9);
      const rows = Math.floor((depth + gap) / (d + gap) + 1e-9);
      const count = itemHeight <= height + 1e-9 ? columns * rows : 0;
      if (!Number.isSafeInteger(count)) throw new Error('dimensions');
      return {count, columns: count ? columns : 0, rows: count ? rows : 0, rotated, width: w, depth: d};
    }
    const normal = layout(itemWidth, itemDepth, false);
    const rotated = layout(itemDepth, itemWidth, true);
    return input.rotate && rotated.count > normal.count ? rotated : normal;
  }
  const api = { MAX_ITEMS, normalizeItem, restore, backup, csv, fit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DSCollector = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
