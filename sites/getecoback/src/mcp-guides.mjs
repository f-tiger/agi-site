import {citationUrl} from './agent-sources.mjs';

const ORIGIN = 'https://getecoback.com';
const PRIVATE = /(?:^|\/)(?:auth|api|account|members|widgets|analytics-assets|member-assets)(?:\/|\.|$)/;
const HEADING = /^(#{1,6}) ([^\r\n]+)$/;
const validAnchor = anchor => anchor.length > 0 && anchor.length <= 80 && !/[^a-z0-9-]/.test(anchor);
const canonicalLines = path => ['Canonical (HTML, zitierfähig): ', 'Canonical: ', 'Canonical (HTML): ', ''].map(prefix => prefix + ORIGIN + path);

// Validate before URL parsing can normalize traversal, credentials or ports.
// The only fetches below use the fixed origin and an exact published path.
export function guidePath(value) {
  if (typeof value !== 'string' || /[\s\\]/.test(value)) return null;
  const path = value.startsWith(ORIGIN + '/') ? value.slice(ORIGIN.length) : value;
  if (!/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.html$/.test(path) || PRIVATE.test(path)) return null;
  return path;
}

export function guideTarget(value) {
  if (typeof value !== 'string') return null;
  const [raw, anchor, extra] = value.split('#', 3);
  const path = guidePath(raw);
  if (!path || extra !== undefined || (anchor !== undefined && !validAnchor(anchor))) return null;
  return {path, anchor};
}

function validReadableSections(sections) {
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) return false;
  return Object.entries(sections).every(([anchor,heading]) =>
    validAnchor(anchor) && typeof heading === 'string' && heading.length <= 240 &&
    !/[\r\n]/.test(heading) && HEADING.test(heading));
}

export async function publishedGuides(assets) {
  const response = await assets.fetch(new Request(ORIGIN + '/mcp-guides.json', {redirect: 'manual'}));
  if (response.status !== 200) throw new Error('MCP corpus unavailable');
  const entries = await response.json();
  if (!Array.isArray(entries) || !entries.length) throw new Error('Invalid MCP corpus');
  const seen = new Set();
  for (const entry of entries) {
    if (!entry || guidePath(entry.u) !== entry.u || entry.m !== entry.u.replace(/\.html$/, '.md') ||
        !['t', 'd', 'l', 'a'].every(key => typeof entry[key] === 'string') ||
        !canonicalLines(entry.u).includes(entry.c) || seen.has(entry.u) ||
        (Object.hasOwn(entry, 'readable_sections') && !validReadableSections(entry.readable_sections))) {
      throw new Error('Invalid MCP corpus entry');
    }
    seen.add(entry.u);
  }
  return entries;
}

export async function readGuide(assets, entry, anchor) {
  const response = await assets.fetch(new Request(ORIGIN + entry.m, {redirect: 'manual'}));
  if (response.status !== 200 || response.redirected || !/^text\/(?:markdown|plain)(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
    throw new Error('Markdown unavailable');
  }
  const markdown = await response.text();
  const canonicals = markdown.split(/\r?\n/).filter(line => line.startsWith('Canonical') || line === ORIGIN + entry.u);
  if (!markdown.startsWith('# ') || canonicals.length !== 1 || canonicals[0] !== entry.c ||
      /<(?:script|form|style|input|button|select|textarea)\b/i.test(markdown) ||
      /https?:\/\/[^\s<>)]*(?:amazon\.|amzn\.)|[?&]tag=|getecoback-21|ecoback0d-20/i.test(markdown)) {
    throw new Error('Invalid editorial mirror');
  }
  let readable = markdown;
  if (anchor !== undefined) {
    const heading = entry.readable_sections?.[anchor];
    const depth = typeof heading === 'string' ? HEADING.exec(heading)?.[1].length : null;
    const lines = markdown.split(/\r?\n/);
    const start = lines.indexOf(heading);
    if (!depth || start < 0 || start !== lines.lastIndexOf(heading)) throw new Error('Verified guide section is missing');
    const end = lines.findIndex((line, index) => index > start && (HEADING.exec(line)?.[1].length ?? 7) <= depth);
    readable = lines.slice(start, end < 0 ? lines.length : end).join('\n').trimEnd();
  }
  const references = [...new Set([...readable.matchAll(/\]\((https:\/\/[^\s)]+)\)/g)]
    .map(match => citationUrl(match[1])).filter(Boolean))];
  const limit = 20000;
  const truncated = readable.length > limit;
  // Do not cut a Markdown citation or sentence when a paragraph break fits.
  const end = truncated ? Math.max(readable.lastIndexOf('\n\n', limit), 0) : readable.length;
  const excerpt = truncated ? readable.slice(0, end || limit) : readable;
  return {
    canonical: ORIGIN + entry.u + (anchor === undefined ? '' : '#' + anchor), mirror: ORIGIN + entry.m,
    truncated, characters: readable.length, excerpt, references,
  };
}
