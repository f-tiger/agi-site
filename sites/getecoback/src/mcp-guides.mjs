import {citationUrl} from './agent-sources.mjs';

const ORIGIN = 'https://getecoback.com';
const PRIVATE = /(?:^|\/)(?:auth|api|account|members|widgets|analytics-assets|member-assets)(?:\/|\.|$)/;
const canonicalLines = path => ['Canonical (HTML, zitierfähig): ', 'Canonical: ', 'Canonical (HTML): ', ''].map(prefix => prefix + ORIGIN + path);

// Validate before URL parsing can normalize traversal, credentials or ports.
// The only fetches below use the fixed origin and an exact published path.
export function guidePath(value) {
  if (typeof value !== 'string' || /[\s\\]/.test(value)) return null;
  const path = value.startsWith(ORIGIN + '/') ? value.slice(ORIGIN.length) : value;
  if (!/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.html$/.test(path) || PRIVATE.test(path)) return null;
  return path;
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
        !canonicalLines(entry.u).includes(entry.c) || seen.has(entry.u)) {
      throw new Error('Invalid MCP corpus entry');
    }
    seen.add(entry.u);
  }
  return entries;
}

export async function readGuide(assets, entry) {
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
  const references = [...new Set([...markdown.matchAll(/\]\((https:\/\/[^\s)]+)\)/g)]
    .map(match => citationUrl(match[1])).filter(Boolean))];
  const limit = 20000;
  const truncated = markdown.length > limit;
  // Do not cut a Markdown citation or sentence when a paragraph break fits.
  const end = truncated ? Math.max(markdown.lastIndexOf('\n\n', limit), 0) : markdown.length;
  const excerpt = truncated ? markdown.slice(0, end || limit) : markdown;
  return {
    canonical: ORIGIN + entry.u, mirror: ORIGIN + entry.m,
    truncated, characters: markdown.length, excerpt, references,
  };
}
