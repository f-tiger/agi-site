// Validate the bounded JSON Schema subset used by our public MCP contract.
// Keep arrays distinct from objects; never treat inherited keys as schema fields.
export function matchesInputSchema(value, schema, depth = 0) {
 if (!schema || depth > 6) return false;
 if (schema.type === 'object') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const properties = schema.properties || {};
  if ((schema.required || []).some(key => !Object.hasOwn(value, key))) return false;
  return Object.entries(value).every(([key, item]) => Object.hasOwn(properties, key) && matchesInputSchema(item, properties[key], depth + 1));
 }
 if (schema.type === 'array') {
  return Array.isArray(value) && value.length >= (schema.minItems ?? 0) && value.length <= schema.maxItems && value.every(item => matchesInputSchema(item, schema.items, depth + 1));
 }
 if (schema.type === 'integer' ? !Number.isInteger(value) : typeof value !== schema.type) return false;
 if (schema.enum && !schema.enum.includes(value)) return false;
 if (typeof value === 'string') {
  const length = [...value].length;
  return length >= (schema.minLength ?? 0) && length <= (schema.maxLength ?? Infinity);
 }
 if (typeof value === 'number') return Number.isFinite(value) && (schema.minimum === undefined || value >= schema.minimum) && (schema.exclusiveMinimum === undefined || value > schema.exclusiveMinimum) && (schema.maximum === undefined || value <= schema.maximum);
 return typeof value === 'boolean';
}
