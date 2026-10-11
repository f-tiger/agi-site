(function (root) {
  'use strict';
  const MAX_ITEMS = 2000;
  const COLLECTION_KEY = 'dollscout-collection-v1';
  const canonicalName = value => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  // Names are official-source names in every locale. Do not use array positions,
  // translated labels or a catalogue revision as identity.
  function styleId(name) { return encodeURIComponent(canonicalName(name)); }
  function normalizeItem(item) {
    if (!item || typeof item !== 'object') throw new Error('item');
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const series = typeof item.series === 'string' ? item.series.trim() : '';
    const quantity = Number(item.quantity);
    if (!name || name.length > 120 || series.length > 120 || !['owned', 'wish'].includes(item.status) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error('item');
    const result = { name, series, status: item.status, quantity };
    if (item.seriesId !== undefined || item.styleId !== undefined) {
      if (typeof item.seriesId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.seriesId) || item.seriesId.length > 160 || typeof item.styleId !== 'string' || !item.styleId || item.styleId.length > 1440 || !/^(?:[a-z0-9.!~*'()_-]|%[0-9A-F]{2})+$/.test(item.styleId)) throw new Error('identity');
      result.seriesId = item.seriesId;
      result.styleId = item.styleId;
    }
    if (item.checklistMissing !== undefined) {
      if (item.checklistMissing !== true || !result.seriesId || result.status !== 'wish') throw new Error('identity');
      result.checklistMissing = true;
    }
    return result;
  }
  function restore(text) {
    const data = JSON.parse(text);
    if (data?.app !== 'dollscout-collection' || data.version !== 1 || !Array.isArray(data.items) || data.items.length > MAX_ITEMS) throw new Error('backup');
    return data.items.map(normalizeItem);
  }
  function backup(items) {
    if (!Array.isArray(items) || items.length > MAX_ITEMS) throw new Error('backup');
    return JSON.stringify({ app: 'dollscout-collection', version: 1, items: Array.from(items, normalizeItem) }, null, 2);
  }
  function readCollection(storage) {
    const raw = storage.getItem(COLLECTION_KEY);
    // An empty string is malformed, not a new collection.
    return { raw, items: raw === null ? [] : restore(raw) };
  }
  function writeCollection(storage, items, expectedRaw, replaceInvalid = false) {
    const raw = backup(items);
    const normalized = restore(raw);
    const current = storage.getItem(COLLECTION_KEY);
    if (current !== expectedRaw) throw new Error('conflict');
    if (!replaceInvalid && current !== null) restore(current);
    storage.setItem(COLLECTION_KEY, raw);
    return { raw, items: normalized };
  }
  function seriesMatch(item, figure) {
    if (item.seriesId) return item.seriesId === figure.seriesId && item.styleId === figure.styleId;
    // Conservative migration: only the same official name AND series title.
    // Ambiguous/manual notes and similarly named figures are never merged.
    return canonicalName(item.name) === canonicalName(figure.name) && canonicalName(item.series) === canonicalName(figure.series);
  }
  function seriesOwned(items, figure) {
    return items.some(item => item.status === 'owned' && seriesMatch(item, figure));
  }
  function setSeriesOwned(items, input, owned) {
    if (typeof owned !== 'boolean') throw new Error('owned');
    const figure = normalizeItem({ ...input, status: 'owned', quantity: 1 });
    if (!figure.seriesId) throw new Error('identity');
    const before = items.map(normalizeItem);
    if (before.length > MAX_ITEMS) throw new Error('backup');
    const wasOwned = seriesOwned(before, figure);
    const next = before.map(item => {
      if (!seriesMatch(item, figure)) return item;
      if (!owned && item.status === 'owned') {
        return { ...item, seriesId: figure.seriesId, styleId: figure.styleId, status: 'wish', checklistMissing: true };
      }
      if (owned && item.checklistMissing) {
        const { checklistMissing, ...rest } = item;
        return { ...rest, status: 'owned' };
      }
      if (item.status === 'owned') return { ...item, seriesId: figure.seriesId, styleId: figure.styleId };
      return item;
    });
    // Ordinary wishlist entries retain both their status and quantity.
    if (owned && !seriesOwned(next, figure)) next.push(figure);
    if (next.length > MAX_ITEMS) throw new Error('limit');
    return { items: next, changed: owned !== wasOwned };
  }
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
  const api = { MAX_ITEMS, COLLECTION_KEY, normalizeItem, restore, backup, csv, fit, styleId, readCollection, writeCollection, seriesMatch, seriesOwned, setSeriesOwned };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DSCollector = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
