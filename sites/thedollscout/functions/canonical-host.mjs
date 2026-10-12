const CANONICAL_HOST = 'thedollscout.com';

export function canonicalHostRedirect(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  if (url.hostname !== `www.${CANONICAL_HOST}`) return null;
  url.hostname = CANONICAL_HOST;
  return Response.redirect(url.toString(), 301);
}
