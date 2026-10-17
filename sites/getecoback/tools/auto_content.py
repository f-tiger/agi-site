#!/usr/bin/env python3
"""Publish at most one evidenced product guide per UTC day.

The scheduled caller supplies no prompts or editable publication paths. Official
source adapters discover products; this executor validates independent facts,
deduplicates existing editorial work, then renders a deterministic guide. The
default CLI is read-only. Failed or unchanged collections never refresh dates.
"""
from __future__ import annotations

import argparse
import copy
from datetime import datetime, timezone
import difflib
import hashlib
from html import unescape
from html.parser import HTMLParser
import ipaddress
import json
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://getecoback.com"
MARKER = "<!--EB_AUTO_CONTENT-->"
DATA_FILES = ("data/auto-content.json", "data/auto-content-ledger.json")
FACT_GROUPS = {
    "power_watts": "power", "extraction_l_per_day": "extraction",
    "tank_l": "tank", "tank_capacity_l": "tank", "noise_db": "noise",
    "noise_db_a": "noise", "temperature_min_c": "temperature",
    "temperature_max_c": "temperature", "operating_temperature_min_c": "temperature",
    "operating_temperature_max_c": "temperature", "temperature_range_c": "temperature",
    "operating_temperature_range_c": "temperature", "dimensions_mm": "dimensions",
    "weight_kg": "weight",
}
ALLOWED_FACTS = set(FACT_GROUPS) | {"voltage_v", "plug", "continuous_drainage", "auto_shutoff"}
FALLBACK_HOSTS = {"de.trotec.com", "www.meaco.com"}
ROUTE_RE = re.compile(r"^/(?:guide/[a-z0-9]+(?:-[a-z0-9]+)*-betriebskosten|en/guide/[a-z0-9]+(?:-[a-z0-9]+)*-running-cost)\.html$")
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
SOURCE_HASH_RE = re.compile(r"^[0-9a-f]{64}$")
VARIANT_WORDS = {"white", "black", "grey", "gray", "weiss", "weiß", "schwarz", "silber", "silver", "wifi", "wlan", "wi-fi", "edition", "bundle", "set"}


class GateError(ValueError):
    """Input cannot safely produce a publishable page."""


def normalise(value):
    value = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def stamp(now):
    if isinstance(now, str):
        now = datetime.fromisoformat(now.replace("Z", "+00:00"))
    if now.tzinfo is None:
        raise GateError("timezone_required")
    return now.astimezone(timezone.utc)


def iso(now):
    return stamp(now).isoformat(timespec="seconds").replace("+00:00", "Z")


def public_source(url, allowed_hosts):
    if not isinstance(url, str) or len(url) > 2048:
        return False
    try:
        parsed = urlsplit(url)
        if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port not in (None, 443):
            return False
        if parsed.hostname not in allowed_hosts or parsed.query or parsed.fragment or not parsed.path.startswith("/"):
            return False
        try:
            ipaddress.ip_address(parsed.hostname)
            return False
        except ValueError:
            return not any(c in url for c in ("\\", "\n", "\r", "\x00"))
    except (ValueError, TypeError):
        return False


def validate_product(raw, now, allowed_hosts=None):
    allowed_hosts = allowed_hosts or FALLBACK_HOSTS
    if not isinstance(raw, dict):
        raise GateError("product_not_object")
    product = copy.deepcopy(raw)
    for key in ("source_id", "brand", "model", "name"):
        value = product.get(key)
        if not isinstance(value, str) or not value.strip() or len(value) > 180 or any(ord(c) < 32 for c in value):
            raise GateError("invalid_" + key)
    if len(normalise(product["model"]).replace(" ", "")) < 3:
        raise GateError("model_too_generic")
    if product.get("country") not in ("DE", "GB"):
        raise GateError("unsupported_market")
    expected = {"DE": ("de", "EUR"), "GB": ("en-GB", "GBP")}[product["country"]]
    if not isinstance(product.get("market"), dict) or product.get("language") != expected[0] or product["market"].get("currency") != expected[1]:
        raise GateError("market_language_or_currency_mismatch")
    try:
        checked = stamp(product.get("checked_at", ""))
    except (ValueError, TypeError, AttributeError):
        raise GateError("invalid_source_timestamp")
    age = (stamp(now) - checked).total_seconds()
    if age < 0 or age > 48 * 3600:
        raise GateError("stale_or_future_source")
    if not isinstance(product.get("source_hash"), str) or not SOURCE_HASH_RE.fullmatch(product["source_hash"]):
        raise GateError("missing_source_hash")
    urls = product.get("source_urls")
    if not isinstance(urls, list) or not 1 <= len(urls) <= 10 or not all(public_source(url, allowed_hosts) for url in urls):
        raise GateError("untrusted_source_url")
    if product.get("product_url") not in urls:
        raise GateError("product_source_missing")
    expected_host = {"DE": "de.trotec.com", "GB": "www.meaco.com"}[product["country"]]
    if any(urlsplit(url).hostname != expected_host for url in urls):
        raise GateError("source_market_mismatch")
    power = product.get("power_watts")
    if isinstance(power, bool) or not isinstance(power, (int, float)) or not math.isfinite(power) or not 1 <= power <= 10000:
        raise GateError("invalid_power")
    facts = product.get("facts")
    if not isinstance(facts, list) or not 4 <= len(facts) <= 30:
        raise GateError("insufficient_facts")
    seen, groups, accepted = set(), set(), []
    for fact in facts:
        if not isinstance(fact, dict):
            raise GateError("invalid_fact")
        key = fact.get("key")
        if key not in ALLOWED_FACTS:
            continue  # SKU, colour, current price and promotions are not specifications.
        if key in seen:
            raise GateError("duplicate_fact_key")
        seen.add(key)
        value = fact.get("value")
        if isinstance(value, bool) or not isinstance(value, (str, int, float)) or (isinstance(value, str) and (not value.strip() or len(value) > 300)) or (isinstance(value, (float, int)) and not math.isfinite(value)):
            raise GateError("invalid_fact_value")
        for field in ("label", "unit", "context"):
            if field in fact and (not isinstance(fact[field], str) or len(fact[field]) > 500):
                raise GateError("invalid_fact_" + field)
        if key == "power_watts" and (not isinstance(value, (int, float)) or abs(float(value) - float(power)) > 0.001):
            raise GateError("inconsistent_power")
        if key == "extraction_l_per_day" and not str(fact.get("context", "")).strip():
            raise GateError("extraction_test_conditions_missing")
        if key in FACT_GROUPS:
            groups.add(FACT_GROUPS[key])
        accepted.append({k: fact[k] for k in ("key", "label", "value", "unit", "context") if k in fact})
    if "power" not in groups or len(groups) < 4:
        raise GateError("four_independent_specifications_required")
    product["facts"] = accepted
    product["source_urls"] = list(dict.fromkeys(urls))
    # Keep only documented source-adapter fields; scraped HTML never reaches templates.
    return {k: product[k] for k in ("source_id", "country", "language", "name", "brand", "model", "product_url", "source_urls", "checked_at", "source_hash", "facts", "power_watts", "market")}


def identity(product):
    return normalise(product["brand"]), normalise(product["model"])


def near_model(left, right):
    if normalise(left["brand"]) != normalise(right["brand"]):
        return False
    a, b = normalise(left["model"]), normalise(right["model"])
    if a == b:
        return True
    # Model numbers define different products. Matching number sets plus a small
    # suffix/colour change does not justify another independently indexed page.
    nums_a, nums_b = re.findall(r"\d+", a), re.findall(r"\d+", b)
    if nums_a != nums_b:
        return False
    tokens_a = [word for word in a.split() if word not in VARIANT_WORDS]
    tokens_b = [word for word in b.split() if word not in VARIANT_WORDS]
    return tokens_a == tokens_b or difflib.SequenceMatcher(None, "".join(tokens_a), "".join(tokens_b)).ratio() >= 0.88


def substantive_hash(product):
    facts = sorted(({k: stable_value(f.get(k, "")) for k in ("key", "value", "unit", "context")} for f in product["facts"]), key=lambda f: f["key"])
    data = {"identity": identity(product), "country": product["country"], "power_watts": stable_value(product["power_watts"]), "facts": facts}
    return hashlib.sha256(json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def stable_value(value):
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return " ".join(value.split()) if isinstance(value, str) else value


def trend_signals(site_root, now):
    """Read public related-query evidence; autocomplete never measures demand."""
    path = Path(site_root) / "data/trends-rising.json"
    try:
        snapshot = json.loads(path.read_text())
        if snapshot.get("geo") not in ("DE", "GB") or not isinstance(snapshot.get("seeds"), dict):
            raise ValueError("invalid_snapshot")
    except (OSError, ValueError, TypeError, AttributeError):
        return [], [{"source": "data/trends-rising.json", "status": "missing_or_invalid_snapshot"}]
    signals, receipts = [], []
    for seed, record in snapshot["seeds"].items():
        if not isinstance(record, dict):
            continue
        source_id = "related-queries-" + snapshot["geo"] + "-" + hashlib.sha256(str(seed).encode()).hexdigest()[:10]
        status = "ok"
        try:
            captured = datetime.fromisoformat(str(record.get("fetched", "")).replace("Z", "+00:00"))
            captured = captured.replace(tzinfo=timezone.utc) if captured.tzinfo is None else captured.astimezone(timezone.utc)
            age = (stamp(now).date() - captured.date()).days
            if captured > stamp(now) or not 0 <= age <= 7:
                status = "stale_or_future"
        except (TypeError, ValueError):
            status = "invalid_capture_date"
        if record.get("source") != "related-queries":
            status = "not_related_query_growth"
        elif record.get("polluted") or record.get("source_status", "ok") != "ok" or record.get("last_attempt_status") not in (None, "ok"):
            status = "source_not_ok"
        accepted = 0
        if status == "ok":
            for row in record.get("rising", []):
                if not isinstance(row, dict):
                    continue
                query, growth = row.get("q"), row.get("v")
                if not isinstance(query, str) or not 1 <= len(query) <= 200 or re.search(r"[<>\x00-\x1f]", query):
                    continue
                if isinstance(growth, bool) or not isinstance(growth, (int, float)) or not math.isfinite(growth) or growth <= 0:
                    continue
                signals.append({"source_id": source_id, "country": snapshot["geo"], "query": query, "captured_at": record["fetched"], "source_status": "ok", "relative_growth": growth, "metric": "relative_growth_not_search_volume"})
                accepted += 1
        receipts.append({"source_id": source_id, "source": "data/trends-rising.json", "country": snapshot["geo"], "captured_at": record.get("fetched"), "status": status, "accepted_signals": accepted})
    return signals, receipts


def matching_trend(product, signals):
    matches = []
    facts = product.get("facts", [])
    facts = facts if isinstance(facts, list) else []
    for signal in signals:
        if product.get("country") != signal["country"]:
            continue
        query = normalise(signal["query"])
        brand, model = normalise(product.get("brand", "")), normalise(product.get("model", ""))
        compact = query.replace(" ", "")
        match = None
        if brand and model and brand in query and model.replace(" ", "") in compact:
            match = (3, "exact_model")
        elif brand and re.search(r"\b" + re.escape(brand) + r"\b", query):
            match = (2, "brand_only_not_model_popularity")
        elif any(f.get("key") == "extraction_l_per_day" for f in facts if isinstance(f, dict)) and re.search(r"\b(?:luftentfeuchter|dehumidifiers?)\b", query):
            match = (1, "category_only_not_model_popularity")
        if match:
            matches.append((match[0], signal["relative_growth"], {**signal, "match_scope": match[1]}))
    return max(matches, key=lambda item: (item[0], item[1])) if matches else (0, 0, None)


def distinct_specification_groups(left, right):
    """Count model facts with a different answer, excluding boilerplate/branding.

    A new indexed page needs at least two distinct specification groups from an
    already covered product; one wattage/colour/wording variant is insufficient.
    """
    def profile(product):
        out = {}
        for fact in product.get("facts", []):
            group = FACT_GROUPS.get(fact.get("key"))
            if group:
                out.setdefault(group, []).append((fact["key"], stable_value(fact.get("value")), stable_value(fact.get("unit", ""))))
        return {key: sorted(values) for key, values in out.items()}
    a, b = profile(left), profile(right)
    return sum(a.get(key) != b.get(key) for key in set(a) | set(b))


def new_route(product):
    slug = "-".join(normalise(product["brand"] + " " + product["model"]).split())
    if len(slug) > 80:
        raise GateError("model_slug_too_long")
    route = ("/guide/" + slug + "-betriebskosten.html") if product["country"] == "DE" else ("/en/guide/" + slug + "-running-cost.html")
    validate_route(route)
    return route


def validate_route(route):
    if not isinstance(route, str) or len(route) > 140 or not ROUTE_RE.fullmatch(route) or ".." in route:
        raise GateError("unsafe_route")


def safe_path(site_root, relative):
    root = Path(site_root).resolve()
    path = root / relative
    if not path.resolve().is_relative_to(root) or any(parent.is_symlink() for parent in (path, *path.parents) if parent != root and parent.is_relative_to(root)):
        raise GateError("unsafe_output_path")
    return path


def read_state(site_root):
    result = []
    for relative in DATA_FILES:
        path = safe_path(site_root, relative)
        data = json.loads(path.read_text()) if path.exists() else {"schema_version": 1, "pages": {}}
        if not isinstance(data, dict) or data.get("schema_version") != 1 or not isinstance(data.get("pages"), dict):
            raise GateError("invalid_existing_state")
        for route, entry in data["pages"].items():
            validate_route(route)
            if not isinstance(entry, dict):
                raise GateError("invalid_state_entry")
        result.append(data)
    if set(result[0]["pages"]) != set(result[1]["pages"]):
        raise GateError("state_ledger_mismatch")
    return result


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.capture = None
        self.titles, self.h1, self.canonicals, self.links, self.fact_keys = [], [], [], [], set()
        self.formula = self.limit = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("title", "h1"):
            self.capture = tag
            (self.titles if tag == "title" else self.h1).append("")
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href"))
        if tag == "a":
            self.links.append(attrs.get("href", ""))
        if "data-fact-key" in attrs:
            self.fact_keys.add(attrs["data-fact-key"])
        self.formula |= "data-cost-formula" in attrs
        self.limit |= "data-power-limit" in attrs
    def handle_data(self, data):
        if self.capture:
            (self.titles if self.capture == "title" else self.h1)[-1] += data
    def handle_endtag(self, tag):
        if tag == self.capture:
            self.capture = None


def editorial_conflict(site_root, product, own_route=None):
    model = normalise(product["model"])
    brand = normalise(product["brand"])
    compact_model = model.replace(" ", "")
    for path in sorted((Path(site_root) / "site").rglob("*.html")):
        route = "/" + str(path.relative_to(Path(site_root) / "site"))
        if route == own_route:
            continue
        parser = PageParser()
        try:
            parser.feed(path.read_text(errors="replace"))
        except (OSError, ValueError):
            continue
        for title in parser.titles + parser.h1:
            words = normalise(title)
            if brand in words and compact_model in words.replace(" ", ""):
                return route
    return None


def validate_html(html, product, route):
    if not isinstance(html, str) or not 1000 <= len(html) <= 500000 or html.count(MARKER) != 1:
        raise GateError("invalid_rendered_document")
    parser = PageParser()
    parser.feed(html)
    if len(parser.h1) != 1 or parser.canonicals != [ORIGIN + route]:
        raise GateError("h1_or_canonical_failed")
    groups = {FACT_GROUPS[key] for key in parser.fact_keys if key in FACT_GROUPS}
    if "power" not in groups or len(groups) < 4 or not parser.formula or not parser.limit:
        raise GateError("rendered_facts_or_cost_explanation_missing")
    if not set(product["source_urls"]).issubset(set(parser.links)):
        raise GateError("rendered_sources_missing")
    for link in parser.links:
        if link.startswith(("#", "/")) and not link.startswith("//"):
            continue
        if link not in product["source_urls"]:
            raise GateError("unverified_external_or_affiliate_link")
    if re.search(r"<meta\b[^>]*\bnoindex\b", html, re.I):
        raise GateError("rendered_page_not_indexable")


def atomic_transaction(writes):
    """Stage every output before replacing any, with rollback on local failure."""
    staged, backups = {}, {}
    try:
        for path, content in writes.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            backups[path] = path.read_bytes() if path.exists() else None
            with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".auto-content-", delete=False) as tmp:
                tmp.write(content)
                tmp.flush()
                os.fsync(tmp.fileno())
                staged[path] = Path(tmp.name)
        replaced = []
        try:
            for path, temporary in staged.items():
                os.replace(temporary, path)
                replaced.append(path)
        except BaseException:
            for path in reversed(replaced):
                if backups[path] is None:
                    path.unlink(missing_ok=True)
                else:
                    path.write_bytes(backups[path])
            raise
    finally:
        for temporary in staged.values():
            temporary.unlink(missing_ok=True)


def encode_json(data):
    return (json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode()


def execute(site_root, collection, now, *, apply=False, renderer=None, before_sha, allowed_hosts=None):
    """Return (strict publication receipt, explanatory selection receipt)."""
    if not SHA_RE.fullmatch(before_sha or ""):
        raise GateError("invalid_before_sha")
    now = stamp(now)
    publication = {"schema_version": 1, "before_sha": before_sha, "changed": False, "paths": [], "canonical_urls": []}
    diagnostic = {"schema_version": 1, "checked_at": iso(now), "status": "no_eligible_change", "decisions": [], "collection_receipts": collection.get("receipts", []) if isinstance(collection, dict) else []}
    try:
        state, ledger = read_state(site_root)
        if not isinstance(collection, dict) or not isinstance(collection.get("products"), list):
            raise GateError("invalid_collection")
        if not collection["products"]:
            diagnostic["status"] = "no_verified_products_not_evidence_of_zero_demand"
            return publication, diagnostic
        days = ledger.setdefault("days", {})
        today = now.date().isoformat()
        if not isinstance(days, dict):
            raise GateError("invalid_day_ledger")
        if days.get(today):
            diagnostic["status"] = "daily_limit_reached"
            return publication, diagnostic
        recent = sorted(days, reverse=True)[:2]
        recent_markets = [days[day].get("country", ledger["pages"].get(days[day].get("route", ""), {}).get("country")) for day in recent if isinstance(days[day], dict)]
        preferred_market = "GB" if recent_markets == ["DE", "DE"] else "DE"
        diagnostic["preferred_market"] = preferred_market
        signals, diagnostic["trend_receipts"] = trend_signals(site_root, now)
        def candidate_rank(candidate):
            if not isinstance(candidate, dict):
                return (2, 0, 0, "")
            match = matching_trend(candidate, signals)
            return (0 if candidate.get("country") == preferred_market else 1, -match[0], -match[1], str(candidate.get("source_id", "")))
        candidates = sorted(collection["products"], key=candidate_rank)
        seen_ids = set()
        selected = None
        for raw in candidates:
            label = raw.get("source_id", "unknown") if isinstance(raw, dict) else "unknown"
            try:
                product = validate_product(raw, now, allowed_hosts)
                if product["source_id"] in seen_ids:
                    raise GateError("duplicate_collected_source")
                seen_ids.add(product["source_id"])
                existing_routes = [key for key, entry in ledger["pages"].items() if entry.get("source_id") == product["source_id"]]
                if len(existing_routes) > 1:
                    raise GateError("duplicate_existing_source_id")
                route = existing_routes[0] if existing_routes else None
                if route:
                    previous = state["pages"][route].get("product", {})
                    if identity(previous) != identity(product) or previous.get("country") != product["country"]:
                        raise GateError("source_identity_changed")
                else:
                    for existing_route in ledger["pages"]:
                        previous = state["pages"][existing_route].get("product", {})
                        if near_model(previous, product):
                            raise GateError("same_or_near_model_already_published")
                        if distinct_specification_groups(previous, product) < 2:
                            raise GateError("insufficient_distinct_product_facts")
                content_hash = substantive_hash(product)
                if route and ledger["pages"][route].get("content_hash") == content_hash:
                    diagnostic["decisions"].append({"source_id": label, "status": "unchanged_specifications", "route": route})
                    continue
                route = route or new_route(product)
                target = safe_path(site_root, "site" + route)
                if target.exists() and (route not in state["pages"] or MARKER not in target.read_text()):
                    raise GateError("existing_editorial_route_protected")
                conflict = editorial_conflict(site_root, product, route if route in state["pages"] else None)
                if conflict:
                    diagnostic["decisions"].append({"source_id": label, "status": "existing_editorial_model", "route": conflict})
                    continue
                selected = (product, route, content_hash, target)
                break
            except (GateError, KeyError, TypeError, ValueError) as error:
                diagnostic["decisions"].append({"source_id": str(label)[:180], "status": str(error)[:160]})
        if selected is None:
            return publication, diagnostic
        product, route, content_hash, target = selected
        old_entry = state["pages"].get(route)
        published = old_entry["published"] if old_entry else today
        if renderer is None:
            from build_auto_content import render_page
            renderer = render_page
        html = renderer(product, route, published, today)
        validate_html(html, product, route)
        diagnostic["status"] = "generated_pending_validation" if apply else "eligible_read_only"
        diagnostic["selected"] = {"source_id": product["source_id"], "route": route, "action": "update" if old_entry else "new", "content_hash": content_hash}
        match = matching_trend(product, signals)[2]
        diagnostic["selected"]["selection_reason"] = "fresh_related_query_priority_with_verified_product_facts" if match else "official_catalogue_specification_coverage_gap"
        diagnostic["selected"]["trend_evidence"] = match
        if not apply:
            return publication, diagnostic
        state["pages"][route] = {"product": product, "published": published, "modified": today}
        ledger["pages"][route] = {"source_id": product["source_id"], "name": product["name"], "created_at": ledger["pages"].get(route, {}).get("created_at", iso(now)), "modified_at": iso(now), "content_hash": content_hash, "country": product["country"]}
        days[today] = {"route": route, "country": product["country"], "action": "update" if old_entry else "new", "at": iso(now)}
        writes = {safe_path(site_root, DATA_FILES[0]): encode_json(state), safe_path(site_root, DATA_FILES[1]): encode_json(ledger), target: html.encode()}
        atomic_transaction(writes)
        publication.update(changed=True, paths=["sites/getecoback/" + path for path in (*DATA_FILES, "site" + route)], canonical_urls=[ORIGIN + route])
    except Exception as error:
        diagnostic["status"] = "blocked_preserving_existing_state"
        diagnostic["reason"] = str(error)[:300]
    return publication, diagnostic


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Generate at most one verified new/updated guide; otherwise read-only.")
    parser.add_argument("--receipts-dir", type=Path, required=True, help="Private workflow artifact directory, outside the site tree.")
    args = parser.parse_args()
    if args.receipts_dir.resolve().is_relative_to(ROOT.resolve()):
        parser.error("--receipts-dir must be outside the site project (private artifacts only)")
    from auto_content_sources import collect_sources, ALLOWED_HOSTS
    now = datetime.now(timezone.utc)
    repo_root = ROOT.parents[1]
    before_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo_root, text=True).strip()
    try:
        _, previous_ledger = read_state(ROOT)
        known_source_ids = {entry.get("source_id") for entry in previous_ledger["pages"].values() if entry.get("source_id")}
        collection = collect_sources(now, known_source_ids=known_source_ids)
    except Exception as error:
        collection = {"products": [], "receipts": [{"status": "collector_failed", "error_type": type(error).__name__}]}
    # One shared file lock serializes overlapping scheduled/manual invocations;
    # it lives outside the repository and is not a publication artifact.
    import fcntl
    lock_id = hashlib.sha256(str(ROOT.resolve()).encode()).hexdigest()[:20]
    with open(Path(tempfile.gettempdir()) / ("eco-auto-content-" + lock_id + ".lock"), "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        receipt, selection = execute(ROOT, collection, now, apply=args.apply, before_sha=before_sha, allowed_hosts=ALLOWED_HOSTS)
    args.receipts_dir.mkdir(parents=True, exist_ok=True)
    (args.receipts_dir / "publication.json").write_bytes(encode_json(receipt))
    (args.receipts_dir / "selection.json").write_bytes(encode_json(selection))
    print(json.dumps({"changed": receipt["changed"], "status": selection["status"], "canonical_urls": receipt["canonical_urls"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
