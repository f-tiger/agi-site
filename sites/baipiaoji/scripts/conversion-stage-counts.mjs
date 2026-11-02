import assert from 'node:assert/strict';

// Conversion stages contain both scalar counts and grouped action counts.
// Validate every leaf; unreadable/null groups must never become zero.
export function assertCountTree(value, path = 'counts') {
  if (typeof value === 'number') {
    assert.ok(Number.isInteger(value) && value >= 0, `${path} must be a non-negative integer`);
    return;
  }
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${path} must be a count or count group`);
  const entries = Object.entries(value);
  assert.ok(entries.length > 0, `${path} must not be an empty count group`);
  for (const [key, child] of entries) assertCountTree(child, `${path}.${key}`);
}
