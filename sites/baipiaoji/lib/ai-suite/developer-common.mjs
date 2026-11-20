export function requireValue(ok, message) {
  if (!ok) throw Error(message);
}
export function string(key, zh, en, sample, maxLength = 4096, parse = (value) => value) {
  return { key, label: { zh, en }, type: 'string', multiline: maxLength > 256, maxLength, sample, parse };
}
export function number(key, zh, en, sample, min, max, integer = false) {
  return { key, label: { zh, en }, type: integer ? 'integer' : 'number', min, max, sample };
}
export function define(id, zh, en, cnDescription, enDescription, fields, calculate) {
  return {
    id,
    title: { zh, en },
    description: { zh: cnDescription, en: enDescription },
    inputs: fields.map(({ sample, parse, ...input }) => input),
    example: Object.fromEntries(fields.map((field) => [field.key, field.sample])),
    run(args) {
      const values = fields.map((field) => {
        const value = args[field.key];
        if (field.type === 'string') {
          requireValue(
            typeof value === 'string' && value.length <= field.maxLength,
            'Text exceeds the input limit or has the wrong type.',
          );
        } else {
          requireValue(
            Number.isFinite(value) &&
              value >= field.min &&
              value <= field.max &&
              (field.type !== 'integer' || Number.isSafeInteger(value)),
            'Number is outside the accepted range.',
          );
        }
        return field.parse ? field.parse(value) : value;
      });
      const result = calculate(...values);
      return typeof result === 'object' && result !== null && !Array.isArray(result) ? result : { result };
    },
  };
}
// Limit recursive walks and output growth before applying document operations.
export function json(text) {
  const doc = JSON.parse(text);
  let count = 0;
  const inspect = (value, depth) => {
    requireValue(++count <= 500 && depth <= 16, 'Use at most 500 JSON nodes and 16 levels.');
    if (value && typeof value === 'object') Object.values(value).forEach((item) => inspect(item, depth + 1));
    if (typeof value === 'number') requireValue(Number.isFinite(value), 'JSON numbers must be finite.');
  };
  inspect(doc, 0);
  return doc;
}
export const record = (item) => item !== null && typeof item === 'object' && !Array.isArray(item);
export const sortText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!record(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(sortText)
      .map((key) => [key, stable(value[key])]),
  );
}
export const round = (value) => Number(value.toFixed(8));
