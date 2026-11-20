// Shared contracts for scalar measurement tasks. Dimensions are explicit in the field labels.
export const num = (key, zh, en, sample, min = 1e-9, max = 1e9) =>
  ({key, label: {zh, en}, sample, type: 'number', min, max});
export const count = (key, zh, en, sample, min = 1, max = 1000000) =>
  ({...num(key, zh, en, sample, min, max), type: 'integer'});
export function requireValue(condition, message) {
  if (!condition) throw Error(message);
}
export function calc(id, zh, en, zhHelp, enHelp, fields, evaluate) {
  return {
    id, title: {zh, en}, description: {zh: zhHelp, en: enHelp},
    inputs: fields.map(({sample, ...field}) => field),
    example: Object.fromEntries(fields.map(field => [field.key, field.sample])),
    run(args) {
      const values = fields.map(field => {
        const value = args?.[field.key];
        requireValue(Number.isFinite(value) && value >= field.min && value <= field.max &&
          (field.type !== 'integer' || Number.isInteger(value)), 'Invalid numeric input: ' + field.key);
        return value;
      });
      const result = evaluate(...values);
      return Object.fromEntries(Object.entries(result).map(([key, value]) => {
        requireValue(typeof value !== 'number' || Number.isFinite(value), 'Result outside numeric range.');
        return [key, typeof value === 'number' && !Number.isSafeInteger(value) ? Number(value.toPrecision(12)) : value];
      }));
    },
  };
}
export const rad = degrees => degrees * Math.PI / 180;
export const deg = radians => radians * 180 / Math.PI;
export const posLength = (key, zh, en, sample) => num(key, zh + '（米）', en + ' (m)', sample);

// Decimal measurements can land one floating-point unit either side of an exact fit.
function snapCount(value) {
  requireValue(Math.abs(value) <= Number.MAX_SAFE_INTEGER, 'Count exceeds the supported exact integer range.');
  const nearest = Math.round(value);
  return Math.abs(value-nearest) <= Math.min(1e-7, 4*Number.EPSILON*Math.max(1, Math.abs(value))) ? nearest : value;
}
export const wholeItems = value => Math.floor(snapCount(value));
export const neededItems = value => Math.ceil(snapCount(value));
