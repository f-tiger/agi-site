// Publisher README descriptions in the GitHub search payload describe that
// publisher's product, not BPJ's inventory. Exclude only source-matching fields;
// keep visible copy, JSON-LD and every other payload field in the count gate.
export function countClaimText(html, path, catalog) {
  if (!/(?:^|\/)(?:en\/)?github-tools\/index\.html$/.test(path)) return html;
  const expected = new Map(catalog.tools.map(t => [t.id, t]));
  return html.replace(/(<script\b[^>]*\bid="github-tool-data"[^>]*>)([\s\S]*?)(<\/script>)/g, (whole, start, body, end) => {
    if (!/\btype="application\/json"/.test(start)) return whole;
    const data = JSON.parse(body);
    for (const tool of data.tools) {
      if (!Object.hasOwn(tool, 'publisherDescription')) continue;
      const source = expected.get(tool.id);
      if (!source || source.origin !== 'automatic' || source.repo !== tool.repo ||
          source.publisherDescription !== tool.publisherDescription) {
        throw new Error('GitHub publisher description does not match its source: ' + tool.id);
      }
      delete tool.publisherDescription;
    }
    return start + JSON.stringify(data) + end;
  });
}
