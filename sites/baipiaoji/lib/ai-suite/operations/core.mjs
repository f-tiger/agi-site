// All amounts within a call use one currency. Percent inputs are percentage points.
const MAX = 1e10;
export const number = (zh, en, example, min = 0, max = MAX) => ({
  label: { zh, en },
  example,
  type: 'number',
  min,
  max,
});
export const count = (zh, en, example, min = 0, max = 1e8) => ({
  ...number(zh, en, example, min, max),
  type: 'integer',
});
export const percent = (zh, en, example, min = 0, max = 100) =>
  number(zh + '（%）', en + ' (%)', example, min, max);
export function requireThat(condition, message) {
  if (!condition) throw Error(message);
}
export function divide(value, base) {
  requireThat(base > 0, 'A positive denominator is required.');
  return value / base;
}
export function subset(value, total) {
  requireThat(value >= 0 && value <= total, 'The component must be between zero and its total.');
  return value;
}
export const share = (part, total) => 100 * divide(subset(part, total), total);

export function toolBuilder(fields) {
  return (id, zh, en, zhDescription, enDescription, keys, calculate) => {
    const inputs = [],
      example = {};
    for (const key of keys.split(' ')) {
      const { example: sample, ...definition } = fields[key];
      inputs.push({ key, ...definition });
      example[key] = sample;
    }
    return {
      id,
      title: { zh, en },
      description: { zh: zhDescription, en: enDescription },
      inputs,
      example,
      run(args) {
        const values = inputs.map((input) => {
          const value = args?.[input.key];
          requireThat(
            Number.isFinite(value) &&
              value >= input.min &&
              value <= input.max &&
              (input.type !== 'integer' || Number.isSafeInteger(value)),
            'Invalid ' + input.label.en,
          );
          return value;
        });
        const result = calculate(...values);
        return Object.fromEntries(
          Object.entries(result).map(([key, value]) => {
            if (typeof value !== 'number') return [key, value];
            requireThat(Number.isFinite(value), 'Result outside the supported numeric range.');
            return [key, Number(value.toPrecision(12))];
          }),
        );
      },
    };
  };
}
