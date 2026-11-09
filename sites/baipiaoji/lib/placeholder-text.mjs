// Check unresolved output tokens without rejecting legitimate identifiers such
// as the GitHub namespace codeundefinedhq. Attributes remain in the check.
export function hasPlaceholderText(html) {
  return /暂无|待补|TBD|TODO|\bundefined\b|\[object /.test(html);
}
