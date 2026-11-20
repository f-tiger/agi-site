export const field = (key, zh, en, sample, maxLength = 6000) => ({
  key,
  label: { zh, en },
  sample,
  type: 'string',
  maxLength,
  multiline: maxLength > 300,
});
export const whole = (key, zh, en, sample, min, max) => ({
  key,
  label: { zh, en },
  sample,
  type: 'integer',
  min,
  max,
});
export const source = (sample) => field('text', '原文', 'Source text', sample);
export function tool(id, zh, en, zhDescription, enDescription, fields, execute) {
  return {
    id,
    title: { zh, en },
    description: { zh: zhDescription, en: enDescription },
    inputs: fields.map(({ sample, ...rest }) => rest),
    example: Object.fromEntries(fields.map((f) => [f.key, f.sample])),
    run(args) {
      for (const f of fields) {
        const v = args?.[f.key];
        if (f.type === 'string' && (typeof v !== 'string' || !v.trim() || v.length > f.maxLength))
          throw Error('Provide nonblank text within the specified length.');
        if (f.type === 'integer' && (!Number.isSafeInteger(v) || v < f.min || v > f.max))
          throw Error('Provide a whole number in the specified range.');
      }
      return execute(args);
    },
  };
}
export const splitLines = (s) => s.split(/\r\n|[\r\n]/u);
export const splitWords = (s) => s.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu) || [];
export const splitParas = (s) =>
  s
    .trim()
    .split(/(?:\r?\n[ \t]*){2,}/u)
    .map((x) => x.trim())
    .filter(Boolean);
export function html(s) {
  if (/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/u.test(s))
    throw Error('Text contains a character unsupported by XML markup.');
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
export const htmlText = (s) =>
  String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
export function webUrl(s) {
  const u = new URL(s);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password)
    throw Error('Use a public HTTP or HTTPS URL without embedded credentials.');
  return u.href;
}
export const unique = (a) => [...new Set(a)];
export function tally(items) {
  const counts = new Map();
  for (const x of items) counts.set(x, (counts.get(x) || 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
}
export const occurrences = (s, regex) =>
  [...s.matchAll(regex)].slice(0, 100).map((m) => ({ text: m[0], offset: m.index }));
export function parseRows(s, columns) {
  const rows = splitLines(s)
    .filter((r) => r.trim())
    .map((r) => r.split('|').map((c) => c.trim()));
  if (
    !rows.length ||
    rows.length > 100 ||
    rows.some((row) => row.length !== columns || row.some((c) => !c))
  )
    throw Error('Use up to 100 nonblank pipe-separated rows with the indicated number of fields.');
  return rows;
}
