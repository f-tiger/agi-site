// Pages serves *.html at extensionless URLs and redirects the file URL.
// Keep generated links, canonical/hreflang, JSON-LD and discovery feeds aligned.
// This only rewrites this site's absolute URLs, never third-party source URLs.
export function canonicalUrls(text) {
  return text.replace(/https:\/\/baipiaoji\.com(\/[a-zA-Z0-9_./-]+)\.html(?=[?#\s"'<>),]|$)/g,
    (_, path) => 'https://baipiaoji.com' + path.replace(/\/index$/, '/'));
}
