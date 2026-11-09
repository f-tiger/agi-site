import assert from 'node:assert/strict';
import {hasPlaceholderText} from '../lib/placeholder-text.mjs';

// The Nov8 registry import produced this valid repository link on both MCP
// category pages. A name containing a token is not an unresolved value.
const repository = 'https://github.com/codeundefinedhq/careerrift';
for (const label of ['仓库', 'repo']) {
  assert.equal(hasPlaceholderText(`<a href="${repository}">${label}</a>`), false);
}
assert.equal(hasPlaceholderText('<p>codeundefinedhq</p>'), false);

// Keep missing values blocked in visible copy, URLs, attributes and JSON-LD;
// do not exempt source links or an entire directory from the release gate.
for (const html of [
  '<p>undefined</p>', '<p>价格undefined元</p>',
  '<a href="undefined">repo</a>', '<img src="/assets/undefined.png">',
  '<a href="https://example.com/?name=undefined">repo</a>',
  '<script type="application/ld+json">{"name":"undefined"}</script>',
  '<p>暂无</p>', '<p>待补</p>', '<p>TBD</p>', '<p>TODO</p>',
  '<p>[object Object]</p>',
  `<a href="${repository}">repo</a><p>undefined</p>`,
]) assert.equal(hasPlaceholderText(html), true, html);

console.log('PASS legitimate identifier regression and unresolved output tokens.');
