#!/usr/bin/env python3
"""Bounded, keyless DE/GB opportunity collection; never a content publisher.

Public Google RSS and the existing dated DE related-query snapshot are data,
not instructions. Run receipts and candidates belong in a workflow artifact,
never the public site. No GA, customer searches, affiliate requests or AI calls.
"""
import argparse
import hashlib
import json
import re
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "sites/getecoback/site"
CATALOG = ROOT / "data/evolution/getecoback-catalog.json"
RISING = ROOT / "sites/getecoback/data/trends-rising.json"
MAX_BYTES = 1024 * 1024
INJECTION = re.compile(r"ignore.{0,40}(previous|instruction)|system\s*prompt|developer\s*message|"
                       r"api[_ -]?key|secret|execute\s|curl\s|wget\s|<[^>]+>|"
                       r"忽略.{0,20}(指令|规则)|系统提示|运行命令", re.I)
RETIRED = re.compile(r"balkonkraft|photovolta|\bsolar|stromspeicher|energiespeicher|"
                     r"power\s?station|battery storage|energy storage|growatt|ecoflow|"
                     r"solarbank|anker solix|batteriespeicher", re.I)
NICHE = re.compile(r"tineco|saugwisch|staubsaug|thermovorhang|zugluft|abdichten|"
                   r"entfeucht|dehumid|meaco|arete|heiz|heating|heater|radiator|"
                   r"wäsche|waesche|laundry|drying clothes|dry clothes|heated airer|"
                   r"schimmel|mould|damp|humidity|luftfeucht", re.I)
NEWS = re.compile(r"\b(wahl|wahlen|bundestag|krieg|ukraine|trump|election|minister|"
                  r"football|fussball|fußball|bundesliga|transfer|tote|attack|film)\b", re.I)
STOP = {"guide", "ratgeber", "with", "your", "the", "and", "oder", "eine", "einen", "fuer", "für", "ohne", "cost"}
EVIDENCE_HOSTS = {
    "local_pain": {"www.reddit.com"},
    "primary_guidance": {"de.tineco.com", "www.verbraucherzentrale.de", "www.meaco.com"},
}
SOURCE_HOSTS = EVIDENCE_HOSTS["primary_guidance"] | {"www.umweltbundesamt.de", "www.ofgem.gov.uk", "energysavingtrust.org.uk", "www.nhs.uk", "www.gov.uk"}


def utc(value=None):
    return value or datetime.now(timezone.utc)


def timestamp(value):
    if not value or not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed
    except ValueError:
        try:
            return parsedate_to_datetime(value).astimezone(timezone.utc)
        except (ValueError, TypeError, OverflowError):
            return None


def age_days(value, now):
    parsed = timestamp(value)
    return (now - parsed).total_seconds() / 86400 if parsed else None


def norm(text):
    text = unicodedata.normalize("NFKC", str(text)).casefold()
    return " ".join(re.findall(r"[^\W_]+", text))


def rejection(text):
    text = unicodedata.normalize("NFKC", urllib.parse.unquote(unescape(text)))
    if len(text) > 240 or INJECTION.search(text) or re.search(r"https?://|[\x00-\x1f]", text):
        return "unsafe_source_text"
    if RETIRED.search(text):
        return "retired_category"
    if NEWS.search(text) or not NICHE.search(text):
        return "unrelated_news_or_query"
    return None


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("redirect_not_allowed")


def read_rss(country):
    if country not in ("DE", "GB"):
        raise ValueError("unsupported_country")
    url = f"https://trends.google.com/trending/rss?geo={country}"
    req = urllib.request.Request(url, headers={"User-Agent": "EcoBackTrendAudit/1.0 (+https://getecoback.com)"})
    with urllib.request.build_opener(NoRedirect()).open(req, timeout=20) as response:
        body = response.read(MAX_BYTES + 1)
    if len(body) > MAX_BYTES:
        raise ValueError("response_too_large")
    return body


def parse_rss(body):
    if len(body) > MAX_BYTES or b"<!DOCTYPE" in body.upper() or b"<!ENTITY" in body.upper():
        raise ValueError("unsafe_or_oversized_xml")
    root = ET.fromstring(body)
    if root.tag != "rss" or root.find("channel") is None:
        raise ValueError("not_an_rss_feed")
    items = root.findall("./channel/item")
    if not items:
        raise ValueError("rss_has_no_items")
    rows = []
    for item in items[:100]:
        title = (item.findtext("title") or "").strip()
        if not title:
            continue
        rows.append({"text": title, "observed_at": item.findtext("pubDate"),
                     "metric": "public_trending_feed_presence"})
    if not rows:
        raise ValueError("rss_has_no_titles")
    return rows


def collect_rss(country, now, fetcher=read_rss):
    receipt = {"id": f"google-rss-{country}", "country": country,
               "source": f"https://trends.google.com/trending/rss?geo={country}",
               "attempted_at": now.isoformat(), "captured_at": None,
               "status": "failed", "signal_kind": "rss", "count": 0}
    try:
        rows = parse_rss(fetcher(country))
        receipt.update(status="ok", captured_at=now.isoformat(), count=len(rows))
        for row in rows:
            row.update(source_id=receipt["id"], country=country, signal_kind="rss",
                       captured_at=now.isoformat(), source_status="ok")
        return receipt, rows
    except (OSError, ValueError, ET.ParseError) as exc:
        # Error classes are enough; server output is untrusted and may contain text/URLs.
        receipt["error"] = type(exc).__name__
        return receipt, []


def collect_rising(path, now):
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        if data.get("geo") != "DE" or not isinstance(data.get("seeds"), dict):
            raise ValueError("invalid_snapshot")
    except (OSError, ValueError, TypeError, AttributeError):
        return [{"id": "related-queries-DE", "country": "DE", "status": "failed",
                 "attempted_at": now.isoformat(), "captured_at": None,
                 "error": "missing_or_invalid_snapshot"}], []
    receipts, signals = [], []
    for seed, value in data["seeds"].items():
        if not isinstance(value, dict):
            continue
        identifier = "related-queries-DE-" + hashlib.sha256(seed.encode()).hexdigest()[:10]
        captured = value.get("fetched")
        age = age_days(captured, now)
        source = value.get("source")
        kind = {"related-queries": "related_queries", "autocomplete-diff": "autocomplete",
                "autocomplete-vocabulary": "autocomplete"}.get(source)
        if kind is None:
            receipts.append({"id": identifier, "country": "DE", "signal_kind": "unknown",
                             "source": "existing snapshot", "captured_at": captured,
                             "inspected_at": now.isoformat(), "status": "unknown_source", "count": 0})
            continue
        status = "stale" if age is None or age > 7 or age < 0 else "ok"
        if value.get("polluted"):
            status = "polluted"
        if kind == "related_queries" and value.get("last_attempt_status") == "failed":
            status = "fetch_failed_keep_last_good"
        elif kind == "related_queries" and value.get("last_attempt_status") == "empty":
            status = "latest_empty_keep_last_good"
        receipt = {"id": identifier, "country": "DE", "signal_kind": kind,
                   "source": "existing Google related-query snapshot", "captured_at": captured,
                   "attempted_at": value.get("last_attempt_at"), "inspected_at": now.isoformat(),
                   "status": status, "related_query_attempt_status": value.get("last_attempt_status"),
                   "timeframe": "today 3-m", "count": 0, "invalid_rows_ignored": 0}
        rows = value.get("rising", []) if kind == "related_queries" else [{"q": term} for term in value.get("auto", [])]
        for row in rows:
            if not isinstance(row, dict) or not isinstance(row.get("q"), str):
                continue
            number = row.get("v")
            # Legacy autocomplete-diff/new values are vocabulary only, never growth.
            if kind == "related_queries" and (not isinstance(number, int) or isinstance(number, bool) or number <= 0):
                receipt["invalid_rows_ignored"] += 1
                continue
            row_kind = kind
            signals.append({"source_id": identifier, "country": "DE", "signal_kind": row_kind,
                            "text": row["q"], "captured_at": captured, "observed_at": captured,
                            "source_status": status, "metric": "relative_growth_not_search_volume" if row_kind == "related_queries" else "vocabulary_only",
                            "relative_growth": number if row_kind == "related_queries" else None})
            receipt["count"] += 1
        receipts.append(receipt)
    return receipts, signals


class TitleParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.in_title = False; self.text = []; self.lang = ""
    def handle_starttag(self, tag, attrs):
        if tag == "title": self.in_title = True
        if tag == "html": self.lang = dict(attrs).get("lang", "").lower()
    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.text.append(data)


def inventory(site, catalog=None):
    result = {}
    reviewed_countries = {task["target"]: task["country"] for task in (catalog or {}).get("tasks", [])}
    for path in Path(site).rglob("*.html"):
        route = "/" + path.relative_to(site).as_posix()
        if not (route.startswith("/guide/") or route.startswith("/en/guide/")):
            continue
        parser = TitleParser(); parser.feed(path.read_text(encoding="utf-8"))
        title = " ".join(parser.text)
        if RETIRED.search(route + " " + title):
            continue
        country = "DE" if route.startswith("/guide/") else "unknown"
        if route in reviewed_countries:
            country = reviewed_countries[route]
        elif parser.lang == "en-gb" or re.search(r"(?:^|[-/])(?:uk|united-kingdom)(?:[-./]|$)", route):
            country = "GB"
        result[route] = {"title": title, "country": country}
    return result


def verified_evidence(task, key, now):
    evidence = task.get(key, {})
    age = age_days(evidence.get("reviewed_at"), now)
    try:
        url = urllib.parse.urlsplit(evidence.get("url", ""))
        safe_url = (url.scheme == "https" and url.hostname in EVIDENCE_HOSTS.get(key, set())
                    and url.port is None and url.username is None and url.password is None)
    except ValueError:
        safe_url = False
    return (evidence.get("status") == "verified" and safe_url
            and age is not None and 0 <= age <= 90 and evidence.get("country") == task["country"]
            and isinstance(evidence.get("scope"), str) and bool(evidence["scope"].strip()))


def matches_task_scope(task, query):
    """A broad brand trend cannot inherit a narrow model/task review."""
    for field in ("required_intent_terms", "reviewed_model_terms"):
        terms = task.get(field, [])
        if terms and not any(re.search(r"(?<!\w)" + re.escape(norm(term)) + r"(?!\w)", norm(query)) for term in terms):
            return False
    return True


def classify(signals, catalog, pages, now):
    candidates, discarded, seen = [], [], set()
    # A stale or autocomplete copy must not suppress a later fresh observation.
    def signal_priority(signal):
        age = age_days(signal.get("observed_at"), now)
        usable = signal["source_status"] == "ok" and age is not None and 0 <= age <= 7
        return (not usable, signal["signal_kind"] == "autocomplete")
    for signal in sorted(signals, key=signal_priority):
        text = signal.get("text", "")
        digest = hashlib.sha256(text.encode()).hexdigest()[:16]
        reject = rejection(text)
        if reject:
            discarded.append({"source_id": signal["source_id"], "country": signal["country"],
                              "text_sha256_prefix": digest, "status": "unrelated", "reason": reject})
            continue
        key = (signal["country"], norm(text))
        if key in seen:
            # Keep source provenance on the existing candidate without double-counting demand.
            for candidate in candidates:
                if (candidate["country"], norm(candidate["query"])) == key:
                    candidate["also_seen_in"].append(signal["source_id"])
                    break
            continue
        seen.add(key)
        country = signal["country"]
        task = next((t for t in catalog["tasks"] if t["country"] == country and
                     any(re.search(r"(?<!\w)" + re.escape(norm(a)) + r"(?!\w)", norm(text)) for a in t["aliases"])), None)
        target = task["target"] if task and task["target"] in pages else None
        candidate = {"query": text, "country": country, "source_id": signal["source_id"],
                     "signal_kind": signal["signal_kind"], "metric": signal["metric"],
                     "observed_at": signal.get("observed_at"), "captured_at": signal.get("captured_at"),
                     "also_seen_in": [], "task_id": task["id"] if task else None,
                     "target": target, "target_title": pages[target]["title"] if target else None,
                     "status": "awaiting_evidence", "reason": "local_pain_and_official_fit_not_verified",
                     "evidence_scope": task.get("primary_guidance", {}).get("scope") if task else None,
                     "auto_publish": False, "new_page_allowed": False, "product_link_allowed": False}
        age = age_days(signal.get("observed_at"), now)
        if signal["source_status"] != "ok" or age is None or age > 7 or age < 0:
            candidate["reason"] = "stale_missing_date_or_source_failed"
        elif signal["signal_kind"] == "autocomplete":
            candidate["reason"] = "autocomplete_is_vocabulary_not_trend_or_demand"
        elif task and target:
            if not matches_task_scope(task, text):
                candidate.update(status="research_existing", reason="brand_or_model_signal_outside_reviewed_task_scope")
            elif verified_evidence(task, "local_pain", now) and verified_evidence(task, "primary_guidance", now):
                candidate.update(status="deepen_existing", reason="fresh_signal_matches_reviewed_local_task_and_existing_page")
            else:
                candidate.update(status="research_existing", reason="fresh_signal_matches_existing_page_but_evidence_needs_review")
        elif task:
            candidate["reason"] = "mapped_page_missing_do_not_create_duplicate"
        else:
            words = {w for w in norm(text).split() if len(w) >= 5 and w not in STOP}
            matches = []
            for route, page in pages.items():
                titlewords = set(norm(page["title"] + " " + route).split())
                overlap = len(words & titlewords)
                if page["country"] == country and overlap >= 2:
                    matches.append((overlap, route))
            if matches:
                route = sorted(matches, key=lambda pair: (-pair[0], pair[1]))[0][1]
                candidate.update(target=route, target_title=pages[route]["title"], status="research_existing",
                                 reason="title_and_path_overlap_requires_manual_intent_check")
            else:
                candidate["reason"] = "no_reviewed_task_mapping_do_not_create_page"
        candidates.append(candidate)
    priority = {"deepen_existing": 0, "research_existing": 1, "awaiting_evidence": 2}
    candidates.sort(key=lambda row: (priority[row["status"]], row["country"], row["task_id"] or "", row["query"]))
    return candidates, discarded


class AuditParser(TitleParser):
    def __init__(self):
        super().__init__(); self.canonicals = []; self.descriptions = []; self.robots = []
        self.links = []; self.hreflang = []; self.jsonld = []; self.in_jsonld = False
    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        attrs = dict(attrs)
        if tag == "link":
            if attrs.get("rel") == "canonical": self.canonicals.append(attrs.get("href", ""))
            if attrs.get("hreflang"): self.hreflang.append(attrs.get("hreflang"))
        if tag == "meta":
            if attrs.get("name", "").lower() == "description": self.descriptions.append(attrs.get("content", ""))
            if attrs.get("name", "").lower() in ("robots", "googlebot"): self.robots.append(attrs.get("content", ""))
        if tag == "a" and attrs.get("href"): self.links.append((attrs["href"], attrs.get("rel", "")))
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.in_jsonld = True; self.jsonld.append("")
    def handle_endtag(self, tag):
        super().handle_endtag(tag)
        if tag == "script": self.in_jsonld = False
    def handle_data(self, data):
        super().handle_data(data)
        if self.in_jsonld: self.jsonld[-1] += data


def local_route(url, base):
    parsed = urllib.parse.urlsplit(urllib.parse.urljoin("https://getecoback.com" + base, url))
    if parsed.scheme != "https" or parsed.hostname != "getecoback.com": return None
    path = parsed.path
    return path + "index.html" if path.endswith("/") else path


def audit_targets(site, targets):
    """Execute read-only SEO/GEO checks now; no raw source text or inputs copied."""
    pages, graph = {}, {}
    for path in Path(site).rglob("*.html"):
        route = "/" + path.relative_to(site).as_posix()
        parser = AuditParser(); parser.feed(path.read_text(encoding="utf-8"))
        pages[route] = parser
        graph[route] = {link for href, rel in parser.links if (link := local_route(href, route))}
    # Discovery needs an actual reachable path from home or the existing tools hub.
    distances = {route: 0 for route in ("/index.html", "/en/index.html", "/tools.html") if route in pages}
    frontier = list(distances)
    while frontier:
        parent = frontier.pop(0)
        if distances[parent] >= 3: continue
        for child in graph[parent]:
            if child in pages and child not in distances:
                distances[child] = distances[parent] + 1; frontier.append(child)
    results = []
    for target in targets:
        parser = pages.get(target)
        if not parser:
            results.append({"target": target, "status": "blocked", "findings": ["mapped_page_missing"]}); continue
        findings = []
        canonical_ok = len(parser.canonicals) == 1 and parser.canonicals[0] == "https://getecoback.com" + target
        if not canonical_ok: findings.append("canonical_missing_duplicate_or_mismatched")
        if not " ".join(parser.text).strip(): findings.append("title_missing")
        if len(parser.descriptions) != 1 or not parser.descriptions[0].strip(): findings.append("description_missing_or_duplicate")
        if any("noindex" in directive.lower() for directive in parser.robots): findings.append("noindex_directive")
        jsonld_valid = bool(parser.jsonld)
        for block in parser.jsonld:
            try:
                parsed = json.loads(block)
                if not isinstance(parsed, (dict, list)): jsonld_valid = False
            except (ValueError, TypeError): jsonld_valid = False
        if not jsonld_valid: findings.append("structured_data_missing_or_invalid")
        if target not in distances: findings.append("not_reached_from_home_or_tools_within_three_links")
        source_hosts = sorted({urllib.parse.urlsplit(href).hostname for href, rel in parser.links
                               if urllib.parse.urlsplit(href).scheme == "https"
                               and urllib.parse.urlsplit(href).hostname in SOURCE_HOSTS and "sponsored" not in rel})
        if not source_hosts: findings.append("primary_source_reference_needs_review")
        results.append({"target": target, "status": "review" if findings else "pass", "findings": findings,
                        "canonical_ok": canonical_ok, "structured_data_valid": jsonld_valid,
                        "discovery_link_depth": distances.get(target), "primary_source_hosts": source_hosts,
                        "hreflang_languages": sorted(set(parser.hreflang)), "modified": False,
                        "limits": "Static HTML audit only; not Google indexing, rich-result eligibility, citation or traffic proof"})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--catalog", type=Path, default=CATALOG)
    parser.add_argument("--site-root", type=Path, default=SITE)
    parser.add_argument("--rising", type=Path, default=RISING)
    parser.add_argument("--offline", action="store_true", help="Record RSS as not fetched; inspect existing snapshot only")
    args = parser.parse_args()
    if args.output_dir.resolve().is_relative_to(args.site_root.resolve()):
        parser.error("Receipts must stay outside the public site")
    now = utc(); receipts, signals = [], []
    for country in ("DE", "GB"):
        if args.offline:
            receipts.append({"id": f"google-rss-{country}", "country": country, "status": "not_fetched",
                             "attempted_at": None, "captured_at": None, "reason": "offline_check"})
        else:
            receipt, rows = collect_rss(country, now); receipts.append(receipt); signals.extend(rows)
    rising_receipts, rising_signals = collect_rising(args.rising, now)
    receipts.extend(rising_receipts); signals.extend(rising_signals)
    catalog = json.loads(args.catalog.read_text(encoding="utf-8")); pages = inventory(args.site_root, catalog)
    queue, discarded = classify(signals, catalog, pages, now)
    targets = sorted({row["target"] for row in queue if row["target"] and row["status"] in ("deepen_existing", "research_existing")})
    audits = audit_targets(args.site_root, targets)
    report = {"schema_version": 1, "site": "getecoback", "generated_at": now.isoformat(),
              "status": "complete" if all(r["status"] == "ok" for r in receipts) else "partial",
              "candidates": queue, "discarded": discarded, "audit_targets": targets, "technical_audit": audits,
              "technical_handoff": {"mode": "audit_existing_pages_only", "allowed_checks": ["metadata", "internal_links", "structured_data", "source_checks"],
                                     "recipient": "existing daily deploy quality gates", "publish_authority": False},
              "limitations": ["RSS presence is not local buying demand or a search-volume estimate",
                              "Related-query growth is relative and uses the source three-month window",
                              "Autocomplete is vocabulary only; no trend, growth, bestseller or revenue claim",
                              "No new page, product link, social post, schedule or affiliate request is generated",
                              "DE and GB only; Austrian and Swiss demand is not inferred from DE signals"]}
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "receipts.json").write_text(json.dumps({"generated_at": now.isoformat(), "sources": receipts}, ensure_ascii=False, indent=2) + "\n")
    (args.output_dir / "opportunities.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    summary = {"status": report["status"], "sources": len(receipts), "candidates": len(queue), "discarded": len(discarded),
               "audit_targets": len(targets), "output": str(args.output_dir)}
    print(json.dumps(summary))
    if report["status"] != "complete":
        print("Source coverage is partial; see receipts.json. Missing sources are unknown, not zero demand.")


if __name__ == "__main__":
    main()
