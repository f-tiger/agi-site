/* One definition of a page's canonical URL, shared by everything that emits one.

   THE BUG THIS EXISTS TO FIX. Cloudflare Pages serves a file at its
   extensionless path and 308s the .html form to it. The site published the
   .html form everywhere — sitemap.xml, <link rel="canonical">, og:url, the
   JSON-LD @id, and 688 internal links. Measured against the live host:

     Published URLs that REDIRECT instead of serving:   35 / 40
     Pages whose canonical is not the URL they serve at: 35 / 40
     …of those, canonicals that THEMSELVES redirect:     35

   So every sitemap entry was a redirect, and every page told Google "index
   /x.html" while /x.html immediately bounced to /x. Google's guidance is that
   a sitemap should list final canonical URLs and that a canonical pointing at
   a redirect is a conflicting signal. It is consistent with what the edge data
   shows: Googlebot fetching pages daily for eighteen days and the domain
   appearing in no index, not even for its own brand name.

   The .html files stay on disk — that is how Pages works. Only what we PUBLISH
   about them changes, and it changes in one place so the sitemap, the
   canonical, the feed, the search index and the links cannot drift apart. */

export const SITE = "https://thedollscout.com";

/* A repo-relative file path, or a site-absolute path, to the URL path the host
   actually serves it at. */
export function canonicalPath(p) {
  let s = p.replace(/^\.\//, "");
  if (!s.startsWith("/")) s = "/" + s;
  if (!s.endsWith(".html")) return s;
  /* 404.html is never linked as a page — Pages serves it as the 404 body — so
     rewriting it would invent a URL nobody requests. */
  if (s === "/404.html") return s;
  if (s === "/index.html") return "/";
  if (s.endsWith("/index.html")) return s.slice(0, -"index.html".length);
  return s.slice(0, -".html".length);
}

export const canonicalUrl = (p) => SITE + canonicalPath(p);

/* The inverse: the published URL back to the file on disk. Needed wherever code
   reads the page it just listed — llms-full.txt inlines every page's text, and
   the label test maps sitemap entries to files. Both broke the moment the
   published URL stopped being the file name, which is the predictable cost of
   the two finally differing. */
export function filePathFor(u) {
  let s = u.startsWith(SITE) ? u.slice(SITE.length) : u;
  s = s.replace(/[?#].*$/, "");
  if (s === "" || s === "/") return "index.html";
  if (s.startsWith("/")) s = s.slice(1);
  if (s.endsWith("/")) return s + "index.html";
  return s.endsWith(".html") ? s : s + ".html";
}

/* Rewrites a URL that may carry a #fragment or ?query, so JSON-LD @id values
   like ".../guides/x.html#article" normalise without losing the fragment. */
export function canonicalizeHref(href) {
  const m = /^([^?#]*)([?#].*)?$/.exec(href);
  if (!m) return href;
  const [, base, tail = ""] = m;
  if (!base.endsWith(".html")) return href;

  if (base.startsWith(SITE)) return SITE + canonicalPath(base.slice(SITE.length)) + tail;
  if (base.startsWith("/")) return canonicalPath(base) + tail;
  return href; /* leave external and relative links alone */
}
