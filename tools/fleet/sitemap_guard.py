#!/usr/bin/env python3
"""Validate sampled fleet sitemap destinations with one marked GET each.

Redirects, missing destinations and explicit noindex directives are errors.
Canonical anomalies are warnings because an alias may be intentional.
Temporary outages and inconclusive reads are warnings with the observed status.

Usage: python3 tools/fleet/sitemap_guard.py [--sample N] [--only HOST ...] [--selftest]
"""
import argparse
from html.parser import HTMLParser
import re
import sys
import urllib.error
import urllib.request
from urllib.parse import urljoin, urlsplit, urlunsplit
from xml.etree import ElementTree


HOSTS = ["agiscorecard.com", "baipiaoji.com", "getecoback.com", "thedollscout.com",
         "play.agiscorecard.com", "source.agiscorecard.com", "games.agiscorecard.com",
         "goldrush.agiscorecard.com", "35.agiscorecard.com", "learn.agiscorecard.com",
         "fanzha.agiscorecard.com", "firstjob.agiscorecard.com", "codeword.agiscorecard.com",
         "powerbill.agiscorecard.com",
         # 2026-09-21:四个新 worker 的全部 17 个公开主机名(每个主机各有自己的 sitemap)。
         "verify.agiscorecard.com",
         "rfqdesk.agiscorecard.com", "modelmeter.agiscorecard.com", "querysprint.agiscorecard.com",
         "filinglens.agiscorecard.com",
         "web3.agiscorecard.com", "reconcile.agiscorecard.com", "evidence.agiscorecard.com",
         "route.agiscorecard.com", "protocol.agiscorecard.com", "permit.agiscorecard.com",
         "compute.agiscorecard.com", "incentives.agiscorecard.com", "proof.agiscorecard.com",
         "calls.agiscorecard.com", "disclosures.agiscorecard.com",
         "localebatch.agiscorecard.com"]

UA = "fleet-heartbeat/sitemap_guard (+https://github.com/f-tiger/agi-site)"
SAMPLE = 4


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def probe_url(url):
    parts = urlsplit(url)
    query = "&".join(filter(None, (parts.query, "ci=1&__ci=1&__probe=1")))
    return urlunsplit(parts._replace(query=query, fragment=""))


def fetch(url, timeout=20):
    req = urllib.request.Request(probe_url(url), headers={
        "User-Agent": UA,
        "DNT": "1",
        "Sec-GPC": "1",
        "X-Probe": "fleet-sitemap-guard",
    })
    try:
        with urllib.request.build_opener(NoRedirect).open(req, timeout=timeout) as response:
            return response.status, response.read(), response.headers
    except urllib.error.HTTPError as e:
        return e.code, b"", e.headers


def pick(locs, n):
    if len(locs) <= n:
        return list(locs)
    if n == 1:
        return locs[:1]
    return [locs[round(i * (len(locs) - 1) / (n - 1))] for i in range(n)]


def noindex(value):
    return bool(re.search(r"(?:^|[\s,:])(?:noindex|none)(?:$|[\s,])", value, re.I))


class IndexMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.noindex = False

    def handle_starttag(self, tag, attrs):
        attrs = {name: value or "" for name, value in attrs}
        if tag == "link" and "canonical" in attrs.get("rel", "").lower().split():
            self.canonicals.append(attrs.get("href", "").strip())
        if tag == "meta" and attrs.get("name", "").lower() in {"robots", "googlebot", "bingbot"}:
            self.noindex |= noindex(attrs.get("content", ""))


def inspect_destination(url, fetcher):
    try:
        status, body, headers = fetcher(url)
    except (OSError, ValueError) as e:
        return "warning", f"{url}: request failed ({str(e)[:80]})"
    if 300 <= status < 400:
        return "error", f"{url}: HTTP {status} redirects to {headers.get('Location') or '?'}"
    if status != 200:
        severity = "error" if status in {404, 410} else "warning"
        return severity, f"{url}: HTTP {status}"
    if any(noindex(value) for value in headers.get_all("X-Robots-Tag", [])):
        return "error", f"{url}: X-Robots-Tag prevents indexing"
    if headers.get_content_type() not in {"text/html", "application/xhtml+xml"}:
        return None, None

    metadata = IndexMetadata()
    metadata.feed(body.decode("utf-8", "replace"))
    if metadata.noindex:
        return "error", f"{url}: robots metadata prevents indexing"
    if len(metadata.canonicals) != 1 or not metadata.canonicals[0]:
        return "warning", f"{url}: expected one usable HTML canonical"
    try:
        canonical = urljoin(url, metadata.canonicals[0])
    except ValueError:
        return "warning", f"{url}: invalid HTML canonical"
    if canonical != url:
        return "warning", f"{url}: HTML canonical points to {canonical}"
    return None, None


def check(host, n, fetcher=fetch):
    bad, warn = [], []
    try:
        status, xml, _ = fetcher(f"https://{host}/sitemap.xml")
        if status != 200:
            return [], [f"{host}: sitemap HTTP {status}"], 0
        root = ElementTree.fromstring(xml)
    except (OSError, ValueError, ElementTree.ParseError) as e:
        return [], [f"{host}: sitemap could not be read ({str(e)[:80]})"], 0
    kind = root.tag.split("}")[-1]
    if kind != "urlset":
        return [], [f"{host}: expected a sitemap urlset, found {kind}"], 0

    locs = [node.text.strip() for node in root.findall("{*}url/{*}loc") if node.text and node.text.strip()]
    unique_locs = list(dict.fromkeys(locs))
    if not locs:
        warn.append(f"{host}: sitemap urlset is empty")
    if len(unique_locs) != len(locs):
        warn.append(f"{host}: sitemap has duplicate destinations")
    for url in pick(unique_locs, n):
        try:
            parts = urlsplit(url)
        except ValueError:
            warn.append(f"{host}: invalid sitemap destination {url}")
            continue
        if parts.scheme != "https" or parts.netloc != host or parts.fragment:
            warn.append(f"{url}: expected an HTTPS destination on {host} without a fragment")
            continue
        severity, message = inspect_destination(url, fetcher)
        if severity == "error":
            bad.append(message)
        elif severity == "warning":
            warn.append(message)
    return bad, warn, len(unique_locs)


def selftest():
    from email.message import Message

    home = "https://example.com/"
    other = "https://example.com/other"
    calls = []
    headers = Message()
    headers["Content-Type"] = "text/html"

    def fake(url):
        calls.append(url)
        if url.endswith("sitemap.xml"):
            xml = f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{home}</loc></url><url><loc>{other}</loc></url></urlset>'
            return 200, xml.encode(), headers
        if url == home:
            return 200, b"<link href='/' rel='CANONICAL'>", headers
        return 200, b"<meta content='index, noindex' name='robots'>", headers

    errors, warnings, count = check("example.com", 4, fake)
    index_header = Message()
    index_header["X-Robots-Tag"] = "noindex"
    cases = [
        ("deterministic first/last sample", pick(list(range(100)), 4) == [0, 33, 66, 99]),
        ("single sample", pick([home, other], 1) == [home]),
        ("one GET per sitemap and destination", calls == [home + "sitemap.xml", home, other]),
        ("relative canonical accepted and meta noindex reported", count == 2 and not warnings and len(errors) == 1 and errors[0].startswith(other)),
        ("HTML without a canonical warns", inspect_destination(home, lambda _: (200, b"<html></html>", headers))[0] == "warning"),
        ("canonical alias warns", inspect_destination(other, lambda _: (200, b'<link rel="canonical" href="/">', headers))[0] == "warning"),
        ("header noindex works without HTML", inspect_destination(home, lambda _: (200, b"", index_header))[0] == "error"),
        ("HTTP 429 is an inconclusive read", inspect_destination(home, lambda _: (429, b"", headers))[0] == "warning"),
        ("HTTP 308 flags redirects", inspect_destination(home, lambda _: (308, b"", headers))[0] == "error"),
        ("HTTP 404 flags a missing destination", inspect_destination(home, lambda _: (404, b"", headers))[0] == "error"),
        ("robot directives use token matching", noindex("googlebot: noindex, follow") and noindex("none") and not noindex("noindex-other")),
        ("QA markers preserve an existing query", probe_url(home + "?a=1") == home + "?a=1&ci=1&__ci=1&__probe=1"),
        ("fleet hostnames are unique", len(set(HOSTS)) == len(HOSTS)),
        ("only fleet hostnames", all(re.fullmatch(r"([a-z0-9-]+\.)?(agiscorecard|baipiaoji|getecoback|thedollscout)\.com", host) for host in HOSTS)),
    ]
    for label, passed in cases:
        print(("ok   " if passed else "FAIL ") + label)
    return 0 if all(passed for _, passed in cases) else 1


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selftest", action="store_true")
    parser.add_argument("--sample", type=int, default=SAMPLE)
    parser.add_argument("--only", choices=HOSTS, nargs="+")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    if args.sample < 1:
        parser.error("--sample must be at least 1")
    red = 0
    for host in args.only or HOSTS:
        bad, warn, total = check(host, args.sample)
        flag = "::error::" if bad else ""
        print(f"{flag}{host}: {total} sitemap URLs, sampled up to {args.sample}, {len(bad)} errors")
        for entry in bad:
            print(f"    {entry}")
            red = 1
        for entry in warn:
            print(f"::warning::{entry}")
    return red


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
